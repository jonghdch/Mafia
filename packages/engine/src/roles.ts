import type { GameMode, Role, Team } from './types.js';

export type RoleCounts = Record<Role, number>;

/** Classic role distribution by player count. Single place to change later. */
export const CLASSIC_ROLE_TABLE: Readonly<Record<number, RoleCounts>> = {
  5: { mafia: 1, doctor: 1, police: 1, citizen: 2 },
  6: { mafia: 2, doctor: 1, police: 1, citizen: 2 },
  7: { mafia: 2, doctor: 1, police: 1, citizen: 3 },
  8: { mafia: 2, doctor: 1, police: 1, citizen: 4 },
};

/** Basic mode: mafia and citizens only (no doctor/police). */
export const BASIC_ROLE_TABLE: Readonly<Record<number, RoleCounts>> = {
  5: { mafia: 1, doctor: 0, police: 0, citizen: 4 },
  6: { mafia: 1, doctor: 0, police: 0, citizen: 5 },
  7: { mafia: 2, doctor: 0, police: 0, citizen: 5 },
  8: { mafia: 2, doctor: 0, police: 0, citizen: 6 },
};

export const ROLE_TABLES: Readonly<Record<GameMode, Readonly<Record<number, RoleCounts>>>> = {
  classic: CLASSIC_ROLE_TABLE,
  basic: BASIC_ROLE_TABLE,
};

/** Kept for existing callers: the classic table. */
export const ROLE_TABLE = CLASSIC_ROLE_TABLE;

export const DEFAULT_MODE: GameMode = 'classic';

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 8;
export const DEFAULT_MAX_DAYS = 10;

export function teamOf(role: Role): Team {
  return role === 'mafia' ? 'mafia' : 'citizens';
}

export function expandRoles(counts: RoleCounts): Role[] {
  const roles: Role[] = [];
  for (const r of ['mafia', 'doctor', 'police', 'citizen'] as const) {
    for (let i = 0; i < counts[r]; i++) roles.push(r);
  }
  return roles;
}
