import { isParkedModuleEnabled } from "@/domain/legacy/parked";
import { notFound } from "next/navigation";

export function enforceParkedRoute(): void {
  if (!isParkedModuleEnabled(process.env.GSC_FEATURE_PARKED_MODULES)) {
    notFound();
  }
}
