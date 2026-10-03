import { describe, expect, it } from "vitest";
import { htmlToText } from "../src/services/htmlText";
import { assertPublicUrl } from "../src/services/publicUrl";

describe("htmlToText", () => {
  it("drops scripts and tags", () => {
    const text = htmlToText("<p>Hello</p><script>alert(1)</script><div>there</div>");
    expect(text).toContain("Hello");
    expect(text).toContain("there");
    expect(text).not.toContain("alert");
    expect(text).not.toContain("<script>");
  });
});

describe("assertPublicUrl", () => {
  it("rejects local and private addresses", async () => {
    await expect(assertPublicUrl("http://127.0.0.1/latest")).rejects.toThrow(/not allowed/);
    await expect(assertPublicUrl("http://localhost/admin")).rejects.toThrow(/not allowed/);
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow(/http/);
    await expect(assertPublicUrl("http://192.168.0.8/secret")).rejects.toThrow(/not allowed/);
  });
});
