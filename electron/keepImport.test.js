import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ki = require("./keepImport.cjs");

describe("extractText", () => {
  it("prefers textContent when non-empty", () => {
    expect(ki.extractText({ textContent: "  hello  " })).toBe("  hello  ");
  });

  it("renders listContent as checklist lines", () => {
    expect(
      ki.extractText({
        listContent: [
          { text: "A", isChecked: true },
          { text: "B", isChecked: false },
        ],
      })
    ).toBe("[x] A\n[ ] B");
  });

  it("falls back to text", () => {
    expect(ki.extractText({ text: "plain" })).toBe("plain");
  });

  it("returns empty string when nothing matches", () => {
    expect(ki.extractText({})).toBe("");
  });
});

describe("extractLabels", () => {
  it("maps string entries", () => {
    expect(ki.extractLabels({ labels: ["a", "b"] })).toEqual(["a", "b"]);
  });

  it("maps object entries with name", () => {
    expect(ki.extractLabels({ labels: [{ name: "Work" }, { name: "Home" }] })).toEqual([
      "Work",
      "Home",
    ]);
  });

  it("returns empty array when missing", () => {
    expect(ki.extractLabels({})).toEqual([]);
  });
});

describe("isLikelyKeepNote", () => {
  it("accepts objects with Keep-like keys", () => {
    expect(ki.isLikelyKeepNote({ title: "x" })).toBe(true);
    expect(ki.isLikelyKeepNote({ listContent: [] })).toBe(true);
  });

  it("rejects null and plain objects without signals", () => {
    expect(ki.isLikelyKeepNote(null)).toBe(false);
    expect(ki.isLikelyKeepNote({ foo: 1 })).toBe(false);
  });
});

describe("noteId", () => {
  it("uses raw id when present", () => {
    expect(ki.noteId("/takeout", "/takeout/a.json", "abc-123")).toBe("abc-123");
  });

  it("uses normalized relative path when id missing", () => {
    expect(ki.noteId("/takeout", "/takeout/Keep/note.json", null)).toBe("Keep/note.json");
  });
});
