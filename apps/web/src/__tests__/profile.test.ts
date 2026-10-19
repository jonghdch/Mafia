import { describe, expect, it, vi } from "vitest";
import { PROFILE_KEY, hasValidProfile, loadProfile, saveProfile, validateCharacter, validateNickname } from "../lib/profile";

describe("profile storage", () => {
  it("round-trips a profile", () => {
    const p = { id: "a", nickname: "민지", photo: null, characters: [{ id: "c", name: "서린", intro: "", personality: "", photo: null }] };
    expect(saveProfile(p)).toBe(true);
    expect(loadProfile()).toEqual(p);
  });

  it("returns null when nothing is stored", () => {
    expect(loadProfile()).toBeNull();
  });

  it("falls back to null on corrupted JSON", () => {
    window.localStorage.setItem(PROFILE_KEY, "{not json");
    expect(loadProfile()).toBeNull();
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify({ nickname: 3 }));
    expect(loadProfile()).toBeNull();
  });

  it("does not throw when storage is unavailable", () => {
    const get = vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const set = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(loadProfile()).toBeNull();
    expect(saveProfile({ id: "a", nickname: "민지", photo: null, characters: [] })).toBe(false);
    get.mockRestore();
    set.mockRestore();
  });
});

describe("validation", () => {
  it("nickname is 2-10 chars after trim", () => {
    expect(validateNickname("a")).not.toBeNull();
    expect(validateNickname("  a  ")).not.toBeNull();
    expect(validateNickname(" ab ")).toBeNull();
    expect(validateNickname("a".repeat(10))).toBeNull();
    expect(validateNickname("a".repeat(11))).not.toBeNull();
  });

  it("profile with invalid nickname is not valid", () => {
    expect(hasValidProfile({ id: "a", nickname: "x", photo: null, characters: [] })).toBe(false);
    expect(hasValidProfile(null)).toBe(false);
  });

  it("character limits", () => {
    expect(validateCharacter({ name: "", intro: "", personality: "" }).name).toBeDefined();
    expect(validateCharacter({ name: "a".repeat(13), intro: "", personality: "" }).name).toBeDefined();
    expect(validateCharacter({ name: "a", intro: "a".repeat(41), personality: "" }).intro).toBeDefined();
    expect(validateCharacter({ name: "a", intro: "", personality: "a".repeat(201) }).personality).toBeDefined();
    expect(validateCharacter({ name: "a", intro: "a".repeat(40), personality: "a".repeat(200) })).toEqual({});
  });
});
