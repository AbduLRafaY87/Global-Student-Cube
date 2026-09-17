import type { HousingOption, HousingType } from "@/types";

export interface HousingCardProps {
  option: HousingOption;
  universityName: string;
  country: string;
}

function labelHousingType(housingType: HousingType): string {
  if (housingType === "on_campus") {
    return "On campus";
  }

  if (housingType === "off_campus") {
    return "Off campus";
  }

  return "Shared apartment";
}

function formatCost(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function HousingCard({
  option,
  universityName,
  country,
}: HousingCardProps) {
  return (
    <article className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {labelHousingType(option.housing_type)}
        {country ? ` · ${country}` : ""}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        {option.title}
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {universityName}
      </p>
      <dl className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
        <div className="flex justify-between gap-4">
          <dt>Monthly cost</dt>
          <dd className="font-medium">{formatCost(option.monthly_cost)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Address</dt>
          <dd className="text-right font-medium">{option.address}</dd>
        </div>
      </dl>
    </article>
  );
}
