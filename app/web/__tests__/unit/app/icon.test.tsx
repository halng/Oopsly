import { describe, expect, it } from 'vitest';
import Icon from '@/app/icon';
import { ImageResponse } from 'next/og';

describe('app/icon.tsx', () => {
    it('should match the snapshot', () => {
        expect(Icon()).toMatchSnapshot();
    });

    it('should return an ImageResponse with the correct properties', () => {
        const response = Icon();
        expect(response).toBeInstanceOf(ImageResponse);
    });
});
