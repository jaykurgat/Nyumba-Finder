import { redirect } from 'next/navigation';
import { isAdminSession } from '@/lib/admin-auth';
import AdminProperties from '@/components/admin/AdminProperties';

export default async function AdminPropertiesPage() {
  if (!(await isAdminSession())) redirect('/admin/login');
  return <AdminProperties />;
}
