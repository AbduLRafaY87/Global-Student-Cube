import { NOT_PROVIDED } from "@/domain/catalog/display";
import { mapDirectionsHref } from "@/domain/catalog/guidance";
import type { PublicAccommodation } from "@/server/modules/catalog/public";
import { MapPin } from "lucide-react";

interface AccommodationCardsProps {
  rows: readonly PublicAccommodation[];
  city: string | null;
  country: string;
}

export function AccommodationCards({ rows, city, country }: AccommodationCardsProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-text-muted">{NOT_PROVIDED}</p>;
  }

  return (
    <ul className="grid gap-3">
      {rows.map((row) => {
        const directions = mapDirectionsHref({
          latitude: row.latitude,
          longitude: row.longitude,
          city: row.address ?? city,
          country,
        });
        const included = [
          ...(row.meal_included_in_rent ? ["Meals included in rent"] : []),
          ...row.included_costs,
        ];
        return (
          <li
            key={row.id}
            className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-text"
          >
            <p className="font-medium">{row.name}</p>
            <p className="mt-1 text-text-muted">
              {row.type} · {row.basis} · {row.amount ?? NOT_PROVIDED} {row.currency ?? ""}
            </p>
            <p className="mt-1 text-text-muted">
              Price source:{" "}
              {row.price_source_type === "residence_quote"
                ? "Residence quote"
                : row.price_source_type === "city_estimate"
                  ? "City estimate"
                  : NOT_PROVIDED}
            </p>
            {included.length > 0 ? (
              <p className="mt-1 text-text-muted">Included in the listed cost: {included.join(", ")}</p>
            ) : (
              <p className="mt-1 text-text-muted">Included costs: {NOT_PROVIDED}</p>
            )}
            {directions ? (
              <a
                className="mt-3 inline-flex items-center gap-2 text-sm text-primary underline-offset-2 hover:underline"
                href={directions}
                rel="noreferrer"
                target="_blank"
              >
                <MapPin className="size-4" aria-hidden />
                Directions
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
