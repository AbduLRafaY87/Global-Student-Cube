import { passwordRuleStates } from "@/domain/identity/password";

export function PasswordRules({ password }: { password: string }) {
  const rules = passwordRuleStates(password);

  return (
    <ul className="space-y-1 text-sm leading-5">
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={rule.met ? "text-positive" : "text-text-muted"}
        >
          {rule.met ? "Met: " : "Needed: "}
          {rule.label}
        </li>
      ))}
    </ul>
  );
}
