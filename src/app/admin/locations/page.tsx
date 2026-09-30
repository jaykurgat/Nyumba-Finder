import { redirect } from 'next/navigation';
import { isAdminSession } from '@/lib/admin-auth';
import AdminLocations from '@/components/admin/AdminLocations';
export default async function AdminLocationsPage() { if (!(await isAdminSession())) redirect('/admin/login'); return <AdminLocations />; }
