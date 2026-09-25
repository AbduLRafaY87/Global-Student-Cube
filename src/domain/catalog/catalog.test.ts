import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canTransitionCatalogState,
  catalogPage,
  catalogPageLimit,
  isExcludedPublicField,
  isPrivateCatalogField,
  isPublicUniversityField,
  publicCatalogFields,
} from "./catalog";

describe("catalog publication", () => {
  it("follows draft to in_review to published to withdrawn", () => {
    assert.equal(canTransitionCatalogState("draft", "in_review"), true);
    assert.equal(canTransitionCatalogState("in_review", "published"), true);
    assert.equal(canTransitionCatalogState("published", "withdrawn"), true);
    assert.equal(canTransitionCatalogState("draft", "published"), false);
  });
});

describe("catalog pagination", () => {
  it("clamps limit to 1..50 and offset to >= 0", () => {
    assert.deepEqual(catalogPage(undefined, undefined), {
      limit: 20,
      offset: 0,
    });
    assert.equal(catalogPageLimit(0), 1);
    assert.equal(catalogPageLimit(200), 50);
    assert.equal(catalogPage(-4, -9).offset, 0);
  });
});

describe("public catalog DTO", () => {
  it("keeps published university fields and strips private ones", () => {
    assert.equal(isPublicUniversityField("name"), true);
    assert.equal(isPublicUniversityField("application_url"), false);
    assert.equal(isPrivateCatalogField("counselor_remarks"), true);
    assert.deepEqual(
      publicCatalogFields({
        name: "Published",
        counselor_remarks: "internal",
        application_url: "https://apply.example.invalid",
      }),
      { name: "Published" },
    );
  });

  it("strips acceptance_rate so public DTOs never expose D5-removed fields (T061)", () => {
    assert.equal(isExcludedPublicField("acceptance_rate"), true);
    assert.equal(isPublicUniversityField("acceptance_rate"), false);
    assert.deepEqual(
      publicCatalogFields({
        name: "Published",
        acceptance_rate: 12,
      }),
      { name: "Published" },
    );
  });
});
