import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '@/services/api';
import {
    AVATAR_MAX_BYTES,
    uploadAvatar,
    validateAvatarFile,
} from '@/utils/avatarUpload';

vi.mock('@/services/api', () => ({
    ApiService: {
        requestAvatarUpload: vi.fn(),
        confirmAvatar: vi.fn(),
    },
}));

const file = (type = 'image/png', size = 10) =>
    new File([new Uint8Array(size)], 'me', { type });

const ticket = {
    isSuccess: true,
    statusCode: 200,
    message: '',
    timestamp: '',
    data: {
        url: 'https://s3.test/bucket',
        fields: { key: 'avatars/u/a.png', policy: 'p' },
        key: 'avatars/u/a.png',
        maxBytes: AVATAR_MAX_BYTES,
    },
};

describe('validateAvatarFile', () => {
    it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', (type) => {
        expect(validateAvatarFile(file(type))).toBeNull();
    });

    it.each(['image/svg+xml', 'application/pdf', 'image/gif', ''])(
        'rejects %s',
        (type) => {
            expect(validateAvatarFile(file(type))).toMatch(/JPEG, PNG or WebP/);
        }
    );

    it('rejects files over 2 MB and empty files', () => {
        expect(
            validateAvatarFile(file('image/png', AVATAR_MAX_BYTES + 1))
        ).toMatch(/2 MB/);
        expect(validateAvatarFile(file('image/png', 0))).toMatch(/empty/);
        expect(
            validateAvatarFile(file('image/png', AVATAR_MAX_BYTES))
        ).toBeNull();
    });
});

describe('uploadAvatar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.requestAvatarUpload).mockResolvedValue(
            ticket as never
        );
        vi.mocked(ApiService.confirmAvatar).mockResolvedValue({
            isSuccess: true,
            data: { avatarUrl: 'https://s3.test/new' },
        } as never);
    });

    it('posts the form fields then the file last, then confirms the key', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValue({ ok: true, status: 204 } as Response);
        vi.stubGlobal('fetch', fetchMock);

        const res = await uploadAvatar(file());

        expect(ApiService.requestAvatarUpload).toHaveBeenCalledWith(
            'image/png'
        );
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://s3.test/bucket');
        const names = [...(init.body as FormData).keys()];
        expect(names).toEqual(['key', 'policy', 'file']);
        expect(ApiService.confirmAvatar).toHaveBeenCalledWith(
            'avatars/u/a.png'
        );
        expect(res.isSuccess).toBe(true);
    });

    it('does not confirm when S3 refuses the upload', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: false, status: 403 } as Response)
        );
        const res = await uploadAvatar(file());
        expect(res.isSuccess).toBe(false);
        expect(res.statusCode).toBe(0);
        expect(ApiService.confirmAvatar).not.toHaveBeenCalled();
    });

    it('does not confirm when the network fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('x')));
        const res = await uploadAvatar(file());
        expect(res.isSuccess).toBe(false);
        expect(ApiService.confirmAvatar).not.toHaveBeenCalled();
    });

    it('stops when the upload ticket is refused', async () => {
        vi.mocked(ApiService.requestAvatarUpload).mockResolvedValue({
            isSuccess: false,
            data: null,
        } as never);
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const res = await uploadAvatar(file());
        expect(res.isSuccess).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
