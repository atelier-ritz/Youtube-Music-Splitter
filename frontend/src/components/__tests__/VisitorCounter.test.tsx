import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import VisitorCounter from '../VisitorCounter';

describe('VisitorCounter', () => {
  beforeEach(() => {
    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render with loading state initially', () => {
    (global.fetch as any).mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );

    render(<VisitorCounter />);
    
    // Should show dashes while loading
    const digits = screen.getAllByText('-');
    expect(digits).toHaveLength(6);
  });

  it('should format count as 6-digit string with leading zeros', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 42 })
    });

    render(<VisitorCounter />);
    
    await waitFor(() => {
      const digits = screen.getAllByText(/[0-9-]/);
      expect(digits).toHaveLength(6);
      // Check that the display shows "000042"
      const displayText = digits.map(el => el.textContent).join('');
      expect(displayText).toBe('000042');
    });
  });

  it('should handle large numbers correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 999999 })
    });

    render(<VisitorCounter />);
    
    await waitFor(() => {
      const nines = screen.getAllByText('9');
      expect(nines).toHaveLength(6);
    });
  });

  it('should hide component on API error (graceful fallback)', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { container } = render(<VisitorCounter />);
    
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should hide component on HTTP error response', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    const { container } = render(<VisitorCounter />);
    
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should display decorative label text', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 1 })
    });

    render(<VisitorCounter />);
    
    await waitFor(() => {
      expect(screen.getByText('You are visitor number:')).toBeInTheDocument();
    });
  });

  it('should fetch from correct API endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 100 })
    });
    global.fetch = mockFetch;

    render(<VisitorCounter />);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/visitor-count');
    });
  });

  it('should only fetch once on mount (non-blocking)', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 50 })
    });
    global.fetch = mockFetch;

    const { rerender } = render(<VisitorCounter />);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Re-render should not trigger another fetch
    rerender(<VisitorCounter />);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
