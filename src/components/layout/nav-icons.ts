import type { NavIconName } from "@/domain/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  Bell,
  CheckSquare,
  ClipboardCheck,
  FileText,
  FolderOpen,
  GraduationCap,
  HeartHandshake,
  Home,
  MessageSquare,
  MoreHorizontal,
  Plane,
  Settings,
  Shield,
  Trophy,
  User,
  Users,
  Waypoints,
} from "lucide-react";

export const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  user: User,
  graduationCap: GraduationCap,
  award: Award,
  fileText: FileText,
  folderOpen: FolderOpen,
  messageSquare: MessageSquare,
  bell: Bell,
  clipboardCheck: ClipboardCheck,
  checkSquare: CheckSquare,
  trophy: Trophy,
  plane: Plane,
  home: Home,
  waypoints: Waypoints,
  users: Users,
  heartHandshake: HeartHandshake,
  shield: Shield,
  settings: Settings,
  moreHorizontal: MoreHorizontal,
};

export function navIconSizeClass(kind: "standard" | "action" | "meta"): string {
  if (kind === "meta") {
    return "size-4";
  }
  if (kind === "action") {
    return "size-5";
  }
  return "size-6";
}
