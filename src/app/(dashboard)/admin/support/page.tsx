import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { SupportActions } from "@/app/(dashboard)/admin/support/SupportActions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support actions",
};

export default function AdminSupportPage() {
  return (
    <AdminChrome
      title="Support actions"
      description="Export builds a 24-hour subject-only package. Deletion suspends access and follows the 30-day hold-aware workflow."
    >
      <SupportActions />
    </AdminChrome>
  );
}
