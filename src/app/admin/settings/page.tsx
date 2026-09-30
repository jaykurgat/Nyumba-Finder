import { redirect } from 'next/navigation';
import { isAdminSession } from '@/lib/admin-auth';
import AdminSettings from '@/components/admin/AdminSettings';
export default async function AdminSettingsPage() { if (!(await isAdminSession())) redirect('/admin/login'); return <AdminSettings />; }
