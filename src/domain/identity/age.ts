export type AgeBand = "under_13" | "teen" | "adult";

export function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function ageOnDate(dob: Date, today: Date): number {
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = today.getUTCMonth() - dob.getUTCMonth();

  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getUTCDate() < dob.getUTCDate())
  ) {
    age -= 1;
  }

  return age;
}

export function ageBand(age: number): AgeBand {
  if (age < 13) {
    return "under_13";
  }

  if (age < 18) {
    return "teen";
  }

  return "adult";
}

export function validateBirthDate(
  value: string,
  today: Date,
): { error: string } | { dob: Date; age: number; band: AgeBand } {
  const dob = parseIsoDate(value);

  if (!dob) {
    return { error: "Enter a genuine date of birth as DD/MM/YYYY." };
  }

  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  if (dob.getTime() >= todayUtc) {
    return { error: "Date of birth must be in the past." };
  }

  const age = ageOnDate(dob, today);

  if (age > 120) {
    return { error: "Enter a genuine date of birth." };
  }

  return { dob, age, band: ageBand(age) };
}
