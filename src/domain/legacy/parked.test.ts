import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { DASHBOARD_NAV, flattenNavItems } from "../navigation";
import { PARKED_MODULE_PATHS, isParkedModuleEnabled } from "./parked";

function collectPageFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectPageFiles(full, acc);
    } else if (entry === "page.tsx") {
      acc.push(full.replace(/\\/g, "/"));
    }
  }
  return acc;
}

function fileToRoute(file: string): string {
  let route = file.replace(/^.*\/src\/app/, "");
  route = route.replace(/\/\([^/]+\)/g, "");
  route = route.replace(/\/page\.tsx$/, "");
  route = route.replace(/\/\[\[[^\]]+\]\]/g, "");
  route = route.replace(/\/\[[^\]]+\]/g, "/:param");
  return route === "" ? "/" : route;
}

function hrefHasPage(href: string, routes: readonly string[]): boolean {
  const path = href.split("?")[0] ?? href;
  return routes.some((route) => {
    if (route === path) {
      return true;
    }
    const pattern = `^${route.replace(/:param/g, "[^/]+")}$`;
    return new RegExp(pattern).test(path);
  });
}

describe("parked leftover modules", () => {
  it("defaults the parked feature flag off", () => {
    assert.equal(isParkedModuleEnabled(undefined), false);
    assert.equal(isParkedModuleEnabled("0"), false);
    assert.equal(isParkedModuleEnabled("1"), true);
  });

  it("keeps parked routes out of every role sidebar", () => {
    for (const role of Object.keys(DASHBOARD_NAV) as Array<keyof typeof DASHBOARD_NAV>) {
      const hrefs = flattenNavItems(role).map((item) => item.href);
      for (const parked of PARKED_MODULE_PATHS) {
        assert.equal(hrefs.includes(parked), false, `${role} lists ${parked}`);
      }
    }
  });
});

describe("sidebar routes exist", () => {
  it("lists only existing app routes for every role", () => {
    const routes = collectPageFiles(join(process.cwd(), "src/app")).map(fileToRoute);
    for (const role of Object.keys(DASHBOARD_NAV) as Array<keyof typeof DASHBOARD_NAV>) {
      for (const item of flattenNavItems(role)) {
        assert.equal(
          hrefHasPage(item.href, routes),
          true,
          `${role} sidebar href ${item.href} has no page`,
        );
      }
    }
  });
});
