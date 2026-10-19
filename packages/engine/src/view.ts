import type { GameState, PlayerView, PublicPlayer } from './types.js';

function build(state: GameState, viewerId: string | null): PlayerView {
  const ended = state.phase === 'ended';
  const me = viewerId === null ? undefined : state.players.find((p) => p.id === viewerId);
  const players: PublicPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    isAI: p.isAI,
    alive: p.alive,
    ...(ended ? { role: p.role } : {}),
  }));
  const d = state.discussion;
  const currentSpeaker =
    state.phase === 'discussion' && d ? (d.order[d.turn % d.order.length] ?? null) : null;
  return {
    viewerId,
    you: me
      ? {
          role: me.role,
          ...(me.role === 'mafia'
            ? { teammates: state.players.filter((p) => p.role === 'mafia' && p.id !== me.id).map((p) => p.id) }
            : {}),
          ...(me.role === 'police' ? { investigations: state.investigations.map((i) => ({ ...i })) } : {}),
        }
      : null,
    players,
    phase: state.phase,
    day: state.day,
    currentSpeaker,
    messages: state.messages.map((m) => ({ ...m })),
    lastNightResult: state.lastNightResult ? { killed: state.lastNightResult.killed } : null,
    lastVoteResult: state.lastVoteResult
      ? { executed: state.lastVoteResult.executed, tally: { ...state.lastVoteResult.tally } }
      : null,
    result: state.result,
  };
}

/** Exactly what `playerId` may know. Unknown id yields the public view. */
export function getPlayerView(state: GameState, playerId: string): PlayerView {
  return build(state, playerId);
}

/** What a moderator/narrator may see: no roles until the game has ended. */
export function getPublicView(state: GameState): PlayerView {
  return build(state, null);
}
