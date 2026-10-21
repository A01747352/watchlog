import { safeNextPath } from "./auth-providers";

describe("safeNextPath", () => {
  it.each([
    ["/title/movie/42", "/title/movie/42"],
    ["/?q=1", "/?q=1"],
    [undefined, "/"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    [["/a", "/b"], "/a"],
  ] as const)("%j → %j", (input, expected) => {
    expect(safeNextPath(input as string | string[] | undefined)).toBe(expected);
  });
});
