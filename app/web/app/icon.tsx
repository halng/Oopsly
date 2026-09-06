// app/icon.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/svg+xml';
export const size = { width: 24, height: 24 };

export default function Icon() {
    return new ImageResponse(
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="#8BC34A"
        >
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z" />
        </svg>,
        { ...size }
    );
}
