import test from "node:test";
import assert from "node:assert/strict";
import { LESSONS, ROUTES } from "../src/lessonData.js";
import { createInitialTerminalState } from "../src/terminalEngine.js";
import { loadSavedState, sanitizeProgress, saveState, STORAGE_KEY } from "../src/persistence.js";

const lessonIds = LESSONS.map(({ id }) => id);
const routeIds = ROUTES.map(({ id }) => id);

test("表示中レッスンと最高到達位置を分離し、過去表示でアンロック状態を失わない", () => {
  const progress = sanitizeProgress({
    highestLesson: 4,
    viewedLesson: 1,
    completed: lessonIds.slice(0, 4),
  }, lessonIds, routeIds);
  assert.equal(progress.viewedLesson, 1);
  assert.equal(progress.highestLesson, 4);
  assert.deepEqual(progress.completed, lessonIds.slice(0, 4));
});

test("改ざんされた飛び越し進捗と不正な疑似FSを安全な状態へ戻す", () => {
  const storage = {
    getItem() {
      return JSON.stringify({
        version: 2,
        highestLesson: 6,
        viewedLesson: 5,
        completed: [lessonIds[5]],
        selectedRoute: "unknown",
        guidedState: { cwd: "/etc", directories: ["/etc"], files: { "/etc/passwd": "x" } },
      });
    },
  };
  const loaded = loadSavedState(storage, lessonIds, routeIds);
  assert.deepEqual(loaded.progress.completed, []);
  assert.equal(loaded.progress.selectedRoute, null);
  assert.equal(loaded.guidedState.cwd, "/home/student");
});

test("localStorage書き込み拒否を例外にせずfalseで返す", () => {
  const storage = { setItem() { throw new Error("quota"); } };
  assert.equal(saveState(storage, { progress: {}, freeState: createInitialTerminalState() }), false);
});

test("再読込時は表示中レッスンの安全な開始状態に戻す", () => {
  const storage = {
    getItem() {
      return JSON.stringify({
        version: 2,
        highestLesson: 3,
        viewedLesson: 3,
        completed: lessonIds.slice(0, 3),
        guidedState: createInitialTerminalState(),
      });
    },
  };
  const loaded = loadSavedState(storage, lessonIds, routeIds);
  assert.equal(loaded.progress.viewedLesson, 3);
  assert.equal(loaded.guidedState.cwd, "/home/student/projects");
});

test("保存文字列が現実的な上限を超えた場合は読み込まない", () => {
  const storage = { getItem(key) { assert.equal(key, STORAGE_KEY); return "x".repeat(250_001); } };
  const loaded = loadSavedState(storage, lessonIds, routeIds);
  assert.equal(loaded.progress.highestLesson, 0);
});
