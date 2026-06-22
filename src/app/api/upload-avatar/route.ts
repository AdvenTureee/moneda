import { NextRequest } from 'next/server';
import { createServiceClient, createSessionClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { noStoreJson } from '@/lib/http';
import { consumeRateLimit } from '@/lib/rateLimit';
import { detectFileType, isDetectedMimeAllowed } from '@/lib/security/fileSignature';

const MAX_FILE_SIZE = 7 * 1024 * 1024;
const AVATAR_UPLOAD_LIMIT_PER_10_MINUTES = 10;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

type RequestedCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SharpCrop = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function getFiniteFormNumber(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (typeof raw !== 'string') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseRequestedCrop(formData: FormData): RequestedCrop | null {
  const x = getFiniteFormNumber(formData, 'cropX');
  const y = getFiniteFormNumber(formData, 'cropY');
  const width = getFiniteFormNumber(formData, 'cropWidth');
  const height = getFiniteFormNumber(formData, 'cropHeight');

  if (x === null || y === null || width === null || height === null) return null;
  if (x < 0 || y < 0 || width <= 0 || height <= 0) return null;

  return { x, y, width, height };
}

function normalizeCropForImage(
  crop: RequestedCrop,
  imageWidth: number | undefined,
  imageHeight: number | undefined,
): SharpCrop | null {
  if (!imageWidth || !imageHeight) return null;

  const left = Math.round(crop.x);
  const top = Math.round(crop.y);
  const width = Math.round(crop.width);
  const height = Math.round(crop.height);

  if (left < 0 || top < 0 || width <= 0 || height <= 0) return null;
  if (left + width > imageWidth || top + height > imageHeight) return null;

  return { left, top, width, height };
}

export async function POST(req: NextRequest) {
  try {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) {
      return noStoreJson({ error: 'Não autenticado.' }, { status: 401 });
    }

    const rate = await consumeRateLimit({
      key: `api:upload-avatar:${user.id}`,
      limit: AVATAR_UPLOAD_LIMIT_PER_10_MINUTES,
      windowMs: 10 * 60 * 1000,
    });
    if (!rate.ok) {
      return noStoreJson(
        { error: `Muitos uploads em pouco tempo. Aguarde ${rate.retryAfterSec}s e tente de novo.` },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } },
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return noStoreJson({ error: 'Arquivo não enviado.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return noStoreJson({ error: 'Arquivo maior que 7MB.' }, { status: 413 });
    }

    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      return noStoreJson({ error: 'Formato de imagem não permitido.' }, { status: 415 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBytes = new Uint8Array(arrayBuffer);
    const detected = detectFileType(inputBytes);
    if (!isDetectedMimeAllowed(detected, ALLOWED_MIME_TYPES)) {
      return noStoreJson({ error: 'Conteúdo da imagem não é permitido.' }, { status: 415 });
    }

    const requestedCrop = parseRequestedCrop(formData);
    if (!requestedCrop) {
      return noStoreJson({ error: 'Recorte inválido.' }, { status: 400 });
    }

    let imageData: Buffer;
    try {
      const metadata = await sharp(inputBytes).rotate().metadata();
      const crop = normalizeCropForImage(requestedCrop, metadata.width, metadata.height);
      if (!crop) {
        return noStoreJson({ error: 'Recorte fora dos limites da imagem.' }, { status: 400 });
      }

      imageData = await sharp(inputBytes)
        .rotate()
        .extract(crop)
        .resize(256, 256, { fit: 'cover' })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      return noStoreJson({ error: 'Imagem inválida ou corrompida.' }, { status: 415 });
    }

    const outputType = 'image/webp';
    const fileName = `${uuidv4()}.webp`;
    const filePath = `avatars/${user.id}/${fileName}`;

    const admin = createServiceClient();
    const { error: uploadError } = await admin.storage
      .from('fotos_perfil')
      .upload(filePath, imageData, {
        contentType: outputType,
        upsert: true,
      });

    if (uploadError) {
      return noStoreJson({ error: 'Falha ao fazer upload.' }, { status: 500 });
    }

    const { data: signedUrlData, error: signedUrlError } = await admin.storage
      .from('fotos_perfil')
      .createSignedUrl(filePath, 2592000); // 30 days

    if (signedUrlError) {
      return noStoreJson({ error: 'Upload feito, mas erro ao gerar URL.' }, { status: 500 });
    }

    const { error: updateError } = await session.auth.updateUser({
      data: { avatar_url: signedUrlData.signedUrl },
    });

    if (updateError) {
      return noStoreJson({ url: signedUrlData.signedUrl });
    }

    return noStoreJson({ url: signedUrlData.signedUrl });
  } catch (error) {
    return noStoreJson({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
