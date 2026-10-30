import { ApiService } from '@/services/api';
import { ApiResponse, UserProfile } from '@/types';

export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/** A message for a file we would refuse anyway, or null when it looks fine. */
export function validateAvatarFile(file: File): string | null {
    if (!AVATAR_TYPES.includes(file.type)) {
        return 'Choose a JPEG, PNG or WebP image.';
    }
    if (file.size > AVATAR_MAX_BYTES) {
        return 'That image is larger than 2 MB. Choose a smaller one.';
    }
    if (file.size === 0) {
        return 'That file is empty.';
    }
    return null;
}

const failure = (message: string): ApiResponse<UserProfile> => ({
    isSuccess: false,
    message,
    statusCode: 0,
    data: null as never,
    timestamp: new Date().toISOString(),
});

/**
 * Uploads the picture straight to S3 with a presigned form, then tells the
 * auth service to use it. Resolves to the updated profile (with a fresh
 * presigned avatarUrl). Failures of our own API are toasted by the API layer.
 */
export async function uploadAvatar(
    file: File
): Promise<ApiResponse<UserProfile>> {
    const ticket = await ApiService.requestAvatarUpload(file.type);
    if (!ticket.isSuccess || !ticket.data) return ticket as never;

    const { url, fields, key } = ticket.data;
    const form = new FormData();
    Object.entries(fields).forEach(([name, value]) => form.append(name, value));
    // S3 requires the file to be the last field.
    form.append('file', file);
    try {
        const res = await fetch(url, { method: 'POST', body: form });
        if (!res.ok) return failure('The image could not be uploaded.');
    } catch {
        return failure('The image could not be uploaded.');
    }
    return ApiService.confirmAvatar(key);
}
