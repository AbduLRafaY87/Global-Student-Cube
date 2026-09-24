"use client";

import {
  EMPTY_REGISTRATION_DRAFT,
  type RegistrationDraft,
} from "@/domain/identity/registration";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const STORAGE_KEY = "gsc.register.draft.v1";
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function parseDraft(raw: string | null): RegistrationDraft {
  if (!raw) {
    return EMPTY_REGISTRATION_DRAFT;
  }

  try {
    return { ...EMPTY_REGISTRATION_DRAFT, ...JSON.parse(raw) } as RegistrationDraft;
  } catch {
    return EMPTY_REGISTRATION_DRAFT;
  }
}

function readSnapshot(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.sessionStorage.getItem(STORAGE_KEY) ?? "";
}

interface RegisterDraftContextValue {
  draft: RegistrationDraft;
  setDraft: (next: RegistrationDraft) => void;
  ready: boolean;
  clearDraft: () => void;
}

const RegisterDraftContext = createContext<RegisterDraftContextValue | null>(
  null,
);

export function RegisterDraftProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => "");
  const draft = useMemo(() => parseDraft(snapshot || null), [snapshot]);

  const setDraft = useCallback((next: RegistrationDraft) => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emit();
  }, []);

  const clearDraft = useCallback(() => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    emit();
  }, []);

  const value = useMemo(
    () => ({ draft, setDraft, ready: true, clearDraft }),
    [draft, setDraft, clearDraft],
  );

  return (
    <RegisterDraftContext.Provider value={value}>
      {children}
    </RegisterDraftContext.Provider>
  );
}

export function useRegisterDraft(): RegisterDraftContextValue {
  const value = useContext(RegisterDraftContext);
  if (!value) {
    throw new Error("useRegisterDraft must be used inside RegisterDraftProvider");
  }
  return value;
}
