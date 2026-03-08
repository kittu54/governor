import { describe, expect, it } from "vitest";

import handler, { buildApp } from "../src/app";

describe("vercel serverless exports", () => {
  it("exports a default request handler for Vercel", () => {
    expect(typeof handler).toBe("function");
  });

  it("still exports buildApp factory", () => {
    expect(typeof buildApp).toBe("function");
  });
});
