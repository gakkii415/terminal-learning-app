// @vitest-environment jsdom
import React, { StrictMode, act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { App } from "../src/App.jsx";
import { LESSONS } from "../src/lessonData.js";

function buttonWithText(container, text) {
  return [...container.querySelectorAll("button")].find((button) => button.textContent.includes(text));
}

async function enterCommand(container, value) {
  await setCommandInput(container, value);
  const input = container.querySelector("#terminal-input");
  await act(async () => {
    input.closest("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

async function setCommandInput(container, value) {
  const input = container.querySelector("#terminal-input");
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("App", () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    Element.prototype.scrollIntoView = vi.fn(() => Promise.resolve());
    root = createRoot(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root.unmount());
    }
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  test("StrictModeのeffect再実行でも初期画面が落ちずに表示される", async () => {
    await act(async () => {
      root.render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
    });

    expect(container.textContent).toContain("はじめてのターミナル");
    expect(container.textContent).toContain("現在地を知る（pwd）");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  test("自由練習の現在地を変更してもガイドのレッスン状態に影響しない", async () => {
    await act(async () => root.render(<StrictMode><App /></StrictMode>));
    await act(async () => buttonWithText(container, "自由練習").click());
    await enterCommand(container, "cd projects");
    expect(container.textContent).toContain("/home/student/projects に移動しました。");

    await act(async () => buttonWithText(container, "レッスンに戻る").click());
    await enterCommand(container, "pwd");
    expect(container.textContent).toContain("/home/student");
    expect(container.textContent).toContain("できました！");
  });

  test("実行ボタンのクリックでpwdを実行してレッスンを完了できる", async () => {
    await act(async () => root.render(<StrictMode><App /></StrictMode>));
    const submitButton = buttonWithText(container, "実行");
    expect(submitButton.disabled).toBe(true);

    await setCommandInput(container, "pwd");
    expect(submitButton.disabled).toBe(false);
    await act(async () => submitButton.click());

    expect(container.textContent).toContain("/home/student");
    expect(container.textContent).toContain("できました！");
    expect(container.querySelector("#terminal-input").value).toBe("");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });
    expect(container.querySelector(".terminal-body").hasAttribute("aria-live")).toBe(false);
    expect(container.querySelector(".terminal .sr-only[role='status']").textContent).toContain("実行結果");
  });

  test("基礎完了後に選んだルートの目的と実行可能な入口課題を表示する", async () => {
    localStorage.setItem("terminal-steps-progress-v1", JSON.stringify({
      version: 2,
      highestLesson: LESSONS.length,
      viewedLesson: LESSONS.length - 1,
      completed: LESSONS.map(({ id }) => id),
      selectedRoute: null,
    }));
    await act(async () => root.render(<StrictMode><App /></StrictMode>));
    await act(async () => buttonWithText(container, "AIでコードを書く").click());
    expect(container.textContent).toContain("最初の一歩");
    expect(container.textContent).toContain("mkdir ai-playground");
    const guide = container.querySelector(".route-guide");
    expect(guide.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(guide);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "smooth" });
    expect([...container.querySelectorAll("[role='status']")].some((status) => status.textContent.includes("AIでコードを書くを選びました"))).toBe(true);

    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    await act(async () => buttonWithText(container, "Gitを使いこなす").click());
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
    expect(document.activeElement).toBe(container.querySelector(".route-guide"));
  });

  test("localStorageへの保存が拒否されても初期表示を維持する", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    await act(async () => root.render(<StrictMode><App /></StrictMode>));
    expect(container.textContent).toContain("はじめてのターミナル");
  });
});
