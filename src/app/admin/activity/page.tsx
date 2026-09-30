import { redirect } from 'next/navigation';
import { isAdminSession } from '@/lib/admin-auth';
import AdminActivity from '@/components/admin/AdminActivity';
export default async function AdminActivityPage() { if (!(await isAdminSession())) redirect('/admin/login'); return <AdminActivity />; }
