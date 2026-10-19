import { describe, expect, it } from 'vitest';
import {
  BASIC_ROLE_TABLE,
  CLASSIC_ROLE_TABLE,
  ConfigError,
  ROLE_TABLE,
  applyAction,
  createGame,
  getPlayerView,
  getPublicView,
  type Action,
  type GameState,
  type Role,
} from '../src/index.js';

const seats = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, isAI: i > 0 }));
const mk = (n: number, seed = 1, mode?: 'classic' | 'basic') =>
  createGame({ players: seats(n), seed, ...(mode ? { mode } : {}) });

function go(s: GameState, a: Action): GameState {
  const r = applyAction(s, a);
  if (!r.ok) throw new Error(`unexpected ${r.error} for ${a.type}`);
  return r.state;
}
const err = (s: GameState, a: Action) => {
  const r = applyAction(s, a);
  if (r.ok) throw new Error('expected error');
  return r.error;
};
const ids = (s: GameState, role: Role) => s.players.filter((p) => p.role === role).map((p) => p.id);

describe('basic mode roles', () => {
  const expected = {
    5: { mafia: 1, citizen: 4 },
    6: { mafia: 1, citizen: 5 },
    7: { mafia: 2, citizen: 5 },
    8: { mafia: 2, citizen: 6 },
  } as const;
  for (const n of [5, 6, 7, 8] as const) {
    it(`role table for ${n} players`, () => {
      const s = mk(n, 3, 'basic');
      expect(s.mode).toBe('basic');
      expect(BASIC_ROLE_TABLE[n]).toEqual({ ...expected[n], doctor: 0, police: 0 });
      expect(ids(s, 'mafia')).toHaveLength(expected[n].mafia);
      expect(ids(s, 'citizen')).toHaveLength(expected[n].citizen);
      expect(ids(s, 'doctor')).toHaveLength(0);
      expect(ids(s, 'police')).toHaveLength(0);
    });
  }

  it('classic stays the default', () => {
    const s = mk(8);
    expect(s.mode).toBe('classic');
    expect(s.effects).toEqual([]);
    expect(ROLE_TABLE).toBe(CLASSIC_ROLE_TABLE);
    expect(ids(s, 'doctor')).toHaveLength(1);
    expect(ids(s, 'police')).toHaveLength(1);
  });

  it('rejects an unknown mode', () => {
    expect(() => createGame({ players: seats(6), seed: 1, mode: 'story' as never })).toThrow(ConfigError);
  });
});

describe('basic mode play', () => {
  it('doctor/police actions are rejected with wrong_role', () => {
    let s = mk(6, 1, 'basic');
    s = go(s, { type: 'timeout' });
    for (const p of s.players) {
      expect(err(s, { type: 'doctorProtect', actorId: p.id, targetId: 'p1' })).toBe('wrong_role');
      expect(err(s, { type: 'policeInvestigate', actorId: p.id, targetId: 'p1' })).toBe('wrong_role');
    }
  });

  it('mafia wins by night kills alone', () => {
    let s = go(mk(5, 2, 'basic'), { type: 'timeout' });
    const mafia = ids(s, 'mafia')[0]!;
    while (s.phase !== 'ended') {
      const victim = s.players.find((p) => p.alive && p.role !== 'mafia')!.id;
      s = go(s, { type: 'mafiaTarget', actorId: mafia, targetId: victim });
      s = go(s, { type: 'resolveNight' });
      expect(s.lastNightResult).toEqual({ killed: victim, saved: false });
      if (s.phase === 'ended') break;
      s = go(s, { type: 'startDiscussion' });
      while (s.phase === 'discussion') s = go(s, { type: 'skipTurn' });
      s = go(s, { type: 'resolveVote' });
    }
    expect(s.result).toBe('mafia');
  });

  it('citizens win by executing the only mafia', () => {
    let s = go(mk(5, 4, 'basic'), { type: 'timeout' });
    const mafia = ids(s, 'mafia')[0]!;
    s = go(s, { type: 'resolveNight' });
    expect(s.lastNightResult).toEqual({ killed: null, saved: false });
    s = go(s, { type: 'startDiscussion' });
    while (s.phase === 'discussion') s = go(s, { type: 'skipTurn' });
    for (const p of s.players) {
      if (p.id !== mafia) s = go(s, { type: 'castVote', voterId: p.id, targetId: mafia });
    }
    s = go(s, { type: 'resolveVote' });
    expect(s.phase).toBe('ended');
    expect(s.result).toBe('citizens');
  });

  it('views do not leak roles in basic mode', () => {
    let s = go(mk(7, 5, 'basic'), { type: 'timeout' });
    const [m1, m2] = ids(s, 'mafia');
    const citizen = ids(s, 'citizen')[0]!;
    const pub = getPublicView(s);
    expect(pub.you).toBeNull();
    pub.players.forEach((p) => expect(p).not.toHaveProperty('role'));
    const cv = getPlayerView(s, citizen);
    expect(cv.you).toEqual({ role: 'citizen' });
    cv.players.forEach((p) => expect(p).not.toHaveProperty('role'));
    expect(getPlayerView(s, m1!).you).toEqual({ role: 'mafia', teammates: [m2] });
    s = go(s, { type: 'resolveNight' });
    expect(getPublicView(s).lastNightResult).toEqual({ killed: null });
  });
});
