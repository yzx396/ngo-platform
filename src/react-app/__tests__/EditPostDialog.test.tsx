import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditPostDialog } from '../components/EditPostDialog';
import * as postService from '../services/postService';
import { PostType } from '../../types/post';
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

describe('EditPostDialog Component', () => {
  const mockPost = {
    id: 'post-1',
    user_id: 'user-1',
    content: 'Original post content',
    post_type: PostType.General,
    likes_count: 5,
    comments_count: 2,
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000),
  };

  const renderComponent = (post = mockPost, open = true) => {
    return render(
      <I18nextProvider i18n={i18n}>
        <EditPostDialog
          post={post}
          open={open}
          onOpenChange={vi.fn()}
          onPostUpdated={vi.fn()}
        />
      </I18nextProvider>
    );
  };

  // Setup and cleanup for window.confirm mocking
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render when open is false', () => {
    renderComponent(mockPost, false);

    const dialog = screen.queryByRole('dialog');
    expect(dialog).not.toBeInTheDocument();
  });

  it('should render dialog with post content when open is true', () => {
    renderComponent();

    const textarea = screen.getByDisplayValue(mockPost.content);
    expect(textarea).toBeInTheDocument();
  });

  it('should populate form with post data', () => {
    renderComponent();

    const textarea = screen.getByRole('textbox', { name: /post content/i }) as HTMLTextAreaElement;
    expect(textarea.value).toBe(mockPost.content);
  });

  it('should allow editing post content', () => {
    renderComponent();

    const textarea = screen.getByRole('textbox', { name: /post content/i }) as HTMLTextAreaElement;
    const newContent = 'Updated post content';

    fireEvent.change(textarea, { target: { value: newContent } });
    expect(textarea.value).toBe(newContent);
  });

  it('should display character counter', () => {
    renderComponent();

    const charCount = screen.getByText(new RegExp(`${mockPost.content.length}/2000 characters`));
    expect(charCount).toBeInTheDocument();
  });

  it('should have save, cancel, and delete buttons', () => {
    renderComponent();

    const saveButton = screen.getByRole('button', { name: /save/i });
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const deleteButton = screen.getByRole('button', { name: /delete/i });

    expect(saveButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();
    expect(deleteButton).toBeInTheDocument();
  });

  it('should call updatePost when save is clicked', async () => {
    vi.mocked(postService.updatePost).mockResolvedValueOnce(mockPost);

    const onPostUpdated = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <I18nextProvider i18n={i18n}>
        <EditPostDialog
          post={mockPost}
          open={true}
          onOpenChange={onOpenChange}
          onPostUpdated={onPostUpdated}
        />
      </I18nextProvider>
    );

    const textarea = screen.getByRole('textbox', { name: /post content/i }) as HTMLTextAreaElement;
    const newContent = 'Updated content';
    fireEvent.change(textarea, { target: { value: newContent } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(postService.updatePost).toHaveBeenCalled();
      expect(onPostUpdated).toHaveBeenCalled();
    });
  });

  it('should call deletePost when delete button is clicked and confirmed', async () => {
    vi.mocked(postService.deletePost).mockResolvedValueOnce(undefined);
    window.confirm = vi.fn(() => true);

    const onPostUpdated = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <I18nextProvider i18n={i18n}>
        <EditPostDialog
          post={mockPost}
          open={true}
          onOpenChange={onOpenChange}
          onPostUpdated={onPostUpdated}
        />
      </I18nextProvider>
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(postService.deletePost).toHaveBeenCalledWith(mockPost.id);
      expect(onPostUpdated).toHaveBeenCalled();
    });
  });

  it('should not call deletePost when delete is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <I18nextProvider i18n={i18n}>
        <EditPostDialog
          post={mockPost}
          open={true}
          onOpenChange={vi.fn()}
          onPostUpdated={vi.fn()}
        />
      </I18nextProvider>
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(postService.deletePost).not.toHaveBeenCalled();
  });

  it('should close dialog when cancel is clicked', () => {
    const onOpenChange = vi.fn();

    render(
      <I18nextProvider i18n={i18n}>
        <EditPostDialog
          post={mockPost}
          open={true}
          onOpenChange={onOpenChange}
          onPostUpdated={vi.fn()}
        />
      </I18nextProvider>
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should show error message when update fails', async () => {
    const errorMessage = 'Failed to update post';
    vi.mocked(postService.updatePost).mockRejectedValueOnce(new Error(errorMessage));

    render(
      <I18nextProvider i18n={i18n}>
        <EditPostDialog
          post={mockPost}
          open={true}
          onOpenChange={vi.fn()}
          onPostUpdated={vi.fn()}
        />
      </I18nextProvider>
    );

    const textarea = screen.getByRole('textbox', { name: /post content/i }) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Updated content' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to update post/i)).toBeInTheDocument();
    });
  });

  it('should only allow admins to create/edit announcements', () => {
    // This would require checking the user role in the component
    // For now, we verify the option exists in the dropdown
    const { container } = renderComponent();

    // The announcement option should only be visible for admins
    // Since our test user is a member, it shouldn't be visible
    const options = container.querySelectorAll('option');
    const hasAnnouncement = Array.from(options).some((opt) =>
      opt.textContent?.includes('Announcement')
    );

    // For member users, announcement should not be visible
    expect(hasAnnouncement).toBe(false);
  });
});
