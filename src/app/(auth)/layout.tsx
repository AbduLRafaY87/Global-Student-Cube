import { SkipLink } from "@/components/ui/SkipLink";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 items-start justify-center bg-background px-4 py-8 min-[900px]:items-center">
      <SkipLink />
      <main id="main-content" className="w-full max-w-[720px]">
        {children}
      </main>
    </div>
  );
}
