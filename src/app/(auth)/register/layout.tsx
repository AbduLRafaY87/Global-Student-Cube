import { RegisterDraftProvider } from "@/components/auth/RegisterDraftProvider";
import type { ReactNode } from "react";

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return <RegisterDraftProvider>{children}</RegisterDraftProvider>;
}
