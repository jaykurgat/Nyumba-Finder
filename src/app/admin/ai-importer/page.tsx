import { redirect } from 'next/navigation';
import { isAdminSession } from '@/lib/admin-auth';
import AdminAIImporter from '@/components/admin/AdminAIImporter';

export default async function AdminAIImporterPage() {
  if (!(await isAdminSession())) redirect('/admin/login');
  return <AdminAIImporter />;
}
