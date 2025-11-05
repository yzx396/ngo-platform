import { UserRole } from './role';

export interface User {
  id: string;
  email: string;
  name: string;
  google_id?: string | null;
  role?: UserRole;
  points?: number;
  cv_url?: string | null;           // URL to CV stored in R2
  cv_filename?: string | null;      // Original filename of uploaded CV
  cv_uploaded_at?: number | null;   // Timestamp of CV upload
  created_at: number;
  updated_at: number;
}

export interface AuthPayload {
  userId: string;
  email: string;
  name: string;
  role?: UserRole;
  points?: number;
  iat?: number; // Issued at (Unix timestamp in seconds)
  exp?: number; // Expiration time (Unix timestamp in seconds)
}
