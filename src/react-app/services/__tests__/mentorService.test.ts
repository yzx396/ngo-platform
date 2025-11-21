import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiClientModule from '../apiClient';
import {
  createMentorProfile,
  getMentorProfile,
  getMentorProfileByUserId,
  updateMentorProfile,
  deleteMentorProfile,
  searchMentors,
  searchMentorsByPage,
} from '../mentorService';
import type { MentorProfile } from '../../../types/mentor';

vi.mock('../apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

describe('mentorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockMentorProfile: MentorProfile = {
    id: 'mentor_123',
    user_id: 'user_123',
    bio: 'Expert mentor',
    rate: 50.0,
    payment_types: 3,
    mentoring_levels: 7,
    availability: JSON.stringify({ monday: '9-17', friday: '9-12' }),
    expertise_domain: 'Technology',
    expertise_topics: JSON.stringify(['React', 'TypeScript']),
    linkedin_url: 'https://linkedin.com/in/mentor',
    available: true,
    accepting_new_mentees: true,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  describe('createMentorProfile', () => {
    it('should create a mentor profile successfully', async () => {
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockMentorProfile);

      const data = {
        bio: 'Expert mentor',
        rate: 50.0,
        payment_types: 3,
        mentoring_levels: 7,
        availability: JSON.stringify({ monday: '9-17' }),
        expertise_domain: 'Technology',
        expertise_topics: JSON.stringify(['React']),
        linkedin_url: 'https://linkedin.com/in/mentor',
      };

      const result = await createMentorProfile(data);

      expect(apiClientModule.apiPost).toHaveBeenCalledWith('/api/v1/mentors/profiles', data);
      expect(result).toEqual(mockMentorProfile);
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      const data = { bio: 'Bio', rate: 50.0, payment_types: 0, mentoring_levels: 0, availability: '{}', expertise_domain: '', expertise_topics: '[]', linkedin_url: '' };

      await expect(createMentorProfile(data)).rejects.toThrow('Unauthorized');
    });
  });

  describe('getMentorProfile', () => {
    it('should fetch mentor profile by ID', async () => {
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockMentorProfile);

      const result = await getMentorProfile('mentor_123');

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/mentors/profiles/mentor_123');
      expect(result).toEqual(mockMentorProfile);
    });

    it('should throw error when profile not found', async () => {
      const error = new Error('Not found');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(getMentorProfile('invalid_id')).rejects.toThrow('Not found');
    });
  });

  describe('getMentorProfileByUserId', () => {
    it('should fetch mentor profile by user ID', async () => {
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockMentorProfile);

      const result = await getMentorProfileByUserId('user_123');

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/mentors/profiles/by-user/user_123');
      expect(result).toEqual(mockMentorProfile);
    });

    it('should return null when profile does not exist (404)', async () => {
      const error = { status: 404, message: 'Not found' };
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      const result = await getMentorProfileByUserId('user_123');

      expect(result).toBeNull();
    });

    it('should throw non-404 errors', async () => {
      const error = { status: 500, message: 'Server error' };
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(getMentorProfileByUserId('user_123')).rejects.toThrow();
    });
  });

  describe('updateMentorProfile', () => {
    it('should update mentor profile', async () => {
      const updated = { ...mockMentorProfile, bio: 'Updated bio' };
      vi.mocked(apiClientModule.apiPut).mockResolvedValue(updated);

      const result = await updateMentorProfile('mentor_123', { bio: 'Updated bio' });

      expect(apiClientModule.apiPut).toHaveBeenCalledWith('/api/v1/mentors/profiles/mentor_123', {
        bio: 'Updated bio',
      });
      expect(result.bio).toBe('Updated bio');
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiPut).mockRejectedValue(error);

      await expect(updateMentorProfile('mentor_123', { bio: 'New' })).rejects.toThrow('Unauthorized');
    });
  });

  describe('deleteMentorProfile', () => {
    it('should delete mentor profile', async () => {
      const mockResponse = { success: true };
      vi.mocked(apiClientModule.apiDelete).mockResolvedValue(mockResponse);

      const result = await deleteMentorProfile('mentor_123');

      expect(apiClientModule.apiDelete).toHaveBeenCalledWith('/api/v1/mentors/profiles/mentor_123');
      expect(result.success).toBe(true);
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiDelete).mockRejectedValue(error);

      await expect(deleteMentorProfile('mentor_123')).rejects.toThrow('Unauthorized');
    });
  });

  describe('searchMentors', () => {
    it('should search mentors with default filters', async () => {
      const mockResponse = { mentors: [mockMentorProfile], total: 1, limit: 20, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await searchMentors();

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/mentors/search?limit=20&offset=0');
      expect(result).toEqual(mockResponse);
    });

    it('should search mentors with mentoring levels filter', async () => {
      const mockResponse = { mentors: [mockMentorProfile], total: 1, limit: 20, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      await searchMentors({ mentoring_levels: 7 });

      expect(apiClientModule.apiGet).toHaveBeenCalledWith(
        expect.stringContaining('mentoring_levels=7')
      );
    });

    it('should search mentors with rate range filter', async () => {
      const mockResponse = { mentors: [mockMentorProfile], total: 1, limit: 20, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      await searchMentors({ hourly_rate_min: 30, hourly_rate_max: 100 });

      expect(apiClientModule.apiGet).toHaveBeenCalledWith(
        expect.stringContaining('hourly_rate_min=30')
      );
      expect(apiClientModule.apiGet).toHaveBeenCalledWith(
        expect.stringContaining('hourly_rate_max=100')
      );
    });

    it('should search mentors by nickname', async () => {
      const mockResponse = { mentors: [mockMentorProfile], total: 1, limit: 20, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      await searchMentors({ nick_name: 'John' });

      expect(apiClientModule.apiGet).toHaveBeenCalledWith(
        expect.stringContaining('nick_name=John')
      );
    });

    it('should handle empty search results', async () => {
      const mockResponse = { mentors: [], total: 0, limit: 20, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await searchMentors();

      expect(result.mentors).toEqual([]);
    });
  });

  describe('searchMentorsByPage', () => {
    it('should search mentors by page with defaults', async () => {
      const mockResponse = { mentors: [mockMentorProfile], total: 50, limit: 12, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      await searchMentorsByPage();

      expect(apiClientModule.apiGet).toHaveBeenCalledWith(
        expect.stringContaining('limit=12&offset=0')
      );
    });

    it('should search mentors by page with custom page and limit', async () => {
      const mockResponse = { mentors: [mockMentorProfile], total: 50, limit: 10, offset: 20 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      await searchMentorsByPage(3, 10);

      expect(apiClientModule.apiGet).toHaveBeenCalledWith(
        expect.stringContaining('limit=10&offset=20')
      );
    });

    it('should apply additional filters with page', async () => {
      const mockResponse = { mentors: [mockMentorProfile], total: 50, limit: 12, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      await searchMentorsByPage(1, 12, { nick_name: 'John' });

      expect(apiClientModule.apiGet).toHaveBeenCalledWith(
        expect.stringContaining('nick_name=John')
      );
    });
  });
});
