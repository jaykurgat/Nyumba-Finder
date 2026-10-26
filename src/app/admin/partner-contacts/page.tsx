import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import AdminPartnerContacts from "@/components/admin/AdminPartnerContacts";

export default async function AdminPartnerContactsPage() {
  if (!(await isAdminSession())) redirect("/admin/login");
  return <AdminPartnerContacts />;
}
