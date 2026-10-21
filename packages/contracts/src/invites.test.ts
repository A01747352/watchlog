import { describe, expect, it } from "vitest";

import { inviteCodeSchema, verifyInviteRequestSchema } from "./invites";

describe("inviteCodeSchema", () => {
  it.each(["bienvenida", "AbC_12-xy", "  espacios  "])("acepta %j", (code) => {
    expect(inviteCodeSchema.safeParse(code).success).toBe(true);
  });

  it("recorta espacios", () => {
    expect(inviteCodeSchema.parse("  hola1234 ")).toBe("hola1234");
  });

  it.each(["abc", "con espacio", "ñandú", "x".repeat(65), "<script>"])("rechaza %j", (code) => {
    expect(inviteCodeSchema.safeParse(code).success).toBe(false);
  });

  it("verifyInviteRequestSchema exige el campo code", () => {
    expect(verifyInviteRequestSchema.safeParse({}).success).toBe(false);
  });
});
