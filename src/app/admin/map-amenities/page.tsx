import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import AdminMapAmenities from "@/components/admin/AdminMapAmenities";
export default async function AdminMapAmenitiesPage() { if (!(await isAdminSession())) redirect("/admin/login"); return <AdminMapAmenities />; }
