import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Segmented } from "../components/Segmented";
import { PROFILE_KEY } from "../lib/profile";
import { compositionFor } from "../lib/rooms";
import { ROLE_TABLES } from "@mafia/engine";
import { renderApp, seedProfile } from "../test/utils";

afterEach(() => vi.restoreAllMocks());

const loc = () => screen.getByTestId("loc").textContent;
const stored = () => JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? "null");
const SAVE_FAILED = "저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.";
const failStorage = () =>
  vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });

describe("home keys while the setup dialog is open", () => {
  it("ArrowDown does not steal focus from the dialog input", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await user.click(screen.getByRole("link", { name: /방 만들기/ }));
    const input = screen.getByLabelText("닉네임");
    expect(input).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveFocus();
  });
});

describe("dialog closing and focus", () => {
  it("a double click on 저장 adds the character once", async () => {
    const user = userEvent.setup();
    seedProfile();
    renderApp("/profile");
    await user.click(screen.getByRole("button", { name: /추가/ }));
    await user.type(screen.getByLabelText("이름"), "한서린");
    const save = within(screen.getByRole("dialog")).getByRole("button", { name: "저장" });
    fireEvent.click(save);
    fireEvent.click(save);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(stored().characters).toHaveLength(1);
    expect(screen.getAllByText("한서린")).toHaveLength(1);
  });

  it("focus stays inside the dialog after 삭제 swaps to the confirm step", async () => {
    const user = userEvent.setup();
    seedProfile({ characters: [{ id: "c1", name: "한서린", intro: "", personality: "", photo: null }] });
    renderApp("/profile");
    await user.click(screen.getByRole("button", { name: "한서린 편집" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    await user.tab();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });
});

describe("character changes persist immediately", () => {
  it("adding a character is stored without pressing the page 저장, even with an invalid nickname", async () => {
    const user = userEvent.setup();
    renderApp("/profile");
    await user.click(screen.getByRole("button", { name: /추가/ }));
    await user.type(screen.getByLabelText("이름"), "한서린");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(stored().characters.map((c: { name: string }) => c.name)).toEqual(["한서린"]);
  });

  it("deleting keeps the stored nickname and removes the character", async () => {
    const user = userEvent.setup();
    seedProfile({ characters: [{ id: "c1", name: "한서린", intro: "", personality: "", photo: null }] });
    renderApp("/profile");
    await user.type(screen.getByLabelText("닉네임"), "바뀐이름");
    await user.click(screen.getByRole("button", { name: "한서린 편집" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "삭제" }));
    await user.click(within(dialog).getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(stored().characters).toEqual([]);
    expect(stored().nickname).toBe("민지");
  });
});

describe("storage failure", () => {
  it("setup dialog shows an error and stays open", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await user.click(screen.getByRole("link", { name: /방 만들기/ }));
    await user.type(screen.getByLabelText("닉네임"), "민지");
    failStorage();
    await user.click(screen.getByRole("button", { name: "저장하고 계속" }));
    expect(screen.getByText(SAVE_FAILED)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(loc()).toBe("/");
  });

  it("profile page shows an error and does not navigate", async () => {
    const user = userEvent.setup();
    seedProfile();
    renderApp("/profile?next=/rooms");
    failStorage();
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(screen.getByText(SAVE_FAILED)).toBeInTheDocument();
    expect(loc()).toBe("/profile?next=/rooms");
  });

  it("character dialog shows an error and stays open", async () => {
    const user = userEvent.setup();
    seedProfile();
    renderApp("/profile");
    await user.click(screen.getByRole("button", { name: /추가/ }));
    await user.type(screen.getByLabelText("이름"), "한서린");
    failStorage();
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(within(dialog).getByText(SAVE_FAILED)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("compositionFor", () => {
  it("returns the engine's table entry", () => {
    expect(compositionFor("classic", 6)).toBe(ROLE_TABLES.classic[6]);
    expect(compositionFor("basic", 8)).toBe(ROLE_TABLES.basic[8]);
  });
});

describe("Segmented locked option", () => {
  function Harness({ onLocked }: { onLocked: () => void }) {
    const [v, setV] = useState("a");
    return (
      <Segmented
        name="m"
        legend="모드"
        value={v}
        onChange={setV}
        onLockedClick={onLocked}
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
          { value: "s", label: "스토리", locked: true },
        ]}
      />
    );
  }

  it("is focusable, aria-disabled, never selected, and reports clicks", async () => {
    const user = userEvent.setup();
    const onLocked = vi.fn();
    render(<Harness onLocked={onLocked} />);
    const locked = screen.getByRole("radio", { name: /스토리/ });
    expect(locked).toHaveAttribute("aria-disabled", "true");
    expect(locked).not.toBeDisabled();
    await user.click(locked);
    expect(onLocked).toHaveBeenCalledTimes(1);
    expect(locked).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "A" })).toBeChecked();
  });

  it("arrow navigation landing on it and Enter both report", async () => {
    const user = userEvent.setup();
    const onLocked = vi.fn();
    render(<Harness onLocked={onLocked} />);
    screen.getByRole("radio", { name: "B" }).focus();
    await user.click(screen.getByRole("radio", { name: "B" }));
    onLocked.mockClear();
    await user.keyboard("{ArrowRight}");
    expect(onLocked).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("radio", { name: /스토리/ })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "B" })).toBeChecked();
    await user.keyboard("{Enter}");
    expect(onLocked).toHaveBeenCalledTimes(2);
  });
});
