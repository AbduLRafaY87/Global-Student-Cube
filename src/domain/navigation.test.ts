import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOTTOM_NAV,
  DASHBOARD_NAV,
  dashboardRoleRedirect,
  flattenNavItems,
  homePathForRole,
  isPathAllowedForRole,
} from "./navigation";
import {
  applicationStatusTone,
  capProgressPercent,
  deadlineTone,
  offerStatusTone,
} from "./status";

describe("role navigation and guards", () => {
  it("groups student destinations by journey stage", () => {
    assert.deepEqual(
      DASHBOARD_NAV.student.map((section) => section.label),
      ["Discover", "Apply", "Prepare", "Decide", "Support"],
    );
    const hrefs = flattenNavItems("student").map((item) => item.href);
    assert.ok(hrefs.includes("/home"));
    assert.ok(hrefs.includes("/explore/universities"));
    assert.ok(hrefs.includes("/shortlist"));
    assert.ok(hrefs.includes("/applications"));
    assert.ok(hrefs.includes("/costs"));
    assert.ok(hrefs.includes("/family-links"));
    assert.ok(hrefs.includes("/housing"));
    assert.ok(hrefs.includes("/counselor"));
    assert.ok(hrefs.includes("/rewards"));
    assert.equal(hrefs.includes("/admin"), false);
    assert.equal(hrefs.includes("/parent-portal"), false);
    assert.equal(hrefs.includes("/essays"), false);
    assert.equal(hrefs.includes("/admission-odds"), false);
    assert.equal(hrefs.includes("/documents"), false);
    assert.equal(hrefs.includes("/test-prep"), false);
    assert.equal(hrefs.includes("/activities"), false);
  });

  it("keeps bottom navigation to at most five destinations", () => {
    assert.ok(BOTTOM_NAV.student.length <= 5);
    assert.ok(BOTTOM_NAV.parent.length <= 5);
    assert.ok(BOTTOM_NAV.counselor.length <= 5);
    assert.ok(BOTTOM_NAV.admin.length <= 5);
  });

  it("blocks role-mismatched dashboard routes", () => {
    assert.equal(isPathAllowedForRole("/admin", "student"), false);
    assert.equal(isPathAllowedForRole("/parent-portal", "student"), false);
    assert.equal(isPathAllowedForRole("/parent/home", "student"), false);
    assert.equal(isPathAllowedForRole("/applications", "parent"), false);
    assert.equal(isPathAllowedForRole("/admin", "counselor"), false);
    assert.equal(isPathAllowedForRole("/parent-portal", "admin"), false);
  });

  it("allows each role its own home and shared onboarding", () => {
    assert.equal(isPathAllowedForRole("/home", "student"), true);
    assert.equal(isPathAllowedForRole("/profile", "student"), true);
    assert.equal(isPathAllowedForRole("/cases/example/profile", "student"), true);
    assert.equal(isPathAllowedForRole("/parent/home", "parent"), true);
    assert.equal(isPathAllowedForRole("/parent/cases", "parent"), true);
    assert.equal(isPathAllowedForRole("/family-links", "parent"), true);
    assert.equal(isPathAllowedForRole("/counselor", "counselor"), true);
    assert.equal(isPathAllowedForRole("/admin", "admin"), true);
    assert.equal(isPathAllowedForRole("/admin/approvals", "admin"), true);
    assert.equal(isPathAllowedForRole("/admin/users", "admin"), true);
    assert.equal(isPathAllowedForRole("/admin/approvals", "student"), false);
    assert.equal(isPathAllowedForRole("/onboarding", "student"), true);
    assert.equal(isPathAllowedForRole("/onboarding", "admin"), true);
    assert.equal(homePathForRole("student"), "/home");
    assert.equal(homePathForRole("parent"), "/parent/home");
  });

  it("redirects parked leftover routes away from students", () => {
    assert.equal(isPathAllowedForRole("/essays", "student"), false);
    assert.equal(isPathAllowedForRole("/billing", "student"), false);
  });

  it("uses the same mismatch redirect in proxy and dashboard layout", () => {
    assert.equal(dashboardRoleRedirect("/admin", "student"), "/home");
    assert.equal(dashboardRoleRedirect("/parent-portal", "student"), "/home");
    assert.equal(
      dashboardRoleRedirect("/applications", "parent"),
      "/parent/home",
    );
    assert.equal(dashboardRoleRedirect("/admin", "counselor"), "/counselor/home");
    assert.equal(dashboardRoleRedirect("/parent-portal", "admin"), "/admin");
    assert.equal(dashboardRoleRedirect("/profile", "student"), null);
    assert.equal(dashboardRoleRedirect("/counselor", "student"), null);
    assert.equal(dashboardRoleRedirect("", "student"), null);
  });
});

describe("semantic status tones", () => {
  const now = Date.parse("2026-09-19T00:00:00Z");

  it("maps deadline proximity onto the semantic set", () => {
    assert.equal(deadlineTone("2026-09-18", now).tone, "critical");
    assert.equal(deadlineTone("2026-09-21", now).tone, "critical");
    assert.equal(deadlineTone("2026-09-30", now).tone, "warning");
    assert.equal(deadlineTone("2027-01-15", now).tone, "neutral");
    assert.equal(deadlineTone(null, now).label, "Not provided");
  });

  it("maps application and offer states onto the semantic set", () => {
    assert.equal(applicationStatusTone("accepted").tone, "positive");
    assert.equal(applicationStatusTone("rejected").tone, "critical");
    assert.equal(applicationStatusTone("submitted").tone, "warning");
    assert.equal(applicationStatusTone("draft").tone, "neutral");
    assert.equal(offerStatusTone("pending").tone, "warning");
    assert.equal(offerStatusTone("declined").tone, "critical");
  });

  it("caps the progress bar at 100 while preserving display values", () => {
    assert.equal(capProgressPercent(120), 100);
    assert.equal(capProgressPercent(72), 72);
    assert.equal(capProgressPercent(-4), 0);
  });
});
