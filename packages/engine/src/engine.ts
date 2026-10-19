import {
  ConfigError,
  type Action,
  type ActionError,
  type ActionResult,
  type GameConfig,
  type GameResult,
  type GameState,
  type NightActions,
  type PlayerState,
} from './types.js';
import { nextInt, shuffle } from './rng.js';
import { DEFAULT_MAX_DAYS, MAX_PLAYERS, MIN_PLAYERS, DEFAULT_MODE, ROLE_TABLES, expandRoles } from './roles.js';

const MAX_TEXT = 500;
const DISCUSSION_ROUNDS = 2;

function emptyNight(): NightActions {
  return { mafiaPicks: {}, doctorTarget: null, policeTarget: null };
}

export function createGame(config: GameConfig): GameState {
  const n = config.players.length;
  const mode = config.mode ?? DEFAULT_MODE;
  const table = ROLE_TABLES[mode];
  if (!table) throw new ConfigError('invalid_config', `Unknown mode: ${String(mode)}`);
  const counts = table[n];
  if (n < MIN_PLAYERS || n > MAX_PLAYERS || !counts) {
    throw new ConfigError('invalid_player_count', `Player count must be ${MIN_PLAYERS}-${MAX_PLAYERS}, got ${n}`);
  }
  if (new Set(config.players.map((p) => p.id)).size !== n) {
    throw new ConfigError('duplicate_player_id', 'Player ids must be unique');
  }
  const maxDays = config.maxDays ?? DEFAULT_MAX_DAYS;
  if (!Number.isInteger(maxDays) || maxDays < 1 || !Number.isFinite(config.seed)) {
    throw new ConfigError('invalid_config', 'maxDays must be a positive integer and seed finite');
  }
  const seed = config.seed >>> 0;
  const [roles, rng] = shuffle(expandRoles(counts), seed);
  const players: PlayerState[] = config.players.map((p, i) => ({
    id: p.id,
    name: p.name,
    isAI: p.isAI,
    role: roles[i]!,
    alive: true,
  }));
  return {
    mode,
    maxDays,
    seed,
    rng,
    phase: 'role_reveal',
    day: 1,
    players,
    ready: [],
    night: emptyNight(),
    investigations: [],
    lastNightResult: null,
    discussion: null,
    messages: [],
    votes: {},
    lastVoteResult: null,
    result: null,
    effects: [],
  };
}

const fail = (error: ActionError): ActionResult => ({ ok: false, error });
const ok = (state: GameState): ActionResult => ({ ok: true, state });

export function winCheck(players: readonly PlayerState[]): Exclude<GameResult, 'draw'> | null {
  const aliveMafia = players.filter((p) => p.alive && p.role === 'mafia').length;
  const aliveOthers = players.filter((p) => p.alive && p.role !== 'mafia').length;
  if (aliveMafia === 0) return 'citizens';
  if (aliveMafia >= aliveOthers) return 'mafia';
  return null;
}

function find(state: GameState, id: string): PlayerState | undefined {
  return state.players.find((p) => p.id === id);
}

/** Validates an alive actor with a given role. */
function actor(state: GameState, id: string, role?: PlayerState['role']): PlayerState | ActionError {
  const p = find(state, id);
  if (!p) return 'unknown_player';
  if (!p.alive) return 'dead_actor';
  if (role && p.role !== role) return 'wrong_role';
  return p;
}

function aliveTarget(state: GameState, id: string): PlayerState | undefined {
  const t = find(state, id);
  return t && t.alive ? t : undefined;
}

function enterNextPhaseAfterEndCheck(state: GameState, next: GameState['phase']): GameState {
  const winner = winCheck(state.players);
  if (winner) return { ...state, phase: 'ended', result: winner };
  return { ...state, phase: next };
}

export function applyAction(state: GameState, action: Action): ActionResult {
  if (state.phase === 'ended') return fail('wrong_phase');
  switch (action.type) {
    case 'ready': {
      if (state.phase !== 'role_reveal') return fail('wrong_phase');
      const a = actor(state, action.playerId);
      if (typeof a === 'string') return fail(a);
      const ready = state.ready.includes(a.id) ? state.ready : [...state.ready, a.id];
      const all = state.players.every((p) => !p.alive || ready.includes(p.id));
      return ok(all ? { ...state, ready, phase: 'night' } : { ...state, ready });
    }
    case 'timeout': {
      if (state.phase !== 'role_reveal') return fail('wrong_phase');
      return ok({ ...state, phase: 'night' });
    }
    case 'mafiaTarget': {
      if (state.phase !== 'night') return fail('wrong_phase');
      const a = actor(state, action.actorId, 'mafia');
      if (typeof a === 'string') return fail(a);
      const t = aliveTarget(state, action.targetId);
      if (!t || t.role === 'mafia') return fail('invalid_target');
      return ok({
        ...state,
        night: { ...state.night, mafiaPicks: { ...state.night.mafiaPicks, [a.id]: t.id } },
      });
    }
    case 'doctorProtect': {
      if (state.phase !== 'night') return fail('wrong_phase');
      const a = actor(state, action.actorId, 'doctor');
      if (typeof a === 'string') return fail(a);
      const t = aliveTarget(state, action.targetId);
      if (!t) return fail('invalid_target');
      return ok({ ...state, night: { ...state.night, doctorTarget: t.id } });
    }
    case 'policeInvestigate': {
      if (state.phase !== 'night') return fail('wrong_phase');
      const a = actor(state, action.actorId, 'police');
      if (typeof a === 'string') return fail(a);
      const t = aliveTarget(state, action.targetId);
      if (!t || t.id === a.id) return fail('invalid_target');
      return ok({ ...state, night: { ...state.night, policeTarget: t.id } });
    }
    case 'resolveNight':
      return state.phase === 'night' ? ok(resolveNight(state)) : fail('wrong_phase');
    case 'startDiscussion': {
      if (state.phase !== 'morning') return fail('wrong_phase');
      const order = state.players.filter((p) => p.alive).map((p) => p.id);
      const [offset, rng] = nextInt(state.rng, order.length);
      const rotated = [...order.slice(offset), ...order.slice(0, offset)];
      return ok({ ...state, rng, phase: 'discussion', discussion: { order: rotated, turn: 0 } });
    }
    case 'speak': {
      if (state.phase !== 'discussion' || !state.discussion) return fail('wrong_phase');
      const a = actor(state, action.playerId);
      if (typeof a === 'string') return fail(a);
      const d = state.discussion;
      if (d.order[d.turn % d.order.length] !== a.id) return fail('not_your_turn');
      const text = typeof action.text === 'string' ? action.text.trim() : '';
      if (text.length < 1 || text.length > MAX_TEXT) return fail('invalid_text');
      return ok(advanceTurn({ ...state, messages: [...state.messages, { day: state.day, playerId: a.id, text }] }));
    }
    case 'skipTurn': {
      if (state.phase !== 'discussion' || !state.discussion) return fail('wrong_phase');
      return ok(advanceTurn(state));
    }
    case 'castVote': {
      if (state.phase !== 'vote') return fail('wrong_phase');
      const a = actor(state, action.voterId);
      if (typeof a === 'string') return fail(a);
      if (action.targetId !== null) {
        const t = aliveTarget(state, action.targetId);
        if (!t || t.id === a.id) return fail('invalid_target');
      }
      return ok({ ...state, votes: { ...state.votes, [a.id]: action.targetId } });
    }
    case 'resolveVote':
      return state.phase === 'vote' ? ok(resolveVote(state)) : fail('wrong_phase');
    default:
      return fail('wrong_phase');
  }
}

function advanceTurn(state: GameState): GameState {
  const d = state.discussion!;
  const turn = d.turn + 1;
  const done = turn >= d.order.length * DISCUSSION_ROUNDS;
  return {
    ...state,
    phase: done ? 'vote' : 'discussion',
    discussion: { ...d, turn },
    votes: done ? {} : state.votes,
  };
}

function resolveNight(state: GameState): GameState {
  let rng = state.rng;
  const counts = new Map<string, number>();
  for (const m of state.players) {
    const pick = m.alive && m.role === 'mafia' ? state.night.mafiaPicks[m.id] : undefined;
    if (pick) counts.set(pick, (counts.get(pick) ?? 0) + 1);
  }
  let victim: string | null = null;
  if (counts.size > 0) {
    const max = Math.max(...counts.values());
    // seat order keeps the tie-break independent of pick insertion order
    const tied = state.players.map((p) => p.id).filter((id) => counts.get(id) === max);
    let idx = 0;
    if (tied.length > 1) [idx, rng] = nextInt(rng, tied.length);
    victim = tied[idx]!;
  }
  const saved = victim !== null && state.night.doctorTarget === victim;
  const killed = victim !== null && !saved ? victim : null;

  const investigations = [...state.investigations];
  const police = state.players.find((p) => p.alive && p.role === 'police');
  const pt = state.night.policeTarget && police ? find(state, state.night.policeTarget) : undefined;
  if (pt) investigations.push({ day: state.day, targetId: pt.id, isMafia: pt.role === 'mafia' });

  const players = state.players.map((p) => (p.id === killed ? { ...p, alive: false } : p));
  return enterNextPhaseAfterEndCheck(
    { ...state, rng, players, investigations, night: emptyNight(), lastNightResult: { killed, saved } },
    'morning',
  );
}

function resolveVote(state: GameState): GameState {
  const tally: Record<string, number> = {};
  for (const p of state.players) {
    const v = p.alive ? state.votes[p.id] : undefined;
    if (v) tally[v] = (tally[v] ?? 0) + 1;
  }
  const entries = Object.entries(tally);
  const max = entries.length ? Math.max(...entries.map(([, c]) => c)) : 0;
  const top = entries.filter(([, c]) => c === max);
  const executed = top.length === 1 ? top[0]![0] : null;
  const players = state.players.map((p) => (p.id === executed ? { ...p, alive: false } : p));
  const base: GameState = {
    ...state,
    players,
    votes: {},
    discussion: null,
    lastVoteResult: { executed, tally },
  };
  const winner = winCheck(players);
  if (winner) return { ...base, phase: 'ended', result: winner };
  if (state.day >= state.maxDays) return { ...base, phase: 'ended', result: 'draw' };
  return { ...base, phase: 'night', day: state.day + 1, night: emptyNight() };
}
