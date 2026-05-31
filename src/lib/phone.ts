const E164_PHONE_RE = /^\+[1-9]\d{6,14}$/;

export function normalizeWhatsappPhone(raw: string | null | undefined): string | null {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return null;

  const digits = value.replace(/\D/g, '');
  if (!digits) return null;

  let normalized = '';
  if (value.startsWith('+')) {
    normalized = `+${digits}`;
  } else if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) {
    normalized = `+55${digits}`;
  } else if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    normalized = `+${digits}`;
  } else {
    normalized = `+${digits}`;
  }

  return E164_PHONE_RE.test(normalized) ? normalized : null;
}

export function formatWhatsappPhone(phone: string | null | undefined): string {
  const normalized = normalizeWhatsappPhone(phone);
  if (!normalized) return '';

  const digits = normalized.replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    const local = digits.slice(2);
    const area = local.slice(0, 2);
    const first = local.length === 11 ? local.slice(2, 7) : local.slice(2, 6);
    const last = local.length === 11 ? local.slice(7) : local.slice(6);
    return `+55 (${area}) ${first}-${last}`;
  }

  return normalized;
}
