export interface User {
  id: string;
  email: string;
  name: string;
  google_id?: string | null;
  created_at: number;
  updated_at: number;
}

export interface AuthPayload {
  userId: string;
  email: string;
  name: string;
  iat?: number; // Issued at (Unix timestamp in seconds)
  exp?: number; // Expiration time (Unix timestamp in seconds)
}
