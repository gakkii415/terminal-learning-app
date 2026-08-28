import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BracketsCurly,
  Check,
  CircleNotch,
  Code,
  File,
  FileJs,
  GitBranch,
  Info,
  Lightbulb,
  Lock,
  Path,
  Question,
  TerminalWindow,
  Trash,
} from "@phosphor-icons/react";
import { LESSONS, ROUTES } from "./lessonData.js";
import { createInitialTerminalState, createLessonTerminalState, runCommand, TERMINAL_LIMITS } from "./terminalEngine.js";
import { loadSavedState, saveState, STORAGE_KEY } from "./persistence.js";

function RouteIcon({ id, size = 32 }) {
  if (id === "ai") return <BracketsCurly size={size} weight="bold" />;
  if (id === "git") return <GitBranch size={size} weight="bold" />;
  return <FileJs size={size} weight="bold" />;
}

function LessonSidebar({ progress, onLessonSelect }) {
  return (
    <aside className="lesson-sidebar" aria-label="基礎レッスン">
      <div className="brand-block">
        <div className="brand-icon"><TerminalWindow size={24} weight="bold" /></div>
        <div><h1>はじめてのターミナル</h1><p>全{LESSONS.length}レッスン</p></div>
      </div>
      <div className="mobile-progress-title">基礎レッスン <strong>{progress.viewedLesson + 1}/{LESSONS.length}</strong></div>
      <nav className="lesson-list">
        {LESSONS.map((lesson, index) => {
          const done = progress.completed.includes(lesson.id);
          const active = index === progress.viewedLesson;
          const locked = index > progress.highestLesson;
          return (
            <button
              className={`lesson-item ${active ? "active" : ""} ${done ? "done" : ""}`}
              key={lesson.id}
              disabled={locked}
              onClick={() => !locked && onLessonSelect(index)}
              aria-current={active ? "step" : undefined}
            >
              <span className="lesson-number">{done ? <Check size={15} weight="bold" /> : index + 1}</span>
              <span><strong>{lesson.title}（{lesson.command}）</strong>{active && <small>{lesson.task}</small>}</span>
            </button>
          );
        })}
      </nav>
      <div className="locked-lessons"><Lock size={18} /> 応用レッスン <span>準備中</span></div>
      <div className="about-card"><Question size={18} /><strong>このレッスンについて</strong><p>ここは実際のPCに触れない、安全な練習環境です。何度でも試せます。</p></div>
    </aside>
  );
}

function PathMap({ selectedRoute, unlocked, remaining, onSelect }) {
  return (
    <aside className="path-panel" aria-label="学習の進路">
      <div className="path-heading"><Path size={23} weight="bold" /><div><h2>この先の学びの道</h2><p>基礎を終えたら、興味のあるルートを選べます。</p></div></div>
      <div className={`route-map ${unlocked ? "unlocked" : ""}`}>
        <div className="route-origin"><TerminalWindow size={28} weight="bold" /><div><strong>ターミナルの基礎</strong><span>{unlocked ? "完了しました" : `あと${remaining}レッスン`}</span></div></div>
        <div className="route-line" />
        {ROUTES.map((route) => (
          <button
            className={`route-card ${route.tone} ${selectedRoute === route.id ? "selected" : ""}`}
            key={route.id}
            disabled={!unlocked}
            onClick={() => onSelect(route.id)}
          >
            <RouteIcon id={route.id} />
            <span><strong>{route.title}</strong><small>{route.description}</small><em>{route.label}</em></span>
            {selectedRoute === route.id && <Check className="route-check" size={18} weight="bold" />}
          </button>
        ))}
      </div>
      {!unlocked && <div className="path-lock"><Lock size={17} /> 基礎レッスン完了後に選べます</div>}
      {unlocked && selectedRoute && <p className="route-message">選択はいつでも変更できます。まずは興味から選んで大丈夫です。</p>}
    </aside>
  );
}

function Terminal({ entries, input, setInput, onSubmit, onReset }) {
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const latestEntry = entries.at(-1);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [entries]);

  return (
    <section className="terminal" onClick={() => inputRef.current?.focus()} aria-label="疑似ターミナル">
      <header><span><TerminalWindow size={21} weight="bold" /> ターミナル（シミュレーション）</span><button onClick={(event) => { event.stopPropagation(); onReset(); }}><Trash size={17} /> 履歴を消去</button></header>
      <div className="terminal-body">
        {entries.map((entry, index) => (
          <div className={`terminal-entry ${entry.ok ? "" : "error"}`} key={`${entry.input}-${index}`}>
            <div className="terminal-command"><span>$</span> <strong>{entry.input}</strong></div>
            {entry.lines.map((line, lineIndex) => <div className="terminal-output" key={lineIndex}>{line}</div>)}
          </div>
        ))}
        <form onSubmit={onSubmit} className="command-line">
          <label htmlFor="terminal-input">$</label>
          <input
            ref={inputRef}
            id="terminal-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
            maxLength={TERMINAL_LIMITS.inputLength}
            aria-label="コマンドを入力"
          />
          {!input && <span className="cursor" aria-hidden="true" />}
          <button
            className="command-submit"
            type="submit"
            disabled={!input.trim()}
            aria-label="入力したコマンドを実行"
          >
            実行
          </button>
        </form>
        <div ref={bottomRef} />
      </div>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {latestEntry ? `${latestEntry.ok ? "実行結果" : "エラー"}: ${latestEntry.lines.join(" ")}` : ""}
      </div>
      <footer><Lightbulb size={18} weight="fill" /> コマンドを半角で入力し、Enterキーで実行します。</footer>
    </section>
  );
}

export function App() {
  const [initialSaved] = useState(() => loadSavedState(localStorage, LESSONS.map(({ id }) => id), ROUTES.map(({ id }) => id)));
  const [progress, setProgress] = useState(initialSaved.progress);
  const [guidedState, setGuidedState] = useState(initialSaved.guidedState);
  const [freeState, setFreeState] = useState(initialSaved.freeState);
  const [guidedEntries, setGuidedEntries] = useState([]);
  const [freeEntries, setFreeEntries] = useState([]);
  const [input, setInput] = useState("");
  const [hintLevel, setHintLevel] = useState(0);
  const [lessonPassed, setLessonPassed] = useState(false);
  const [freeMode, setFreeMode] = useState(false);
  const [routeAnnouncement, setRouteAnnouncement] = useState("");
  const routeGuideRef = useRef(null);
  const successRef = useRef(null);
  const activeLesson = LESSONS[progress.viewedLesson];
  const basicsComplete = progress.completed.length === LESSONS.length;
  const selectedRoute = ROUTES.find((route) => route.id === progress.selectedRoute) ?? null;
  const terminalState = freeMode ? freeState : guidedState;
  const entries = freeMode ? freeEntries : guidedEntries;

  useEffect(() => {
    saveState(localStorage, { ...progress, guidedState, freeState });
  }, [progress, guidedState, freeState]);

  useEffect(() => {
    if (!selectedRoute || !routeGuideRef.current) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    routeGuideRef.current.focus({ preventScroll: true });
    routeGuideRef.current.scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" });
  }, [selectedRoute]);

  useEffect(() => {
    if (!lessonPassed || !successRef.current) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    successRef.current.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
  }, [lessonPassed]);

  const statusTitle = useMemo(() => {
    if (freeMode) return "自由練習モード";
    if (basicsComplete) return "基礎レッスン完了";
    return `${activeLesson.title}（${activeLesson.command}）`;
  }, [freeMode, basicsComplete, activeLesson]);

  function submitCommand(event) {
    event.preventDefault();
    const commandInput = input;
    const { state, result } = runCommand(terminalState, commandInput);
    if (freeMode) setFreeState(state);
    else setGuidedState(state);
    setInput("");
    const updateEntries = freeMode ? setFreeEntries : setGuidedEntries;
    if (result.clear) updateEntries([]);
    else updateEntries((current) => [...current, { input: commandInput.trim() || "（未入力）", ...result }].slice(-100));
    if (!freeMode && !basicsComplete && activeLesson.check({ input: commandInput, result, state })) setLessonPassed(true);
  }

  function goNext() {
    const completed = [...new Set([...progress.completed, activeLesson.id])];
    const nextLesson = Math.min(progress.viewedLesson + 1, LESSONS.length - 1);
    setProgress((current) => ({
      ...current,
      completed,
      highestLesson: Math.max(current.highestLesson, progress.viewedLesson + 1),
      viewedLesson: nextLesson,
    }));
    setGuidedState(createLessonTerminalState(nextLesson));
    setGuidedEntries([]);
    setLessonPassed(false);
    setHintLevel(0);
  }

  function resetAll() {
    if (!window.confirm("レッスンの進捗と練習用ファイルを最初の状態に戻しますか？")) return;
    localStorage.removeItem(STORAGE_KEY);
    setProgress({ highestLesson: 0, viewedLesson: 0, completed: [], selectedRoute: null });
    setGuidedState(createLessonTerminalState(0));
    setFreeState(createInitialTerminalState());
    setGuidedEntries([]);
    setFreeEntries([]);
    setHintLevel(0);
    setLessonPassed(false);
    setFreeMode(false);
  }

  function selectLesson(index) {
    if (index > progress.highestLesson) return;
    setProgress((current) => ({ ...current, viewedLesson: index }));
    setGuidedState(createLessonTerminalState(index));
    setGuidedEntries([]);
    setLessonPassed(false);
    setHintLevel(0);
    setFreeMode(false);
  }

  function toggleFreeMode() {
    if (freeMode) {
      setGuidedState(createLessonTerminalState(progress.viewedLesson));
      setGuidedEntries([]);
    }
    setFreeMode((value) => !value);
    setInput("");
    setLessonPassed(false);
    setHintLevel(0);
  }

  function chooseRoute(routeId) {
    const route = ROUTES.find(({ id }) => id === routeId);
    setProgress((current) => ({ ...current, selectedRoute: routeId }));
    setRouteAnnouncement(route ? `${route.title}を選びました。入口課題を表示しました。` : "");
    setFreeMode(true);
    setInput("");
  }

  return (
    <main className="app-shell">
      <LessonSidebar progress={progress} onLessonSelect={selectLesson} />
      <section className="lesson-workspace">
        <header className="lesson-header">
          <div><span>{freeMode ? "安全な練習場" : basicsComplete ? "基礎コース修了" : `レッスン ${progress.viewedLesson + 1}/${LESSONS.length}`}</span><h2>{statusTitle}</h2><p>{freeMode ? "習ったコマンドを自由に組み合わせて試せます。" : basicsComplete ? "好きな進路を選ぶか、自由練習を続けましょう。" : activeLesson.description}</p></div>
          <div className="header-actions"><button className="ghost-button" onClick={toggleFreeMode}>{freeMode ? "レッスンに戻る" : "自由練習"}</button><button className="reset-all" onClick={resetAll}>進捗をリセット</button></div>
        </header>

        {!freeMode && !basicsComplete && <div className="task-banner"><CircleNotch size={20} weight="bold" /><div><strong>今回の課題</strong><span>{activeLesson.task}</span></div></div>}
        <Terminal entries={entries} input={input} setInput={setInput} onSubmit={submitCommand} onReset={() => (freeMode ? setFreeEntries([]) : setGuidedEntries([]))} />

        {!freeMode && !basicsComplete && (
          lessonPassed ? (
            <section className="success-card" ref={successRef}><div className="success-title"><span><Check size={18} weight="bold" /></span><div><h3>できました！</h3><p>{activeLesson.explanation}</p></div></div><div className="result-detail"><File size={20} /><strong>{activeLesson.command}</strong><span>{activeLesson.detail}</span></div><button onClick={goNext}>{progress.viewedLesson === LESSONS.length - 1 ? "基礎を完了する" : "次のレッスンへ"}<ArrowRight size={17} /></button></section>
          ) : (
            <section className="explanation-card"><div><Info size={19} /><h3>どうすればいい？</h3></div><p>{activeLesson.task} 入力に失敗しても進捗やファイルは壊れません。</p><div className="hint-row"><Lightbulb size={18} weight="fill" /><span>{hintLevel ? activeLesson.hints[hintLevel - 1] : "まずは課題を見ながら、自分で入力してみましょう。"}</span><button onClick={() => setHintLevel((level) => Math.min(level + 1, activeLesson.hints.length))}>{hintLevel >= activeLesson.hints.length ? "答えを表示中" : `ヒント ${hintLevel + 1}`}</button></div></section>
          )
        )}

        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{routeAnnouncement}</p>
        {basicsComplete && selectedRoute && <section className={`route-guide ${selectedRoute.tone}`} ref={routeGuideRef} tabIndex={-1}><RouteIcon id={selectedRoute.id} size={28} /><div><span>選んだルート</span><h3>{selectedRoute.title}</h3><p>{selectedRoute.purpose}</p><dl><div><dt>最初の一歩</dt><dd>{selectedRoute.firstStep}</dd></div><div><dt>入口課題</dt><dd><code>{selectedRoute.command}</code><small>上の安全な疑似ターミナルで実行できます。</small></dd></div></dl></div></section>}
        {(freeMode || basicsComplete) && <section className="free-card"><Code size={23} weight="bold" /><div><h3>{basicsComplete ? "次はどこへ進む？" : "自由に試してみよう"}</h3><p>{basicsComplete ? "進路カードを選ぶと、目的と最初の入口課題を確認できます。選択はいつでも変更できます。" : "help でコマンド一覧、clear で履歴を消せます。実際のPCには一切影響しません。"}</p></div></section>}
        <div className="mobile-route"><PathMap selectedRoute={progress.selectedRoute} unlocked={basicsComplete} remaining={LESSONS.length - progress.completed.length} onSelect={chooseRoute} /></div>
      </section>
      <PathMap selectedRoute={progress.selectedRoute} unlocked={basicsComplete} remaining={LESSONS.length - progress.completed.length} onSelect={chooseRoute} />
    </main>
  );
}
