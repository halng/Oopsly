import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomeLayout from '@/app/home/layout';

vi.mock('@/components', () => ({
    Navbar: () => <nav data-testid="navbar">Navigation</nav>,
}));

describe('HomeLayout', () => {
    it('renders navigation before the protected page content', () => {
        const { container } = render(
            <HomeLayout>
                <main>Home content</main>
            </HomeLayout>
        );
        expect(screen.getByTestId('navbar')).toBeInTheDocument();
        expect(screen.getByText('Home content')).toBeInTheDocument();
        expect(container).toMatchSnapshot();
    });
});
