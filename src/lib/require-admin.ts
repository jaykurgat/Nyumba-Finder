import { isAdminSession } from '@/lib/admin-auth';

export async function requireAdmin() {
  if (!(await isAdminSession())) {
    throw new Error('UNAUTHORIZED_ADMIN');
  }
}
