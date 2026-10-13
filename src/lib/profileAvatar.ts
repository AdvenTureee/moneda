import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';

export const PROFILE_AVATAR_BUCKET = 'fotos_perfil';
export const PROFILE_AVATAR_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

function isAvatarObjectPath(value: string, userId: string): boolean {
  return new RegExp(`^avatars/${userId}/[A-Za-z0-9._-]+$`).test(value);
}

function getAvatarObjectPath(value: string | null | undefined, userId: string): string | null {
  if (!value) return null;
  if (isAvatarObjectPath(value, userId)) return value;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  try {
    const url = new URL(value);
    if (url.origin !== new URL(supabaseUrl).origin) return null;

    const prefixes = [
      `/storage/v1/object/sign/${PROFILE_AVATAR_BUCKET}/`,
      `/storage/v1/object/public/${PROFILE_AVATAR_BUCKET}/`,
    ];
    const prefix = prefixes.find((candidate) => url.pathname.startsWith(candidate));
    if (!prefix) return null;

    const objectPath = decodeURIComponent(url.pathname.slice(prefix.length));
    return isAvatarObjectPath(objectPath, userId) ? objectPath : null;
  } catch {
    return null;
  }
}

function isSupabaseStorageUrl(value: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;

  try {
    const url = new URL(value);
    return url.origin === new URL(supabaseUrl).origin && url.pathname.startsWith('/storage/v1/object/');
  } catch {
    return false;
  }
}

function isExternalHttpsAvatar(value: string | null | undefined): value is string {
  if (!value || isSupabaseStorageUrl(value)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Resolve a stored object path to a fresh URL, migrating older signed URLs as needed. */
export async function resolveProfileAvatarUrl(
  userId: string,
  storedAvatar: string | null | undefined,
  legacyAvatar: string | null | undefined,
): Promise<string | null> {
  const objectPath =
    getAvatarObjectPath(storedAvatar, userId) ?? getAvatarObjectPath(legacyAvatar, userId);

  if (!objectPath) {
    if (isExternalHttpsAvatar(storedAvatar)) return storedAvatar;
    if (isExternalHttpsAvatar(legacyAvatar)) return legacyAvatar;
    return null;
  }

  if (!isSupabaseEnabled()) return null;

  const admin = createServiceClient();
  if (storedAvatar !== objectPath) {
    const { error: updateError } = await admin
      .from('profiles')
      .update({ avatar_url: objectPath })
      .eq('id', userId);
    if (updateError) {
      console.error('[profile-avatar] legacy path migration failed', {
        message: updateError.message,
        code: updateError.code,
      });
    }
  }

  const { data, error } = await admin.storage
    .from(PROFILE_AVATAR_BUCKET)
    .createSignedUrl(objectPath, PROFILE_AVATAR_SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error('[profile-avatar] signed URL generation failed', {
      message: error.message,
      name: error.name,
    });
    return null;
  }

  return data.signedUrl;
}
