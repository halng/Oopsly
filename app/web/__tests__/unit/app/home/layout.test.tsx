import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppLayout from '@/app/(user)/layout';

vi.mock('@/components/AuthenticatedShell', () => ({
    default: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="authenticated-shell">{children}</div>
    ),
}));

describe('AppLayout', () => {
    it('wraps page content in the authenticated shell', () => {
        render(
            <AppLayout>
                <div>Home content</div>
            </AppLayout>
        );
        expect(screen.getByTestId('authenticated-shell')).toBeInTheDocument();
        expect(screen.getByText('Home content')).toBeInTheDocument();
    });
});
