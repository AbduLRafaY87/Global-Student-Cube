import { deleteDocument } from "@/app/(dashboard)/documents/actions";
import { DocumentUploadForm } from "@/components/forms/DocumentUploadForm";
import { createClient } from "@/lib/supabase/server";
import {
  DOCUMENT_TYPES,
  type DocumentType,
  type StudentDocument,
} from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documents",
};

const BUCKET = "student-documents";
const SIGNED_URL_SECONDS = 60 * 60;

interface VaultDocument extends StudentDocument {
  download_url: string | null;
}

function parseDocumentType(value: unknown): DocumentType | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const type of DOCUMENT_TYPES) {
    if (type === value) {
      return type;
    }
  }

  return null;
}

function documentTypeLabel(type: DocumentType) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toStudentDocument(row: {
  id: unknown;
  user_id: unknown;
  file_name: unknown;
  file_url: unknown;
  document_type: unknown;
  created_at: unknown;
}): StudentDocument | null {
  const documentType = parseDocumentType(row.document_type);

  if (
    typeof row.id !== "string" ||
    typeof row.user_id !== "string" ||
    typeof row.file_name !== "string" ||
    typeof row.file_url !== "string" ||
    !documentType
  ) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    file_name: row.file_name,
    file_url: row.file_url,
    document_type: documentType,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

function formatCreatedAt(value: string) {
  if (!value) {
    return "Unknown date";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value.slice(0, 10);
  }

  return new Date(parsed).toLocaleDateString();
}

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const documents: VaultDocument[] = [];

  if (user) {
    const { data } = await supabase
      .from("documents")
      .select("id, user_id, file_name, file_url, document_type, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      for (const row of data) {
        const document = toStudentDocument(row);
        if (!document) {
          continue;
        }

        let downloadUrl: string | null = null;
        if (document.file_url.startsWith(`${user.id}/`)) {
          const { data: signed } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(document.file_url, SIGNED_URL_SECONDS);

          downloadUrl = signed?.signedUrl ?? null;
        }

        documents.push({
          ...document,
          download_url: downloadUrl,
        });
      }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Document vault
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Upload application documents and download them when you need them.
        </p>
      </header>

      <DocumentUploadForm />

      {documents.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No documents yet. Upload a file to get started.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                {documentTypeLabel(document.document_type)}
              </p>
              <h2 className="mt-2 break-all text-base font-semibold text-zinc-950 dark:text-zinc-50">
                {document.file_name}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {formatCreatedAt(document.created_at)}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {document.download_url ? (
                  <a
                    href={document.download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-sm text-zinc-500">
                    Download unavailable
                  </span>
                )}
                <form action={deleteDocument}>
                  <input type="hidden" name="id" value={document.id} />
                  <button
                    type="submit"
                    className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
