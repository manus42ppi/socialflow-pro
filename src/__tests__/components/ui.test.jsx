import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge, Avatar, Btn, SBadge } from '../../components/ui/index.jsx';

// ── Badge ────────────────────────────────────────────────────────────────────
describe('<Badge>', () => {
  it('renders children', () => {
    render(<Badge>Hallo</Badge>);
    expect(screen.getByText('Hallo')).toBeInTheDocument();
  });

  it('applies custom color via inline style', () => {
    const { container } = render(<Badge color="#ff0000">Test</Badge>);
    expect(container.firstChild).toHaveStyle({ color: '#ff0000' });
  });
});

// ── Avatar ───────────────────────────────────────────────────────────────────
describe('<Avatar>', () => {
  it('renders initials when no imageUrl', () => {
    render(<Avatar initials="MK" />);
    expect(screen.getByText('MK')).toBeInTheDocument();
  });

  it('renders an <img> when imageUrl is provided', () => {
    render(<Avatar initials="MK" imageUrl="https://example.com/pic.jpg" />);
    const img = screen.getByAltText('MK');
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('src', 'https://example.com/pic.jpg');
  });

  it('uses default size of 32', () => {
    const { container } = render(<Avatar initials="AB" />);
    expect(container.firstChild).toHaveStyle({ width: '32px' });
  });
});

// ── Btn ──────────────────────────────────────────────────────────────────────
describe('<Btn>', () => {
  it('renders children', () => {
    render(<Btn>Klick mich</Btn>);
    expect(screen.getByRole('button', { name: /Klick mich/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handler = vi.fn();
    render(<Btn onClick={handler}>Test</Btn>);
    fireEvent.click(screen.getByRole('button'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is set', () => {
    render(<Btn disabled>Gesperrt</Btn>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not call onClick when disabled', () => {
    const handler = vi.fn();
    render(<Btn disabled onClick={handler}>Gesperrt</Btn>);
    fireEvent.click(screen.getByRole('button'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('renders all variants without crashing', () => {
    const variants = ['primary', 'secondary', 'ghost', 'danger', 'success'];
    variants.forEach(v => {
      const { unmount } = render(<Btn variant={v}>{v}</Btn>);
      expect(screen.getByText(v)).toBeInTheDocument();
      unmount();
    });
  });
});

// ── SBadge ───────────────────────────────────────────────────────────────────
describe('<SBadge>', () => {
  it('shows "Geplant" for scheduled status', () => {
    render(<SBadge status="scheduled" />);
    expect(screen.getByText('Geplant')).toBeInTheDocument();
  });

  it('shows "Entwurf" for draft status', () => {
    render(<SBadge status="draft" />);
    expect(screen.getByText('Entwurf')).toBeInTheDocument();
  });

  it('shows "Freigabe" for pending status', () => {
    render(<SBadge status="pending" />);
    expect(screen.getByText('Freigabe')).toBeInTheDocument();
  });

  it('shows "Live" for published status', () => {
    render(<SBadge status="published" />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('falls back to "Entwurf" for unknown status', () => {
    render(<SBadge status="unknown" />);
    expect(screen.getByText('Entwurf')).toBeInTheDocument();
  });
});
