import { NextRequest } from 'next/server';
import { createServiceClient, createSessionClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { noStoreJson } from '@/lib/http';

const MAX_FILE_SIZE = 7 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/heic',
  'image/heif',
];

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

const SHARP_SUPPORTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

const HEIC_LIKE = new Set(['image/heic', 'image/heif']);

export async function POST(req: NextRequest) {
  try {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) {
      return noStoreJson({ error: 'Não autenticado.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return noStoreJson({ error: 'Arquivo não enviado.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return noStoreJson({ error: 'Arquivo maior que 7MB.' }, { status: 413 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return noStoreJson({ error: 'Formato de imagem não permitido.' }, { status: 415 });
    }

    const arrayBuffer = await file.arrayBuffer();
    let imageData: Buffer | Uint8Array = new Uint8Array(arrayBuffer);
    let outputType = file.type;

    if (SHARP_SUPPORTED.has(file.type)) {
      try {
        const pipeline = sharp(imageData).rotate();
        imageData = HEIC_LIKE.has(file.type)
          ? await pipeline.jpeg().toBuffer()
          : await pipeline.toBuffer();
        if (HEIC_LIKE.has(file.type)) outputType = 'image/jpeg';
      } catch {
        // keep original buffer
      }
    }

    const ext = MIME_TO_EXT[outputType] ?? 'bin';
    const fileName = `${uuidv4()}.${ext}`;
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
      .createSignedUrl(filePath, 31536000);

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
