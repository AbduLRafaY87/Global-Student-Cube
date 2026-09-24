"use client";

import { IconButton } from "@/components/ui/IconButton";
import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "confirm" | "form";
}

export function Dialog({
  open,
  title,
  onClose,
  children,
  size = "confirm",
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) {
      return;
    }

    if (open && !node.open) {
      node.showModal();
      document.getElementById(titleId)?.focus();
    } else if (!open && node.open) {
      node.close();
    }
  }, [open, titleId]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={`m-auto w-[calc(100%-32px)] rounded-[var(--radius-modal)] border border-border bg-surface p-0 text-text shadow-md backdrop:bg-[var(--gsc-backdrop)] max-[899px]:max-h-[90vh] ${size === "form" ? "max-w-[720px]" : "max-w-[560px]"}`}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="relative flex items-start justify-between gap-4 p-6 pr-14 pb-0">
          <h2 id={titleId} tabIndex={-1} className="text-section font-semibold">
            {title}
          </h2>
          <IconButton
            label={`Close ${title}`}
            className="absolute top-2 right-2"
            onClick={onClose}
          >
            <X className="size-6" aria-hidden />
          </IconButton>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </dialog>
  );
}
