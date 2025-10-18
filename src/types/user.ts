/**
 * User type definitions
 * Represents a user in the platform (can be a mentor, mentee, or both)
 */

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: number;
  updated_at: number;
}
