import test from "node:test";
import assert from "node:assert/strict";
import { createInitialTerminalState, runCommand, TERMINAL_LIMITS } from "../src/terminalEngine.js";

function execute(state, input) {
  return runCommand(state, input);
}

test("基礎6コマンドを順に安全な疑似FS上で実行できる", () => {
  let state = createInitialTerminalState();
  let outcome = execute(state, "pwd");
  assert.deepEqual(outcome.result.lines, ["/home/student"]);

  outcome = execute(outcome.state, "ls");
  assert.match(outcome.result.lines[0], /projects\//);

  outcome = execute(outcome.state, "cd projects");
  assert.equal(outcome.state.cwd, "/home/student/projects");

  outcome = execute(outcome.state, "mkdir sandbox");
  assert.ok(outcome.state.directories.includes("/home/student/projects/sandbox"));

  outcome = execute(outcome.state, "touch memo.txt");
  assert.ok(Object.hasOwn(outcome.state.files, "/home/student/projects/memo.txt"));

  outcome = execute(outcome.state, "cat guide.txt");
  assert.deepEqual(outcome.result.lines, ["小さく作って、動かして、確かめよう。"]);
});

test("不正コマンドは状態を変更せず、日本語の次の一手を返す", () => {
  const state = createInitialTerminalState();
  const snapshot = structuredClone(state);
  const outcome = execute(state, "rm -rf /");
  assert.equal(outcome.result.ok, false);
  assert.match(outcome.result.lines[0], /使えません/);
  assert.match(outcome.result.lines[1], /次の一手/);
  assert.deepEqual(outcome.state, snapshot);
});

test("不正パスと引数不足は疑似FSを壊さない", () => {
  const state = createInitialTerminalState();
  const missingPath = execute(state, "cd unknown");
  assert.equal(missingPath.result.ok, false);
  assert.equal(missingPath.state.cwd, "/home/student");

  const missingArgument = execute(missingPath.state, "mkdir");
  assert.equal(missingArgument.result.ok, false);
  assert.deepEqual(missingArgument.state.directories, state.directories);
});

test("相対パスの .. と ~ を疑似環境内で正規化する", () => {
  let outcome = execute(createInitialTerminalState(), "cd projects");
  outcome = execute(outcome.state, "cd ..");
  assert.equal(outcome.state.cwd, "/home/student");
  outcome = execute(outcome.state, "cd ~/images");
  assert.equal(outcome.state.cwd, "/home/student/images");
});

test("仮想ルート外への移動を拒否する", () => {
  const state = createInitialTerminalState();
  const outcome = execute(state, "cd ../../..");
  assert.equal(outcome.result.ok, false);
  assert.match(outcome.result.lines[0], /外へは移動できません/);
  assert.deepEqual(outcome.state, state);
});

test("存在しない親を持つghostファイルや不正名を作らない", () => {
  const state = createInitialTerminalState();
  const ghostFile = execute(state, "touch ghost/child.txt");
  assert.equal(ghostFile.result.ok, false);
  assert.equal(Object.hasOwn(ghostFile.state.files, "/home/student/ghost/child.txt"), false);

  const invalidDirectory = execute(state, "mkdir ../outside");
  assert.equal(invalidDirectory.result.ok, false);
  assert.deepEqual(invalidDirectory.state.directories, state.directories);
});

test("入力長とファイル数の上限で状態肥大化を防ぐ", () => {
  const state = createInitialTerminalState();
  const longInput = execute(state, `touch ${"a".repeat(TERMINAL_LIMITS.inputLength)}`);
  assert.equal(longInput.result.ok, false);
  assert.match(longInput.result.lines[0], /文字以内/);

  const fullState = { ...state, files: { ...state.files } };
  for (let index = Object.keys(fullState.files).length; index < TERMINAL_LIMITS.files; index += 1) {
    fullState.files[`/home/student/file-${index}.txt`] = "";
  }
  const overLimit = execute(fullState, "touch overflow.txt");
  assert.equal(overLimit.result.ok, false);
  assert.match(overLimit.result.lines[0], /上限/);
});
