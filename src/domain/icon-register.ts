export type IconSizeKind = "standard" | "action" | "meta";

export interface IconRegisterEntry {
  name: string;
  size: IconSizeKind;
  label: string;
}

/** Spec icon placement register — labels for /design and shared chrome. */
export const ICON_REGISTER: IconRegisterEntry[] = [
  { name: "Menu", size: "standard", label: "Open navigation" },
  { name: "ArrowLeft", size: "standard", label: "Back to previous screen" },
  { name: "X", size: "standard", label: "Close dialog" },
  { name: "Search", size: "action", label: "Search" },
  { name: "SlidersHorizontal", size: "action", label: "Filters, 0 active" },
  { name: "ArrowDownUp", size: "action", label: "Sort" },
  { name: "ChevronDown", size: "action", label: "Open choices" },
  { name: "Eye", size: "standard", label: "Show password" },
  { name: "Info", size: "action", label: "About field" },
  { name: "AlertCircle", size: "meta", label: "Error" },
  { name: "CheckCircle", size: "meta", label: "Verified" },
  { name: "CalendarDays", size: "action", label: "Choose date" },
  { name: "Clock", size: "meta", label: "Duration" },
  { name: "Globe", size: "action", label: "Country" },
  { name: "MapPin", size: "meta", label: "City" },
  { name: "GraduationCap", size: "standard", label: "Universities" },
  { name: "Award", size: "standard", label: "Scholarships" },
  { name: "Bookmark", size: "standard", label: "Save program" },
  { name: "Flag", size: "action", label: "Mark for counselor review" },
  { name: "Bell", size: "standard", label: "Notifications" },
  { name: "MessageSquare", size: "standard", label: "Messages" },
  { name: "Send", size: "standard", label: "Send message" },
  { name: "MoreHorizontal", size: "standard", label: "More actions" },
  { name: "Settings", size: "standard", label: "Settings" },
  { name: "Lightbulb", size: "meta", label: "Suggested improvement" },
];
