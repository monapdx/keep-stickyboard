import { describe, it, expect } from "vitest";
import { escapeRegExp } from "./escapeRegExp.js";

describe("escapeRegExp", () => {
  it("escapes metacharacters so RegExp does not throw", () => {
    const q = "a+b(c)";
    expect(() => new RegExp(`(${escapeRegExp(q)})`, "gi")).not.toThrow();
  });

  it("treats escaped query as literal substring", () => {
    const q = "1.2";
    const re = new RegExp(`(${escapeRegExp(q)})`, "gi");
    expect("v1.2.3".replace(re, "X")).toBe("vX.3");
  });
});
