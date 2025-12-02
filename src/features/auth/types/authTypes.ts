import type { Profile } from '@/types/database';

export type UserRole = 'super_admin' | 'admin' | 'editor' | 'viewer';

export interface AuthProfile extends Profile {
  // El campo role puede venir de la BD o no existir aún, por eso debe ser opcional
  role?: UserRole | null;
}
