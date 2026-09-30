import { redirect } from 'next/navigation';
import { isAdminSession } from '@/lib/admin-auth';
import AdminReports from '@/components/admin/AdminReports';
export default async function AdminReportsPage() { if (!(await isAdminSession())) redirect('/admin/login'); return <AdminReports />; }
