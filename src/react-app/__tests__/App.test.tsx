import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('App', () => {
  describe('Rendering', () => {
    it('should render the main heading', () => {
      render(<App />);
      expect(
        screen.getByRole('heading', { name: /vite \+ react \+ hono \+ cloudflare/i })
      ).toBeInTheDocument();
    });

    it('should render all technology logos with correct alt text', () => {
      render(<App />);

      expect(screen.getByAltText('Vite logo')).toBeInTheDocument();
      expect(screen.getByAltText('React logo')).toBeInTheDocument();
      expect(screen.getByAltText('Hono logo')).toBeInTheDocument();
      expect(screen.getByAltText('Cloudflare logo')).toBeInTheDocument();
    });

    it('should render clickable logo links', () => {
      render(<App />);
      const links = screen.getAllByRole('link');

      expect(links).toHaveLength(4);
      expect(links[0]).toHaveAttribute('href', 'https://vite.dev');
      expect(links[1]).toHaveAttribute('href', 'https://react.dev');
      expect(links[2]).toHaveAttribute('href', 'https://hono.dev/');
      expect(links[3]).toHaveAttribute('href', 'https://workers.cloudflare.com/');
    });
  });

  describe('Counter Button', () => {
    it('should display initial count of 0', () => {
      render(<App />);
      const counterButton = screen.getByRole('button', { name: /increment/i });

      expect(counterButton).toHaveTextContent('count is 0');
    });

    it('should increment count when button is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      const counterButton = screen.getByRole('button', { name: /increment/i });

      await user.click(counterButton);
      expect(counterButton).toHaveTextContent('count is 1');

      await user.click(counterButton);
      expect(counterButton).toHaveTextContent('count is 2');

      await user.click(counterButton);
      expect(counterButton).toHaveTextContent('count is 3');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<App />);

      const counterButton = screen.getByRole('button', { name: /increment/i });

      // Tab through elements until we reach the button (skip the 4 logo links)
      await user.tab(); // First logo link
      await user.tab(); // Second logo link
      await user.tab(); // Third logo link
      await user.tab(); // Fourth logo link
      await user.tab(); // Counter button
      expect(counterButton).toHaveFocus();

      // Press Enter to click
      await user.keyboard('{Enter}');
      expect(counterButton).toHaveTextContent('count is 1');
    });
  });

  describe('API Integration', () => {
    beforeEach(() => {
      // Reset any mocks before each test
      vi.restoreAllMocks();
    });

    it('should display initial "unknown" name', () => {
      render(<App />);
      const apiButton = screen.getByRole('button', { name: /get name/i });

      expect(apiButton).toHaveTextContent('Name from API is: unknown');
    });

    it('should fetch and display name from API when button is clicked', async () => {
      const user = userEvent.setup();

      // Mock the fetch API
      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ name: 'Test User' }),
        } as Response)
      );

      render(<App />);
      const apiButton = screen.getByRole('button', { name: /get name/i });

      await user.click(apiButton);

      await waitFor(() => {
        expect(apiButton).toHaveTextContent('Name from API is: Test User');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API fetch errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock fetch to reject with suppressed console error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      render(<App />);
      const apiButton = screen.getByRole('button', { name: /get name/i });

      await user.click(apiButton);

      // Name should remain "unknown" when fetch fails
      // Small delay to allow promise to reject
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(apiButton).toHaveTextContent('Name from API is: unknown');

      consoleErrorSpy.mockRestore();
    });

    it('should handle invalid API response format', async () => {
      const user = userEvent.setup();

      // Mock fetch with invalid response
      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ wrongKey: 'value' }),
        } as Response)
      );

      render(<App />);
      const apiButton = screen.getByRole('button', { name: /get name/i });

      await user.click(apiButton);

      // Should handle gracefully (undefined will be set as name)
      await waitFor(() => {
        expect(apiButton).toHaveTextContent(/Name from API is:/);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have properly labeled interactive elements', () => {
      render(<App />);

      expect(screen.getByRole('button', { name: /increment/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get name/i })).toBeInTheDocument();
    });

    it('should have accessible link targets', () => {
      render(<App />);
      const links = screen.getAllByRole('link');

      links.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('href');
      });
    });
  });
});
