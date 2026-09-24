import { Field, controlClassName } from "@/components/ui/Field";
import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
}

export function TextField({
  id,
  label,
  error,
  hint,
  optional,
  required,
  className,
  ...props
}: TextFieldProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <Field
      id={id}
      label={label}
      required={required}
      optional={optional}
      hint={hint}
      error={error}
    >
      <input
        id={id}
        className={className ?? controlClassName(Boolean(error))}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        required={required}
        {...props}
      />
    </Field>
  );
}
