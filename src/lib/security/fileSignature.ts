export type DetectedFileType = {
  mimeType: string;
  extension: string;
};

const HEIC_BRANDS = new Set(['heic', 'heif', 'heix', 'hevc', 'hevx', 'mif1', 'msf1']);

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

export function detectFileType(bytes: Uint8Array): DetectedFileType | null {
  if (bytes.length < 4) return null;

  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: 'image/png', extension: 'png' };
  }

  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return { mimeType: 'image/webp', extension: 'webp' };
  }

  if (bytes.length >= 12 && ascii(bytes, 4, 8) === 'ftyp') {
    const brand = ascii(bytes, 8, 12);
    if (HEIC_BRANDS.has(brand)) {
      return { mimeType: 'image/heic', extension: 'heic' };
    }
  }

  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { mimeType: 'application/pdf', extension: 'pdf' };
  }

  return null;
}

export function isDetectedMimeAllowed(
  detected: DetectedFileType | null,
  allowedMimeTypes: ReadonlySet<string>,
): detected is DetectedFileType {
  return Boolean(detected && allowedMimeTypes.has(detected.mimeType));
}
