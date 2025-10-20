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
}
