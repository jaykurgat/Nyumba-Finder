import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import EmailStudio from "@/components/admin/EmailStudio";
export default async function EmailStudioPage() {
  if (!(await isAdminSession())) redirect("/admin/login");
  return <EmailStudio />;
}
