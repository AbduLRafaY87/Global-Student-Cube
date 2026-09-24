import { DesignGallery } from "@/app/design/DesignGallery";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Design system",
};

export default function DesignPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="min-h-full bg-background px-4">
      <DesignGallery />
    </main>
  );
}
