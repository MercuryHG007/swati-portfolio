import { describe, expect, it } from "vitest";
import { getPrevNext } from "./prev-next";

describe("getPrevNext", () => {
  const items = ["a", "b", "c"];

  it("has no prev on the first item", () => {
    expect(getPrevNext(items, 0)).toEqual({ prev: null, next: "b" });
  });

  it("returns both neighbours in the middle", () => {
    expect(getPrevNext(items, 1)).toEqual({ prev: "a", next: "c" });
  });

  it("has no next on the last item", () => {
    expect(getPrevNext(items, 2)).toEqual({ prev: "b", next: null });
  });

  it("returns null when there is nothing to page through", () => {
    expect(getPrevNext(["a"], 0)).toBeNull();
    expect(getPrevNext([], 0)).toBeNull();
  });

  it("returns null when the current item is not in the list", () => {
    expect(getPrevNext(items, -1)).toBeNull();
  });
});
