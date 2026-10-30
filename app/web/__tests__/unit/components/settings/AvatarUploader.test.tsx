import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AvatarUploader from '@/components/settings/AvatarUploader';
import { useUserProfileStore } from '@/store';
import { useToastStore } from '@/store/ToastStore';
import { uploadAvatar } from '@/utils/avatarUpload';

vi.mock('@/utils/avatarUpload', async (orig) => ({
    ...(await orig<typeof import('@/utils/avatarUpload')>()),
    uploadAvatar: vi.fn(),
}));

const pick = (file: File) =>
    fireEvent.change(screen.getByTestId('input-avatar-file'), {
        target: { files: [file] },
    });

describe('AvatarUploader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useToastStore.setState({ toasts: [] });
        useUserProfileStore.getState().setProfile({
            displayName: 'Lena',
            avatarUrl: 'https://s3.test/old',
        } as never);
    });

    it('shows the current avatar', () => {
        render(<AvatarUploader />);
        expect(screen.getByTestId('avatar-preview')).toHaveAttribute(
            'src',
            'https://s3.test/old'
        );
    });

    it('uploads the chosen image and swaps in the new presigned link', async () => {
        vi.mocked(uploadAvatar).mockResolvedValue({
            isSuccess: true,
            data: { displayName: 'Lena', avatarUrl: 'https://s3.test/new' },
        } as never);
        render(<AvatarUploader />);

        pick(new File(['x'], 'me.png', { type: 'image/png' }));

        await waitFor(() =>
            expect(screen.getByTestId('avatar-preview')).toHaveAttribute(
                'src',
                'https://s3.test/new'
            )
        );
        expect(useToastStore.getState().toasts[0]).toMatchObject({
            kind: 'success',
            title: 'Profile photo updated',
        });
    });

    it('rejects an unsupported file without calling the server', () => {
        render(<AvatarUploader />);
        pick(new File(['x'], 'a.pdf', { type: 'application/pdf' }));
        expect(uploadAvatar).not.toHaveBeenCalled();
        expect(useToastStore.getState().toasts[0]).toMatchObject({
            kind: 'error',
        });
    });

    it('keeps the old avatar and explains an S3 failure', async () => {
        vi.mocked(uploadAvatar).mockResolvedValue({
            isSuccess: false,
            statusCode: 0,
            message: 'The image could not be uploaded.',
            data: null,
        } as never);
        render(<AvatarUploader />);
        pick(new File(['x'], 'me.png', { type: 'image/png' }));

        await waitFor(() =>
            expect(useToastStore.getState().toasts[0]).toMatchObject({
                kind: 'error',
                title: "Couldn't upload the photo",
            })
        );
        expect(screen.getByTestId('avatar-preview')).toHaveAttribute(
            'src',
            'https://s3.test/old'
        );
    });
});
