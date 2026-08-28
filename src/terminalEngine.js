export const INITIAL_FILE_SYSTEM = Object.freeze({
  directories: [
    "/home/student",
    "/home/student/projects",
    "/home/student/images",
  ],
  files: {
    "/home/student/README.txt": "ようこそ！ここは安全な練習用ターミナルです。",
    "/home/student/notes.txt": "コマンドは半角英数字で入力します。",
    "/home/student/projects/guide.txt": "小さく作って、動かして、確かめよう。",
  },
});

export const VIRTUAL_ROOT = "/home/student";
export const TERMINAL_LIMITS = Object.freeze({ inputLength: 200, directories: 100, files: 200, fileContentLength: 10_000 });

export function createInitialTerminalState() {
  return {
    cwd: "/home/student",
    directories: [...INITIAL_FILE_SYSTEM.directories],
    files: { ...INITIAL_FILE_SYSTEM.files },
  };
}

export function createLessonTerminalState(lessonIndex) {
  const state = createInitialTerminalState();
  if (lessonIndex >= 3) state.cwd = "/home/student/projects";
  if (lessonIndex >= 4) state.directories.push("/home/student/projects/sandbox");
  if (lessonIndex >= 5) state.files["/home/student/projects/memo.txt"] = "";
  return state;
}

function normalizePath(rawPath, cwd) {
  const expanded = rawPath === "~" || rawPath.startsWith("~/")
    ? `/home/student${rawPath.slice(1)}`
    : rawPath;
  const base = expanded.startsWith("/") ? [] : cwd.split("/").filter(Boolean);

  for (const segment of expanded.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") base.pop();
    else base.push(segment);
  }

  return `/${base.join("/")}`;
}

function isInsideVirtualRoot(path) {
  return path === VIRTUAL_ROOT || path.startsWith(`${VIRTUAL_ROOT}/`);
}

function resolvePath(rawPath, cwd) {
  const path = normalizePath(rawPath, cwd);
  return isInsideVirtualRoot(path) ? path : null;
}

function validateNewName(name) {
  if (!name || name.length > 64 || name === "." || name === ".." || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) {
    return "名前は64文字以内の半角英数字で始め、.-_ だけを組み合わせてください。";
  }
  return null;
}

export function sanitizeTerminalState(candidate, fallback = createInitialTerminalState()) {
  try {
    if (!candidate || !Array.isArray(candidate.directories) || typeof candidate.files !== "object" || candidate.files === null) throw new Error("invalid");
    if (candidate.directories.length > TERMINAL_LIMITS.directories) throw new Error("too many directories");
    const directories = [...new Set(candidate.directories)];
    if (directories.length !== candidate.directories.length || !directories.includes(VIRTUAL_ROOT)) throw new Error("invalid directories");
    const orderedDirectories = [...directories].sort((left, right) => left.length - right.length);
    for (const path of orderedDirectories) {
      if (typeof path !== "string" || !isInsideVirtualRoot(path)) throw new Error("outside root");
      if (path !== VIRTUAL_ROOT) {
        const parent = path.slice(0, path.lastIndexOf("/"));
        if (!directories.includes(parent)) throw new Error("missing parent");
      }
    }
    if (typeof candidate.cwd !== "string" || !directories.includes(candidate.cwd)) throw new Error("invalid cwd");
    const entries = Object.entries(candidate.files);
    if (entries.length > TERMINAL_LIMITS.files) throw new Error("too many files");
    const files = {};
    for (const [path, content] of entries) {
      const parent = path.slice(0, path.lastIndexOf("/"));
      if (!isInsideVirtualRoot(path) || directories.includes(path) || !directories.includes(parent) || typeof content !== "string" || content.length > TERMINAL_LIMITS.fileContentLength) throw new Error("invalid file");
      files[path] = content;
    }
    return { cwd: candidate.cwd, directories, files };
  } catch {
    return { cwd: fallback.cwd, directories: [...fallback.directories], files: { ...fallback.files } };
  }
}

function error(message, suggestion) {
  return { ok: false, lines: [message, `次の一手: ${suggestion}`] };
}

function listDirectory(state, directory) {
  const prefix = directory === "/" ? "/" : `${directory}/`;
  const items = new Map();

  for (const path of state.directories) {
    if (!path.startsWith(prefix) || path === directory) continue;
    const name = path.slice(prefix.length).split("/")[0];
    if (name) items.set(name, "directory");
  }
  for (const path of Object.keys(state.files)) {
    if (!path.startsWith(prefix)) continue;
    const remainder = path.slice(prefix.length);
    const name = remainder.split("/")[0];
    if (name && !items.has(name)) items.set(name, remainder.includes("/") ? "directory" : "file");
  }

  return [...items.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, type]) => ({ name, type }));
}

export function runCommand(previousState, input) {
  const safePreviousState = sanitizeTerminalState(previousState);
  const state = { ...safePreviousState, directories: [...safePreviousState.directories], files: { ...safePreviousState.files } };
  if (typeof input !== "string" || input.length > TERMINAL_LIMITS.inputLength) {
    return { state, result: error(`コマンドは${TERMINAL_LIMITS.inputLength}文字以内で入力してください。`, "短いコマンドを1つずつ試しましょう。") };
  }
  const trimmed = input.trim();
  if (!trimmed) return { state, result: error("コマンドが入力されていません。", "例を見て、半角でコマンドを入力しましょう。") };

  const [command, ...args] = trimmed.split(/\s+/);
  const target = args[0];

  if (command === "pwd") {
    if (args.length) return { state, result: error("pwd に引数は必要ありません。", "pwd だけを入力してみましょう。") };
    return { state, result: { ok: true, lines: [state.cwd] } };
  }

  if (command === "ls") {
    if (args.length > 1) return { state, result: error("ls で確認できる場所は1つずつです。", "ls または ls projects を試しましょう。") };
    const directory = target ? resolvePath(target, state.cwd) : state.cwd;
    if (!directory) return { state, result: error("練習用ホームの外は確認できません。", "pwd で現在地を確認しましょう。") };
    if (!state.directories.includes(directory)) {
      return { state, result: error(`「${target}」というフォルダは見つかりません。`, "ls で現在地の名前を確認しましょう。") };
    }
    const items = listDirectory(state, directory);
    return {
      state,
      result: {
        ok: true,
        lines: [items.length ? items.map(({ name, type }) => type === "directory" ? `${name}/` : name).join("    ") : "（空のフォルダです）"],
        items,
      },
    };
  }

  if (command === "cd") {
    if (!target) return { state, result: error("移動先が指定されていません。", "cd projects のようにフォルダ名を続けましょう。") };
    if (args.length > 1) return { state, result: error("移動先は1つだけ指定できます。", "cd のあとにフォルダ名を1つ入力しましょう。") };
    const directory = resolvePath(target, state.cwd);
    if (!directory) return { state, result: error("練習用ホームの外へは移動できません。", "cd ~ でホームへ戻りましょう。") };
    if (!state.directories.includes(directory)) {
      return { state, result: error(`「${target}」というフォルダは見つかりません。`, "ls で移動できるフォルダを確認しましょう。") };
    }
    state.cwd = directory;
    return { state, result: { ok: true, lines: [`${directory} に移動しました。`] } };
  }

  if (command === "mkdir") {
    if (!target) return { state, result: error("フォルダ名が指定されていません。", "mkdir sandbox のように名前を続けましょう。") };
    if (args.length > 1) return { state, result: error("この練習ではフォルダを1つずつ作ります。", "mkdir のあとに名前を1つ入力しましょう。") };
    const invalidName = validateNewName(target);
    if (invalidName) return { state, result: error(invalidName, "mkdir sandbox のように短い名前を1つ指定しましょう。") };
    if (!state.directories.includes(state.cwd)) return { state, result: error("現在地が見つからないため作成できません。", "cd ~ でホームへ戻りましょう。") };
    if (state.directories.length >= TERMINAL_LIMITS.directories) return { state, result: error("作成できるフォルダ数の上限に達しました。", "不要な練習は進捗リセットで整理できます。") };
    const path = resolvePath(target, state.cwd);
    if (state.directories.includes(path) || Object.hasOwn(state.files, path)) {
      return { state, result: error(`「${target}」はすでに存在します。`, "別の名前にするか、ls で中身を確認しましょう。") };
    }
    state.directories.push(path);
    return { state, result: { ok: true, lines: [`フォルダ「${target}」を作成しました。`] } };
  }

  if (command === "touch") {
    if (!target) return { state, result: error("ファイル名が指定されていません。", "touch memo.txt のように名前を続けましょう。") };
    if (args.length > 1) return { state, result: error("この練習ではファイルを1つずつ作ります。", "touch のあとに名前を1つ入力しましょう。") };
    const invalidName = validateNewName(target);
    if (invalidName) return { state, result: error(invalidName, "touch memo.txt のように短い名前を1つ指定しましょう。") };
    if (!state.directories.includes(state.cwd)) return { state, result: error("現在地が見つからないため作成できません。", "cd ~ でホームへ戻りましょう。") };
    const path = resolvePath(target, state.cwd);
    if (state.directories.includes(path)) {
      return { state, result: error(`「${target}」はフォルダの名前です。`, "別のファイル名を入力しましょう。") };
    }
    if (!Object.hasOwn(state.files, path) && Object.keys(state.files).length >= TERMINAL_LIMITS.files) return { state, result: error("作成できるファイル数の上限に達しました。", "不要な練習は進捗リセットで整理できます。") };
    state.files[path] ??= "";
    return { state, result: { ok: true, lines: [`ファイル「${target}」を用意しました。`] } };
  }

  if (command === "cat") {
    if (!target) return { state, result: error("読むファイルが指定されていません。", "cat guide.txt のようにファイル名を続けましょう。") };
    if (args.length > 1) return { state, result: error("この練習ではファイルを1つずつ読みます。", "cat のあとにファイル名を1つ入力しましょう。") };
    const path = resolvePath(target, state.cwd);
    if (!path) return { state, result: error("練習用ホームの外のファイルは読めません。", "pwd と ls で読めるファイルを確認しましょう。") };
    if (!Object.hasOwn(state.files, path)) {
      return { state, result: error(`「${target}」というファイルは見つかりません。`, "ls で読めるファイル名を確認しましょう。") };
    }
    return { state, result: { ok: true, lines: [state.files[path] || "（空のファイルです）"] } };
  }

  if (command === "clear") {
    return { state, result: { ok: true, lines: [], clear: true } };
  }

  if (command === "help") {
    return { state, result: { ok: true, lines: ["使えるコマンド: pwd / ls / cd / mkdir / touch / cat / clear / help"] } };
  }

  return { state, result: error(`「${command}」はこの練習環境では使えません。`, "help で使えるコマンドを確認しましょう。") };
}
