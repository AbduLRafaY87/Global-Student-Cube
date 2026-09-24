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
      description="Prompt 30 stubs: export and deletion requests are recorded now and fulfilled later."
    >
      <SupportActions />
    </AdminChrome>
  );
}
