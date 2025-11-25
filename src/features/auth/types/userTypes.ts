import type { UserRole } from './authTypes';

export interface UserManagementProfile {
  id: string;
  email: string | null;
  display_name?: string | null;
  role: UserRole;
  created_at: string;
}
