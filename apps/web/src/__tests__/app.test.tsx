import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp, seedProfile } from "../test/utils";

const loc = () => screen.getByTestId("loc").textContent;

describe("profile guard", () => {
  it("shows the setup dialog over /rooms without a profile; saving closes it", async () => {
    const user = userEvent.setup();
    renderApp("/rooms");
    expect(loc()).toBe("/rooms");
    const dialog = screen.getByRole("dialog", { name: "프로필 만들기" });
    const save = within(dialog).getByRole("button", { name: "저장하고 계속" });
    expect(save).toBeDisabled();
    await user.type(within(dialog).getByLabelText("닉네임"), "민지");
    expect(save).toBeEnabled();
    await user.click(save);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(loc()).toBe("/rooms");
  });

  it("cancelling the dialog on /create goes home", async () => {
    const user = userEvent.setup();
    renderApp("/create");
    expect(loc()).toBe("/create");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "취소" }));
    expect(loc()).toBe("/");
  });

  it("direct /rooms: Esc also goes home", async () => {
    const user = userEvent.setup();
    renderApp("/rooms");
    await user.keyboard("{Escape}");
    expect(loc()).toBe("/");
  });

  it("lets a valid profile through", () => {
    seedProfile();
    renderApp("/create");
    expect(loc()).toBe("/create");
  });

  it("treats an invalid stored nickname as no profile", () => {
    seedProfile({ nickname: "x" });
    renderApp("/rooms");
    expect(screen.getByRole("dialog", { name: "프로필 만들기" })).toBeInTheDocument();
  });
});

describe("nickname validation UI", () => {
  it("shows an inline message and keeps save disabled", async () => {
    const user = userEvent.setup();
    renderApp("/profile");
    await user.type(screen.getByLabelText("닉네임"), "a");
    expect(screen.getByText("닉네임은 2~10자로 입력해 주세요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("opens the character dialog and adds a character", async () => {
    const user = userEvent.setup();
    renderApp("/profile");
    await user.click(screen.getByRole("button", { name: /추가/ }));
    const dialog = screen.getByRole("dialog", { name: "캐릭터 편집" });
    await user.type(screen.getByLabelText("이름"), "한서린");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("한서린")).toBeInTheDocument();
  });
});

describe("home keyboard navigation", () => {
  it("ArrowDown then Enter goes to 방 들어가기", async () => {
    const user = userEvent.setup();
    seedProfile();
    renderApp("/");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(loc()).toBe("/rooms");
  });

  it("Enter alone selects the first item", async () => {
    const user = userEvent.setup();
    seedProfile();
    renderApp("/");
    await user.keyboard("{Enter}");
    expect(loc()).toBe("/create");
  });

  it("without a profile, clicking 방 만들기 opens the dialog and does not navigate", async () => {
    const user = userEvent.setup();
    renderApp("/");
    expect(screen.getByRole("link", { name: "프로필 만들기" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /방 만들기/ }));
    expect(screen.getByRole("dialog", { name: "프로필 만들기" })).toBeInTheDocument();
    expect(loc()).toBe("/");
  });

  it("saving in the dialog navigates to the chosen route", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await user.click(screen.getByRole("link", { name: /방 만들기/ }));
    await user.type(screen.getByLabelText("닉네임"), "민지");
    await user.click(screen.getByRole("button", { name: "저장하고 계속" }));
    expect(loc()).toBe("/create");
  });

  it("cancelling stays on home and returns focus to the menu item (keyboard)", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(loc()).toBe("/");
    await user.click(screen.getByRole("button", { name: "취소" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(loc()).toBe("/");
    expect(screen.getByRole("link", { name: /방 들어가기/ })).toHaveFocus();
  });

  it("지난 사건 일지 does not need a profile", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await user.click(screen.getByRole("link", { name: /지난 사건 일지/ }));
    expect(loc()).toBe("/replays");
  });
});

describe("room list", () => {
  const rows = () => screen.getAllByRole("row").slice(1);

  it("private tab shows only private rooms", async () => {
    const user = userEvent.setup();
    seedProfile();
    renderApp("/rooms");
    expect(rows()).toHaveLength(8);
    await user.click(screen.getByLabelText("비공개"));
    expect(rows()).toHaveLength(4);
    rows().forEach((r) => expect(r).toHaveTextContent("비공개"));
  });

  it("'대기 중인 방만' hides full and in-game rooms", async () => {
    const user = userEvent.setup();
    seedProfile();
    renderApp("/rooms");
    await user.click(screen.getByLabelText("대기 중인 방만"));
    rows().forEach((r) => expect(r).toHaveTextContent("대기 중"));
    expect(rows()).toHaveLength(5);
  });

  it("disables full and in-game rooms", () => {
    seedProfile();
    renderApp("/rooms");
    expect(screen.getByRole("button", { name: "안개 낀 항구 들어가기" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "동아리 모임 들어가기" })).toBeDisabled();
  });

  it("wrong password shows a message, right password enters", async () => {
    const user = userEvent.setup();
    seedProfile();
    renderApp("/rooms");
    await user.click(screen.getByRole("button", { name: "우리끼리 한 판 들어가기" }));
    const input = screen.getByLabelText("비밀번호");
    await user.type(input, "9999");
    await user.click(screen.getByRole("button", { name: "입장" }));
    expect(screen.getByText("비밀번호가 맞지 않아요")).toBeInTheDocument();
    expect(loc()).toBe("/rooms");
    await user.clear(input);
    await user.type(input, "1234{Enter}");
    expect(loc()).toBe("/r/KLMN");
  });

  it("Escape closes the password dialog and returns focus", async () => {
    const user = userEvent.setup();
    seedProfile();
    renderApp("/rooms");
    const trigger = screen.getByRole("button", { name: "우리끼리 한 판 들어가기" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("모드 filter shows only basic rooms", async () => {
    const user = userEvent.setup();
    seedProfile();
    renderApp("/rooms");
    await user.selectOptions(screen.getByLabelText("모드"), "basic");
    expect(rows()).toHaveLength(2);
    rows().forEach((r) => expect(r).toHaveTextContent("베이직"));
    await user.selectOptions(screen.getByLabelText("모드"), "classic");
    expect(rows()).toHaveLength(6);
    rows().forEach((r) => expect(r).toHaveTextContent("클래식"));
  });

  it("joins by code", async () => {
    const user = userEvent.setup();
    seedProfile();
    renderApp("/rooms");
    await user.type(screen.getByLabelText("초대 코드"), "abcd");
    await user.click(screen.getByRole("button", { name: "참가" }));
    expect(loc()).toBe("/r/ABCD");
  });
});

describe("room create", () => {
  it("role preview follows capacity", async () => {
    const user = userEvent.setup();
    seedProfile();
    renderApp("/create");
    const comp = () => screen.getByTestId("composition").textContent;
    expect(comp()).toBe("마피아 2 · 의사 1 · 경찰 1 · 시민 4");
    await user.click(screen.getByLabelText("5명"));
    expect(comp()).toBe("마피아 1 · 의사 1 · 경찰 1 · 시민 2");
    await user.click(screen.getByLabelText("7명"));
    expect(comp()).toBe("마피아 2 · 의사 1 · 경찰 1 · 시민 3");
  });

  it("mode switch changes the role preview", async () => {
    const user = userEvent.setup();
    seedProfile();
    renderApp("/create");
    expect(screen.getByRole("radio", { name: "클래식" })).toBeChecked();
    await user.click(screen.getByLabelText("베이직"));
    expect(screen.getByTestId("composition").textContent).toBe("마피아 2 · 시민 6");
    await user.click(screen.getByLabelText("5명"));
    expect(screen.getByTestId("composition").textContent).toBe("마피아 1 · 시민 4");
    await user.click(screen.getByLabelText("클래식"));
    expect(screen.getByTestId("composition").textContent).toBe("마피아 1 · 의사 1 · 경찰 1 · 시민 2");
  });

  it("스토리 is locked: not selectable, shows a note when activated", async () => {
    const user = userEvent.setup();
    seedProfile();
    renderApp("/create");
    const story = screen.getByRole("radio", { name: /스토리/ });
    expect(story).not.toBeDisabled();
    expect(story).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByText("곧 열려요")).not.toBeInTheDocument();
    await user.click(screen.getByText("스토리"));
    expect(screen.getByText("곧 열려요")).toBeInTheDocument();
    expect(story).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "클래식" })).toBeChecked();
    expect(screen.getByTestId("composition").textContent).toBe("마피아 2 · 의사 1 · 경찰 1 · 시민 4");
  });

  it("map row is locked in classic and hidden in basic; 특수 규칙 stays locked", async () => {
    const user = userEvent.setup();
    seedProfile();
    renderApp("/create");
    expect(screen.getByRole("switch", { name: "맵 사용" })).toBeDisabled();
    expect(screen.getByText("특수 규칙")).toBeInTheDocument();
    expect(screen.getByText("암전 · 침묵 · 랜덤 버프/디버프")).toBeInTheDocument();
    await user.click(screen.getByLabelText("베이직"));
    expect(screen.queryByText("맵")).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByText("특수 규칙")).toBeInTheDocument();
  });

  it("single-option 테마 is plain text, not a radio", () => {
    seedProfile();
    renderApp("/create");
    expect(screen.getByText("안개 마을")).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "안개 마을" })).not.toBeInTheDocument();
  });

  it("password field only for private, needs 4 digits", async () => {
    const user = userEvent.setup();
    seedProfile();
    renderApp("/create");
    expect(screen.queryByLabelText("비밀번호")).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("비공개"));
    await user.type(screen.getByLabelText("비밀번호"), "12a3");
    expect(screen.getByLabelText("비밀번호")).toHaveValue("123");
    await user.click(screen.getByRole("button", { name: "방 만들기" }));
    expect(loc()).toBe("/create");
    await user.type(screen.getByLabelText("비밀번호"), "4");
    await user.click(screen.getByRole("button", { name: "방 만들기" }));
    expect(loc()).toMatch(/^\/r\/[A-Z]{4}$/);
  });
});

describe("placeholders", () => {
  it.each(["/replays", "/replays/1", "/terms", "/privacy", "/r/ABCD", "/nope"])("%s renders with a home link", (p) => {
    renderApp(p);
    expect(screen.getByRole("link", { name: "홈으로" })).toBeInTheDocument();
  });
});
