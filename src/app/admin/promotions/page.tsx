import { redirect } from 'next/navigation';
import { isAdminSession } from '@/lib/admin-auth';
import AdminPromotions from '@/components/admin/AdminPromotions';

export default async function AdminPromotionsPage() {
  if (!(await isAdminSession())) redirect('/admin/login');
  return <AdminPromotions />;
}
