import { guestMatchLimit } from "@/domain/recommendations/recommendations";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import {
  fetchPublishedPrograms,
  fetchPublishedScholarships,
  fetchPublishedUniversities,
} from "@/server/modules/catalog/public";

const ALLOWED_KEYS = ["country", "field"] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    const country =
      typeof body.country === "string" ? body.country.trim().toUpperCase() : "";
    const field = typeof body.field === "string" ? body.field.trim() : "";
    if (!country && !field) {
      throw new CommandError("VALIDATION_FAILED", "Country or field is required.");
    }

    const [universities, programs, scholarships] = await Promise.all([
      fetchPublishedUniversities(),
      fetchPublishedPrograms(),
      fetchPublishedScholarships(),
    ]);
    const universityHits = universities.filter((university) => {
      const countryOk = !country || university.country === country;
      const fieldOk =
        !field ||
        university.name.toLowerCase().includes(field.toLowerCase()) ||
        programs.some(
          (program) =>
            program.university_id === university.id &&
            program.name.toLowerCase().includes(field.toLowerCase()),
        );
      return countryOk && fieldOk;
    });
    const scholarshipHits = scholarships.filter((row) => {
      const countryOk = !country || row.country_codes.includes(country);
      const fieldOk = !field || row.name.toLowerCase().includes(field.toLowerCase());
      return countryOk && fieldOk;
    });
    const limits = guestMatchLimit(universityHits.length, scholarshipHits.length);
    return commandSuccess(
      {
        universities: universityHits.slice(0, limits.universities),
        scholarships: scholarshipHits.slice(0, limits.scholarships),
      },
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
