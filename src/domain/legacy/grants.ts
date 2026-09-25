/** Tables that may keep INSERT/UPDATE/DELETE for role `authenticated`. Empty by design. */
export const AUTHENTICATED_WRITE_GRANT_ALLOWLIST: readonly string[] = [];

export interface TableWriteGrant {
  table: string;
  privilege: "INSERT" | "UPDATE" | "DELETE";
}

export function unexpectedAuthenticatedWriteGrants(
  grants: readonly TableWriteGrant[],
): TableWriteGrant[] {
  return grants.filter(
    (grant) => !AUTHENTICATED_WRITE_GRANT_ALLOWLIST.includes(grant.table),
  );
}
