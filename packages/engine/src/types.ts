export type Role = 'mafia' | 'doctor' | 'police' | 'citizen';
export type Team = 'mafia' | 'citizens';
export type Phase = 'role_reveal' | 'night' | 'morning' | 'discussion' | 'vote' | 'ended';
export type GameMode = 'classic' | 'basic';
export type GameResult = 'mafia' | 'citizens' | 'draw';

export interface PlayerSeat {
  id: string;
  name: string;
  isAI: boolean;
}

export interface GameConfig {
  players: PlayerSeat[];
  seed: number;
  /** default 'classic' */
  mode?: GameMode;
  /** default 10 */
  maxDays?: number;
}

export interface PlayerState extends PlayerSeat {
  role: Role;
  alive: boolean;
}

export interface ChatMessage {
  day: number;
  playerId: string;
  text: string;
}

export interface NightResult {
  killed: string | null;
  /** true if the doctor blocked the kill. Stored, but not exposed publicly. */
  saved: boolean;
}

export interface VoteResult {
  executed: string | null;
  tally: Record<string, number>;
}

export interface Investigation {
  day: number;
  targetId: string;
  isMafia: boolean;
}

export interface NightActions {
  /** mafiaId -> targetId */
  mafiaPicks: Record<string, string>;
  doctorTarget: string | null;
  policeTarget: string | null;
}

export interface DiscussionState {
  /** speaking order for the day */
  order: string[];
  /** 0 .. 2*order.length; equals 2*order.length when finished */
  turn: number;
}

/**
 * Extension point for future per-turn effects (e.g. blackout, silence, buffs).
 * Intentionally empty: no effect exists yet and the engine never reads this list.
 */
export type TurnEffect = never;

export interface GameState {
  mode: GameMode;
  maxDays: number;
  seed: number;
  /** PRNG state (mulberry32) */
  rng: number;
  phase: Phase;
  day: number;
  players: PlayerState[];
  ready: string[];
  night: NightActions;
  investigations: Investigation[];
  lastNightResult: NightResult | null;
  discussion: DiscussionState | null;
  messages: ChatMessage[];
  /** voterId -> targetId | null (abstain) */
  votes: Record<string, string | null>;
  lastVoteResult: VoteResult | null;
  result: GameResult | null;
  effects: TurnEffect[];
}

export type Action =
  | { type: 'ready'; playerId: string }
  | { type: 'timeout' }
  | { type: 'mafiaTarget'; actorId: string; targetId: string }
  | { type: 'doctorProtect'; actorId: string; targetId: string }
  | { type: 'policeInvestigate'; actorId: string; targetId: string }
  | { type: 'resolveNight' }
  | { type: 'startDiscussion' }
  | { type: 'speak'; playerId: string; text: string }
  | { type: 'skipTurn' }
  | { type: 'castVote'; voterId: string; targetId: string | null }
  | { type: 'resolveVote' };

export type ActionType = Action['type'];

export type ActionError =
  | 'wrong_phase'
  | 'unknown_player'
  | 'dead_actor'
  | 'wrong_role'
  | 'invalid_target'
  | 'not_your_turn'
  | 'invalid_text';

export type ActionResult = { ok: true; state: GameState } | { ok: false; error: ActionError };

export type ConfigErrorCode = 'invalid_player_count' | 'duplicate_player_id' | 'invalid_config';

export class ConfigError extends Error {
  readonly code: ConfigErrorCode;
  constructor(code: ConfigErrorCode, message: string) {
    super(message);
    this.name = 'ConfigError';
    this.code = code;
  }
}

export interface PublicPlayer {
  id: string;
  name: string;
  isAI: boolean;
  alive: boolean;
  /** only present once the game has ended */
  role?: Role;
}

export interface PlayerView {
  /** null for the public (moderator) view */
  viewerId: string | null;
  you: {
    role: Role;
    /** other mafia members' ids (mafia only) */
    teammates?: string[];
    /** own investigation results (police only) */
    investigations?: Investigation[];
  } | null;
  players: PublicPlayer[];
  phase: Phase;
  day: number;
  currentSpeaker: string | null;
  messages: ChatMessage[];
  lastNightResult: { killed: string | null } | null;
  lastVoteResult: VoteResult | null;
  result: GameResult | null;
}
