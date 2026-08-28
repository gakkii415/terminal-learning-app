import { createInitialTerminalState, createLessonTerminalState, sanitizeTerminalState } from "./terminalEngine.js";

export const STORAGE_KEY = "terminal-steps-progress-v1";
export const STORAGE_VERSION = 2;
const MAX_SAVED_LENGTH = 250_000;

function clamp(value, min, max) {
  return Math.min(Math.max(Number.isInteger(value) ? value : min, min), max);
}

export function sanitizeProgress(candidate, lessonIds, routeIds) {
  const savedCompleted = new Set(Array.isArray(candidate?.completed) ? candidate.completed : []);
  const completed = [];
  for (const id of lessonIds) {
    if (!savedCompleted.has(id)) break;
    completed.push(id);
  }
  const legacyCurrent = Number.isInteger(candidate?.currentLesson) ? candidate.currentLesson : 0;
  const requestedHighest = candidate?.highestLesson ?? legacyCurrent;
  const highestLesson = clamp(Math.min(requestedHighest, completed.length), 0, lessonIds.length);
  const maxViewed = Math.min(highestLesson, lessonIds.length - 1);
  const viewedLesson = clamp(candidate?.viewedLesson ?? Math.min(legacyCurrent, maxViewed), 0, Math.max(0, maxViewed));
  return {
    highestLesson,
    viewedLesson,
    completed,
    selectedRoute: routeIds.includes(candidate?.selectedRoute) ? candidate.selectedRoute : null,
  };
}

export function loadSavedState(storage, lessonIds, routeIds) {
  const defaults = {
    progress: sanitizeProgress(null, lessonIds, routeIds),
    guidedState: createLessonTerminalState(0),
    freeState: createInitialTerminalState(),
  };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw || raw.length > MAX_SAVED_LENGTH) return defaults;
    const saved = JSON.parse(raw);
    if (saved?.version !== 1 && saved?.version !== STORAGE_VERSION) return defaults;
    const progress = sanitizeProgress(saved, lessonIds, routeIds);
    return {
      progress,
      // Guided lessons always reopen from their known-good starting state so
      // free navigation or a stale save can never make the current task impossible.
      guidedState: createLessonTerminalState(progress.viewedLesson),
      freeState: sanitizeTerminalState(saved.freeState, createInitialTerminalState()),
    };
  } catch {
    return defaults;
  }
}

export function saveState(storage, payload) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...payload }));
    return true;
  } catch {
    return false;
  }
}
