import { redirect } from 'next/navigation';
import { isAdminSession } from '@/lib/admin-auth';
import AdminUsers from '@/components/admin/AdminUsers';
export default async function AdminUsersPage() { if (!(await isAdminSession())) redirect('/admin/login'); return <AdminUsers />; }
