"use client";

import { Field, controlClassName } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";

interface PasswordFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export function PasswordField({
  id,
  label,
  error,
  hint,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <Field id={id} label={label} error={error} hint={hint} required>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={`${controlClassName(Boolean(error))} pr-12`}
          aria-invalid={error ? true : undefined}
          aria-required
          aria-describedby={describedBy}
          spellCheck={false}
          {...props}
        />
        <span className="absolute top-0 right-0">
          <IconButton
            label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </IconButton>
        </span>
      </div>
    </Field>
  );
}
