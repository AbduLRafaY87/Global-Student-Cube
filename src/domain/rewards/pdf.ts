export interface CertificateFacts {
  kind: "certificate" | "letter";
  displayName: string;
  issueId: string;
  issuedOn: string;
  dateFrom: string;
  dateTo: string;
  minutes: number;
  hoursLabel: string;
}

function pdfEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function certificateHoursLabel(minutes: number): string {
  return `${(minutes / 60).toFixed(1)} hours`;
}

export function generateRecognitionPdf(facts: CertificateFacts): Uint8Array {
  const title =
    facts.kind === "certificate" ? "Global Student Cube certificate" : "Appreciation letter";
  const lines = [
    title,
    `Issued to ${facts.displayName}`,
    `Issue ID ${facts.issueId}`,
    `Issued ${facts.issuedOn}`,
    `Verified contributions ${facts.dateFrom} to ${facts.dateTo}`,
    `Actual verified time ${facts.hoursLabel} (${facts.minutes} minutes)`,
    "Private mentee details are excluded.",
  ];
  const content = lines
    .map((line, index) => `BT /F1 12 Tf 48 ${720 - index * 22} Td (${pdfEscape(line)}) Tj ET`)
    .join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];
  let offset = 9;
  const xref = ["0000000000 65535 f "];
  const body = objects
    .map((object) => {
      const line = `${object}\n`;
      xref.push(`${String(offset).padStart(10, "0")} 00000 n `);
      offset += line.length;
      return line;
    })
    .join("");
  const pdf = `%PDF-1.4\n${body}xref\n0 6\n${xref.join("\n")}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
