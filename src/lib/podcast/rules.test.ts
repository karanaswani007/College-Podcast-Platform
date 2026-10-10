import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  categoryFilter,
  cleanTags,
  mediaIdFromPath,
  pageNumber,
  searchTerm,
  shouldCountPlay,
  slugify,
} from "./rules.ts";

describe("podcast rules", () => {
  it("slugifies titles and falls back when empty", () => {
    assert.equal(slugify("AI in 2026"), "ai-in-2026");
    assert.equal(slugify("  Hello!!! "), "hello");
    assert.equal(slugify("---"), "item");
  });

  it("removes LIKE wildcards from search text", () => {
    assert.equal(searchTerm(" 100%_done "), "100done");
    assert.equal(searchTerm("%%%"), "");
  });

  it("keeps category filters to slugs", () => {
    assert.equal(categoryFilter("College Life"), "collegelife");
    assert.equal(categoryFilter("all"), "all");
    assert.equal(categoryFilter("education"), "education");
  });

  it("bounds pages", () => {
    assert.equal(pageNumber(undefined), 1);
    assert.equal(pageNumber(0), 1);
    assert.equal(pageNumber(4.8), 4);
    assert.equal(pageNumber(500), 100);
  });

  it("cleans tags", () => {
    assert.equal(cleanTags(" AI, exams, AI , , focus "), "AI, exams, focus");
  });

  it("counts a play only after the listening threshold", () => {
    assert.equal(shouldCountPlay(7, 100), false);
    assert.equal(shouldCountPlay(15, 100), true);
    assert.equal(shouldCountPlay(8, 20), true);
    assert.equal(shouldCountPlay(7.9, 20), false);
    assert.equal(shouldCountPlay(10, 0), true);
    assert.equal(shouldCountPlay(9, 0), false);
    assert.equal(shouldCountPlay(Number.NaN, 30), false);
  });

  it("accepts only platform media paths", () => {
    const id = "11111111-2222-4333-8444-555555555555";
    assert.equal(mediaIdFromPath(`/api/media/${id}`), id);
    assert.equal(mediaIdFromPath("/audio/ai-in-2026.mp3"), null);
    assert.equal(mediaIdFromPath("https://evil.example/file.mp3"), null);
    assert.equal(mediaIdFromPath(null), null);
  });
});
