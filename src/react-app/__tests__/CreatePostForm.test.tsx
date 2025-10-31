import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreatePostForm } from '../components/CreatePostForm';
import * as postService from '../services/postService';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

// Mock the post service
vi.mock('../services/postService');

// Mock useAuth hook
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Test User', role: 'member' },
  }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CreatePostForm Component', () => {
  const renderComponent = () => {
    return render(
      <I18nextProvider i18n={i18n}>
        <CreatePostForm />
      </I18nextProvider>
    );
  };

  it('should render the form with textarea and buttons', () => {
    renderComponent();

    const textarea = screen.getByRole('textbox', { name: /post content/i });
    expect(textarea).toBeInTheDocument();

    const submitButton = screen.getByRole('button', { name: /create/i });
    expect(submitButton).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();
  });

  it('should display character counter', () => {
    renderComponent();

    const charCount = screen.getByText(/0\/2000 characters/);
    expect(charCount).toBeInTheDocument();
  });

  it('should update character count as user types', () => {
    renderComponent();

    const textarea = screen.getByRole('textbox', { name: /post content/i });
    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    const charCount = screen.getByText(/11\/2000 characters/);
    expect(charCount).toBeInTheDocument();
  });

  it('should disable submit button when content is empty', () => {
    renderComponent();

    const submitButton = screen.getByRole('button', { name: /create/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when content is provided', () => {
    renderComponent();

    const textarea = screen.getByRole('textbox', { name: /post content/i });
    fireEvent.change(textarea, { target: { value: 'Test post' } });

    const submitButton = screen.getByRole('button', { name: /create/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('should display post type selector', () => {
    renderComponent();

    const typeSelector = screen.getByRole('combobox', { name: /post type/i });
    expect(typeSelector).toBeInTheDocument();
  });

  it('should submit form with valid content', async () => {
    vi.mocked(postService.createPost).mockResolvedValueOnce({
      id: 'post-1',
      content: 'Test post',
      post_type: 'general',
      likes_count: 0,
      comments_count: 0,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    });

    const onPostCreated = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <CreatePostForm onPostCreated={onPostCreated} />
      </I18nextProvider>
    );

    const textarea = screen.getByRole('textbox', { name: /post content/i });
    fireEvent.change(textarea, { target: { value: 'Test post' } });

    const submitButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(postService.createPost).toHaveBeenCalledWith('Test post', 'general');
      expect(onPostCreated).toHaveBeenCalled();
    });
  });

  it('should clear form after successful submission', async () => {
    vi.mocked(postService.createPost).mockResolvedValueOnce({
      id: 'post-1',
      content: 'Test post',
      post_type: 'general',
      likes_count: 0,
      comments_count: 0,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    });

    render(
      <I18nextProvider i18n={i18n}>
        <CreatePostForm />
      </I18nextProvider>
    );

    const textarea = screen.getByRole('textbox', { name: /post content/i }) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Test post' } });

    const submitButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });

  it('should show error when form submission fails', async () => {
    const errorMessage = 'Failed to create post';
    vi.mocked(postService.createPost).mockRejectedValueOnce(new Error(errorMessage));

    render(
      <I18nextProvider i18n={i18n}>
        <CreatePostForm />
      </I18nextProvider>
    );

    const textarea = screen.getByRole('textbox', { name: /post content/i });
    fireEvent.change(textarea, { target: { value: 'Test post' } });

    const submitButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to create post/i)).toBeInTheDocument();
    });
  });

  it('should validate required fields', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <CreatePostForm />
      </I18nextProvider>
    );

    const submitButton = screen.getByRole('button', { name: /create/i });
    expect(submitButton).toBeDisabled();
  });

  it('should clear form when cancel button is clicked', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <CreatePostForm />
      </I18nextProvider>
    );

    const textarea = screen.getByRole('textbox', { name: /post content/i }) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Test post' } });
    expect(textarea.value).toBe('Test post');

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(textarea.value).toBe('');
  });

  it('should call onCancel callback when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <CreatePostForm onCancel={onCancel} />
      </I18nextProvider>
    );

    const textarea = screen.getByRole('textbox', { name: /post content/i });
    fireEvent.change(textarea, { target: { value: 'Test post' } });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
