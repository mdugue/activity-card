import { describe, expect, test } from "bun:test";

import { horizonTitleSize } from "./photo-theme";

describe("horizonTitleSize", () => {
  test("fills one line for a mid-length title", () => {
    expect(horizonTitleSize("Sellaronda", 920)).toBe(184);
  });

  test("caps short titles", () => {
    expect(horizonTitleSize("Alp", 920)).toBe(300);
  });

  test("keeps long titles legible and lets them wrap", () => {
    expect(
      horizonTitleSize("Morning ride over four Dolomite passes", 920)
    ).toBe(120);
  });
});
