'use client';
import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from '@/store/ToastStore';
import { useUserProfileStore } from '@/store';
import {
    AVATAR_TYPES,
    uploadAvatar,
    validateAvatarFile,
} from '@/utils/avatarUpload';

const FALLBACK =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

export default function AvatarUploader() {
    const profile = useUserProfileStore((s) => s.profile);
    const setProfile = useUserProfileStore((s) => s.setProfile);
    const input = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // let the same file be chosen again
        if (!file) return;

        const problem = validateAvatarFile(file);
        if (problem) {
            toast.error("Can't use that photo", problem);
            return;
        }
        setIsUploading(true);
        const res = await uploadAvatar(file);
        setIsUploading(false);
        if (res.isSuccess && res.data) {
            setProfile(res.data);
            toast.success('Profile photo updated');
        } else if (res.statusCode === 0 && res.message) {
            // Our own API failures are already toasted; this is the S3 leg.
            toast.error("Couldn't upload the photo", res.message);
        }
    };

    return (
        <div className="flex items-center gap-4">
            <button
                type="button"
                data-testid="btn-change-avatar"
                aria-label="Change profile photo"
                disabled={isUploading}
                onClick={() => input.current?.click()}
                className="relative w-20 h-20 rounded-full overflow-hidden border-2 shrink-0 cursor-pointer group disabled:cursor-wait"
                style={{ borderColor: 'var(--theme-border)' }}
            >
                <img
                    data-testid="avatar-preview"
                    src={profile?.avatarUrl || FALLBACK}
                    alt={profile?.displayName || 'Your avatar'}
                    className="w-full h-full object-cover"
                />
                <span className="absolute inset-0 bg-black/45 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                    {isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Camera className="w-5 h-5" />
                    )}
                </span>
            </button>
            <div>
                <p className="font-bold text-sm">Profile photo</p>
                <p className="text-xs text-stone-500 mt-0.5">
                    {isUploading
                        ? 'Uploading...'
                        : 'Click the photo to change it. JPEG, PNG or WebP, up to 2 MB.'}
                </p>
            </div>
            <input
                ref={input}
                data-testid="input-avatar-file"
                type="file"
                accept={AVATAR_TYPES.join(',')}
                className="hidden"
                onChange={onPick}
            />
        </div>
    );
}
