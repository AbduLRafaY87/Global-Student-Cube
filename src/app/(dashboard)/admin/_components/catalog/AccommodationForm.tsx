"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AccommodationFormProps {
  universityId: string;
}

export function AccommodationForm({ universityId }: AccommodationFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("dorm");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [basis, setBasis] = useState("monthly");
  const [mealIncluded, setMealIncluded] = useState(false);
  const [priceSourceType, setPriceSourceType] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [address, setAddress] = useState("");
  const [includedCosts, setIncludedCosts] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        void postAdmin("/api/v1/admin/catalog/accommodations", {
          universityId,
          name,
          type,
          amount: amount === "" ? undefined : Number(amount),
          currency: amount === "" ? undefined : currency,
          basis,
          mealIncluded,
          priceSourceType: priceSourceType || undefined,
          latitude: latitude === "" ? undefined : Number(latitude),
          longitude: longitude === "" ? undefined : Number(longitude),
          address: address || undefined,
          includedCosts: includedCosts
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .map((name) => ({ name, included: true })),
          reason,
        }).then((result) => {
          setBusy(false);
          setMessage(
            result.ok
              ? "Accommodation draft saved. Nightly prices are not copied into monthly costs."
              : result.message,
          );
          if (result.ok) {
            router.refresh();
          }
        });
      }}
    >
      <h2 className="text-lg font-semibold text-text">Accommodation</h2>
      <p className="text-sm text-text-muted">
        Unknown distances stay unknown. Community proximity never affects matching.
      </p>
      <TextField id="acc-name" label="Name" required value={name} onChange={(event) => setName(event.target.value)} />
      <SelectField
        id="acc-type"
        label="Type"
        required
        value={type}
        onChange={(event) => setType(event.target.value)}
        options={[
          { value: "dorm", label: "Dorm" },
          { value: "apartment", label: "Apartment" },
          { value: "family", label: "Family" },
          { value: "host_family", label: "Host family" },
        ]}
      />
      <TextField
        id="acc-amount"
        label="Amount"
        optional
        type="number"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />
      <TextField
        id="acc-currency"
        label="Currency"
        value={currency}
        onChange={(event) => setCurrency(event.target.value.toUpperCase())}
      />
      <SelectField
        id="acc-basis"
        label="Cost basis"
        required
        value={basis}
        onChange={(event) => setBasis(event.target.value)}
        options={[
          { value: "monthly", label: "Monthly" },
          { value: "nightly", label: "Nightly" },
          { value: "unknown", label: "Unknown" },
        ]}
      />
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={mealIncluded}
          onChange={(event) => setMealIncluded(event.target.checked)}
        />
        Meals included in rent
      </label>
      <SelectField
        id="acc-price-source"
        label="Price source"
        optional
        value={priceSourceType}
        onChange={(event) => setPriceSourceType(event.target.value)}
        options={[
          { value: "", label: "Not provided" },
          { value: "residence_quote", label: "Residence quote" },
          { value: "city_estimate", label: "City estimate" },
        ]}
      />
      <TextField
        id="acc-address"
        label="Address"
        optional
        value={address}
        onChange={(event) => setAddress(event.target.value)}
      />
      <TextField
        id="acc-lat"
        label="Latitude"
        optional
        value={latitude}
        onChange={(event) => setLatitude(event.target.value)}
      />
      <TextField
        id="acc-lng"
        label="Longitude"
        optional
        value={longitude}
        onChange={(event) => setLongitude(event.target.value)}
      />
      <TextField
        id="acc-included"
        label="Included costs"
        optional
        value={includedCosts}
        onChange={(event) => setIncludedCosts(event.target.value)}
        hint="Comma-separated items already in the listed rent. Do not add meal amounts when meals are included."
      />
      <TextField
        id="acc-reason"
        label="Reason"
        required
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button type="submit" loading={busy}>
        Add accommodation
      </Button>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
