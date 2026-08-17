import type { SessionEvent, SessionSnapshot, Suggestion, TranscriptSegment } from "../types";

const maxTranscript = 80;
const maxSuggestions = 3;
const maxDiagnostics = 80;

export const emptySnapshot: SessionSnapshot = {
  status: "ready",
  transcript: [],
  suggestions: [],
  diagnostics: [],
};

export function applySessionEvent(snapshot: SessionSnapshot, event: SessionEvent): SessionSnapshot {
  switch (event.type) {
    case "status":
      return { ...snapshot, sessionId: event.sessionId, status: event.status };
    case "transcript":
      return {
        ...snapshot,
        sessionId: event.sessionId,
        transcript: appendTranscript(snapshot.transcript, event.segment),
      };
    case "suggestion":
      return {
        ...snapshot,
        sessionId: event.sessionId,
        suggestions: appendSuggestion(snapshot.suggestions, event.suggestion),
      };
    case "diagnostic":
      return {
        ...snapshot,
        sessionId: event.sessionId ?? snapshot.sessionId,
        diagnostics: [...snapshot.diagnostics, event.event].slice(-maxDiagnostics),
      };
  }
}

function appendTranscript(items: TranscriptSegment[], item: TranscriptSegment) {
  const withoutSame = items.filter((existing) => existing.id !== item.id);
  return [...withoutSame, item].slice(-maxTranscript);
}

function appendSuggestion(items: Suggestion[], item: Suggestion) {
  const withoutSameKind = items.filter((existing) => existing.kind !== item.kind);
  return [item, ...withoutSameKind].slice(0, maxSuggestions);
}
