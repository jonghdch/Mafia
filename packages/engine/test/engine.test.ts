import { describe, expect, it } from 'vitest';
import {
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
const mk = (n = 6, seed = 1, maxDays?: number) =>
  createGame({ players: seats(n), seed, ...(maxDays ? { maxDays } : {}) });

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
const alive = (s: GameState) => s.players.filter((p) => p.alive).map((p) => p.id);
const one = (s: GameState, role: Role) => ids(s, role)[0]!;
const rolesOf = (s: GameState) => s.players.map((p) => p.role);

function toNight(s: GameState): GameState {
  return go(s, { type: 'timeout' });
}
function toMorning(s: GameState, victim?: string): GameState {
  if (victim) s = go(s, { type: 'mafiaTarget', actorId: one(s, 'mafia'), targetId: victim });
  return go(s, { type: 'resolveNight' });
}
function toVote(s: GameState): GameState {
  s = go(s, { type: 'startDiscussion' });
  while (s.phase === 'discussion') s = go(s, { type: 'skipTurn' });
  return s;
}
const nonMafiaOf = (s: GameState) => s.players.find((p) => p.alive && p.role !== 'mafia')!.id;

describe('config & roles', () => {
  for (const n of [5, 6, 7, 8]) {
    it(`role table for ${n} players`, () => {
      const s = mk(n);
      const count = (r: Role) => ids(s, r).length;
      expect({ mafia: count('mafia'), doctor: count('doctor'), police: count('police'), citizen: count('citizen') }).toEqual(
        ROLE_TABLE[n],
      );
      expect(s.phase).toBe('role_reveal');
      expect(s.day).toBe(1);
    });
  }
  it('rejects 4 and 9 players', () => {
    for (const n of [4, 9]) {
      expect(() => mk(n)).toThrow(ConfigError);
      try {
        mk(n);
      } catch (e) {
        expect((e as ConfigError).code).toBe('invalid_player_count');
      }
    }
  });
  it('rejects duplicate ids', () => {
    const players = seats(5);
    players[1]!.id = 'p1';
    try {
      createGame({ players, seed: 1 });
      throw new Error('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      expect((e as ConfigError).code).toBe('duplicate_player_id');
    }
  });
  it('is deterministic per seed and varies across seeds', () => {
    expect(rolesOf(mk(7, 42))).toEqual(rolesOf(mk(7, 42)));
    const variants = new Set(Array.from({ length: 20 }, (_, i) => rolesOf(mk(7, i)).join()));
    expect(variants.size).toBeGreaterThan(1);
  });
});

describe('role_reveal', () => {
  it('moves to night when all ready', () => {
    let s = mk(5);
    for (const p of s.players.slice(0, 4)) s = go(s, { type: 'ready', playerId: p.id });
    expect(s.phase).toBe('role_reveal');
    s = go(s, { type: 'ready', playerId: 'p5' });
    expect(s.phase).toBe('night');
  });
  it('moves to night on timeout', () => {
    expect(toNight(mk(5)).phase).toBe('night');
  });
  it('rejects unknown player and wrong phase', () => {
    const s = mk(5);
    expect(err(s, { type: 'ready', playerId: 'zzz' })).toBe('unknown_player');
    expect(err(s, { type: 'resolveNight' })).toBe('wrong_phase');
    expect(err(toNight(s), { type: 'timeout' })).toBe('wrong_phase');
  });
});

describe('night validation', () => {
  const s = toNight(mk(6, 3));
  const m = one(s, 'mafia');
  const d = one(s, 'doctor');
  const po = one(s, 'police');
  const c = one(s, 'citizen');
  it('wrong phase', () => {
    expect(err(mk(6), { type: 'mafiaTarget', actorId: m, targetId: c })).toBe('wrong_phase');
  });
  it('wrong role', () => {
    expect(err(s, { type: 'mafiaTarget', actorId: c, targetId: d })).toBe('wrong_role');
    expect(err(s, { type: 'doctorProtect', actorId: c, targetId: d })).toBe('wrong_role');
    expect(err(s, { type: 'policeInvestigate', actorId: c, targetId: d })).toBe('wrong_role');
  });
  it('unknown actor', () => {
    expect(err(s, { type: 'doctorProtect', actorId: 'nope', targetId: d })).toBe('unknown_player');
  });
  it('invalid targets', () => {
    const [m1, m2] = ids(s, 'mafia');
    expect(err(s, { type: 'mafiaTarget', actorId: m1!, targetId: m2! })).toBe('invalid_target');
    expect(err(s, { type: 'mafiaTarget', actorId: m1!, targetId: 'nope' })).toBe('invalid_target');
    expect(err(s, { type: 'policeInvestigate', actorId: po, targetId: po })).toBe('invalid_target');
    expect(err(s, { type: 'doctorProtect', actorId: d, targetId: 'nope' })).toBe('invalid_target');
  });
  it('doctor may protect self', () => {
    expect(applyAction(s, { type: 'doctorProtect', actorId: d, targetId: d }).ok).toBe(true);
  });
  it('dead actors and dead targets rejected', () => {
    let t = toNight(mk(8, 5));
    const victim = nonMafiaOf(t);
    t = toMorning(t, victim);
    t = toVote(t);
    t = go(t, { type: 'resolveVote' });
    expect(t.phase).toBe('night');
    const dead = t.players.find((p) => !p.alive)!;
    const mafia = one(t, 'mafia');
    expect(err(t, { type: 'mafiaTarget', actorId: mafia, targetId: dead.id })).toBe('invalid_target');
    expect(err(t, { type: 'doctorProtect', actorId: one(t, 'doctor'), targetId: dead.id })).toBe(
      dead.role === 'doctor' ? 'dead_actor' : 'invalid_target',
    );
  });
  it('dead actor error', () => {
    let t = toNight(mk(8, 5));
    const doc = one(t, 'doctor');
    t = toMorning(t, doc);
    t = toVote(t);
    t = go(t, { type: 'resolveVote' });
    expect(err(t, { type: 'doctorProtect', actorId: doc, targetId: doc })).toBe('dead_actor');
  });
});

describe('night resolution', () => {
  it('kills the mafia target', () => {
    let s = toNight(mk(8, 2));
    const v = nonMafiaOf(s);
    s = toMorning(s, v);
    expect(s.phase).toBe('morning');
    expect(s.lastNightResult).toEqual({ killed: v, saved: false });
    expect(s.players.find((p) => p.id === v)!.alive).toBe(false);
  });
  it('mafia can change their pick', () => {
    let s = toNight(mk(8, 2));
    const [a, b] = s.players.filter((p) => p.role !== 'mafia').map((p) => p.id);
    const m = one(s, 'mafia');
    s = go(s, { type: 'mafiaTarget', actorId: m, targetId: a! });
    s = go(s, { type: 'mafiaTarget', actorId: m, targetId: b! });
    expect(go(s, { type: 'resolveNight' }).lastNightResult?.killed).toBe(b);
  });
  it('plurality of mafia picks wins', () => {
    let s = toNight(mk(7, 4));
    const [m1, m2] = ids(s, 'mafia');
    const [a, b] = s.players.filter((p) => p.role !== 'mafia').map((p) => p.id);
    s = go(s, { type: 'mafiaTarget', actorId: m1!, targetId: a! });
    s = go(s, { type: 'mafiaTarget', actorId: m2!, targetId: a! });
    expect(b).toBeDefined();
    expect(go(s, { type: 'resolveNight' }).lastNightResult?.killed).toBe(a);
  });
  it('tie is broken by seed, deterministically, across both outcomes', () => {
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const run = () => {
        let s = toNight(mk(6, seed));
        const [m1, m2] = ids(s, 'mafia');
        const [a, b] = s.players.filter((p) => p.role !== 'mafia').map((p) => p.id);
        s = go(s, { type: 'mafiaTarget', actorId: m1!, targetId: a! });
        s = go(s, { type: 'mafiaTarget', actorId: m2!, targetId: b! });
        const k = go(s, { type: 'resolveNight' }).lastNightResult!.killed;
        expect([a, b]).toContain(k);
        return `${k === a ? 'first' : 'second'}`;
      };
      const r = run();
      expect(run()).toBe(r);
      outcomes.add(r);
    }
    expect(outcomes.size).toBe(2);
  });
  it('no mafia picks means no victim', () => {
    const s = toMorning(toNight(mk(6)));
    expect(s.lastNightResult).toEqual({ killed: null, saved: false });
    expect(alive(s)).toHaveLength(6);
  });
  it('doctor save blocks the kill', () => {
    let s = toNight(mk(8, 2));
    const v = nonMafiaOf(s);
    s = go(s, { type: 'doctorProtect', actorId: one(s, 'doctor'), targetId: v });
    s = toMorning(s, v);
    expect(s.lastNightResult).toEqual({ killed: null, saved: true });
    expect(alive(s)).toHaveLength(8);
    expect(getPublicView(s).lastNightResult).toEqual({ killed: null });
  });
  it('doctor protecting someone else does not save', () => {
    let s = toNight(mk(8, 2));
    const nm = s.players.filter((p) => p.role !== 'mafia').map((p) => p.id);
    s = go(s, { type: 'doctorProtect', actorId: one(s, 'doctor'), targetId: nm[0]! });
    s = toMorning(s, nm[1]!);
    expect(s.lastNightResult?.killed).toBe(nm[1]);
  });
  it('police result is visible only to police', () => {
    let s = toNight(mk(8, 7));
    const po = one(s, 'police');
    const mafia = one(s, 'mafia');
    s = go(s, { type: 'policeInvestigate', actorId: po, targetId: mafia });
    s = toMorning(s);
    expect(getPlayerView(s, po).you?.investigations).toEqual([{ day: 1, targetId: mafia, isMafia: true }]);
    for (const p of s.players.filter((x) => x.id !== po)) {
      expect(getPlayerView(s, p.id).you?.investigations).toBeUndefined();
    }
    expect(JSON.stringify(getPublicView(s))).not.toContain('isMafia');
  });
  it('police can clear a non-mafia', () => {
    let s = toNight(mk(8, 7));
    const c = one(s, 'citizen');
    s = go(s, { type: 'policeInvestigate', actorId: one(s, 'police'), targetId: c });
    s = toMorning(s);
    expect(s.investigations[0]?.isMafia).toBe(false);
  });
});

describe('discussion', () => {
  it('speaking order is alive players, rotated, two rounds, then vote', () => {
    let s = go(toMorning(toNight(mk(6, 9))), { type: 'startDiscussion' });
    const order = s.discussion!.order;
    expect([...order].sort()).toEqual(alive(s).sort());
    // rotation of seat order
    const seat = alive(s);
    const off = seat.indexOf(order[0]!);
    expect(order).toEqual([...seat.slice(off), ...seat.slice(0, off)]);
    for (let i = 0; i < 12; i++) {
      expect(s.phase).toBe('discussion');
      const sp = getPublicView(s).currentSpeaker;
      expect(sp).toBe(order[i % 6]);
      s = go(s, { type: 'speak', playerId: sp!, text: `  msg ${i} ` });
    }
    expect(s.phase).toBe('vote');
    expect(s.messages).toHaveLength(12);
    expect(s.messages[0]).toEqual({ day: 1, playerId: order[0], text: 'msg 0' });
  });
  it('order is deterministic per seed', () => {
    const o = (seed: number) => go(toMorning(toNight(mk(6, seed))), { type: 'startDiscussion' }).discussion!.order;
    expect(o(5)).toEqual(o(5));
  });
  it('excludes dead players', () => {
    let s = toNight(mk(8, 2));
    const v = nonMafiaOf(s);
    s = go(toMorning(s, v), { type: 'startDiscussion' });
    expect(s.discussion!.order).toHaveLength(7);
    expect(s.discussion!.order).not.toContain(v);
  });
  it('rejects not-your-turn, bad text, wrong phase', () => {
    const s = go(toMorning(toNight(mk(6, 9))), { type: 'startDiscussion' });
    const order = s.discussion!.order;
    expect(err(s, { type: 'speak', playerId: order[1]!, text: 'hi' })).toBe('not_your_turn');
    expect(err(s, { type: 'speak', playerId: order[0]!, text: '   ' })).toBe('invalid_text');
    expect(err(s, { type: 'speak', playerId: order[0]!, text: 'x'.repeat(501) })).toBe('invalid_text');
    expect(applyAction(s, { type: 'speak', playerId: order[0]!, text: 'x'.repeat(500) }).ok).toBe(true);
    expect(err(s, { type: 'speak', playerId: 'nope', text: 'hi' })).toBe('unknown_player');
    expect(err(mk(6), { type: 'skipTurn' })).toBe('wrong_phase');
    expect(err(toMorning(toNight(mk(6))), { type: 'speak', playerId: 'p1', text: 'hi' })).toBe('wrong_phase');
  });
  it('skipTurn advances without a message', () => {
    let s = go(toMorning(toNight(mk(5, 1))), { type: 'startDiscussion' });
    const second = s.discussion!.order[1];
    s = go(s, { type: 'skipTurn' });
    expect(s.messages).toHaveLength(0);
    expect(getPublicView(s).currentSpeaker).toBe(second);
    expect(toVote(toMorning(toNight(mk(5, 1)))).phase).toBe('vote');
  });
});

describe('vote', () => {
  const voteState = (n = 6, seed = 1) => toVote(toMorning(toNight(mk(n, seed))));
  it('plurality executes', () => {
    let s = voteState();
    s = go(s, { type: 'castVote', voterId: 'p1', targetId: 'p2' });
    s = go(s, { type: 'castVote', voterId: 'p3', targetId: 'p2' });
    s = go(s, { type: 'castVote', voterId: 'p4', targetId: 'p5' });
    s = go(s, { type: 'castVote', voterId: 'p6', targetId: null });
    const before = s.players.find((p) => p.id === 'p2')!;
    s = go(s, { type: 'resolveVote' });
    expect(s.lastVoteResult).toEqual({ executed: 'p2', tally: { p2: 2, p5: 1 } });
    expect(s.players.find((p) => p.id === 'p2')!.alive).toBe(false);
    if (s.phase !== 'ended') {
      expect(s.phase).toBe('night');
      expect(s.day).toBe(2);
    }
    expect(before.id).toBe('p2');
  });
  it('can change vote', () => {
    let s = voteState();
    s = go(s, { type: 'castVote', voterId: 'p1', targetId: 'p2' });
    s = go(s, { type: 'castVote', voterId: 'p1', targetId: 'p3' });
    expect(go(s, { type: 'resolveVote' }).lastVoteResult?.tally).toEqual({ p3: 1 });
  });
  it('tie executes nobody', () => {
    let s = voteState();
    s = go(s, { type: 'castVote', voterId: 'p1', targetId: 'p2' });
    s = go(s, { type: 'castVote', voterId: 'p3', targetId: 'p4' });
    s = go(s, { type: 'resolveVote' });
    expect(s.lastVoteResult?.executed).toBeNull();
    expect(alive(s)).toHaveLength(6);
    expect(s.phase).toBe('night');
    expect(s.day).toBe(2);
  });
  it('all abstain executes nobody', () => {
    let s = voteState();
    for (const p of s.players) s = go(s, { type: 'castVote', voterId: p.id, targetId: null });
    s = go(s, { type: 'resolveVote' });
    expect(s.lastVoteResult).toEqual({ executed: null, tally: {} });
  });
  it('zero votes executes nobody', () => {
    expect(go(voteState(), { type: 'resolveVote' }).lastVoteResult?.executed).toBeNull();
  });
  it('rejects self-vote, unknown/dead target, wrong phase', () => {
    const s = voteState();
    expect(err(s, { type: 'castVote', voterId: 'p1', targetId: 'p1' })).toBe('invalid_target');
    expect(err(s, { type: 'castVote', voterId: 'p1', targetId: 'nope' })).toBe('invalid_target');
    expect(err(s, { type: 'castVote', voterId: 'nope', targetId: 'p1' })).toBe('unknown_player');
    expect(err(mk(6), { type: 'castVote', voterId: 'p1', targetId: 'p2' })).toBe('wrong_phase');
    expect(err(mk(6), { type: 'resolveVote' })).toBe('wrong_phase');
  });
  it('dead cannot vote or be voted', () => {
    let s = toNight(mk(8, 2));
    const v = nonMafiaOf(s);
    s = toVote(toMorning(s, v));
    const other = alive(s).find((id) => id !== v)!;
    expect(err(s, { type: 'castVote', voterId: v, targetId: other })).toBe('dead_actor');
    expect(err(s, { type: 'castVote', voterId: other, targetId: v })).toBe('invalid_target');
  });
});

describe('win conditions', () => {
  it('citizens win when the last mafia is executed', () => {
    let s = toVote(toMorning(toNight(mk(5, 3))));
    const m = one(s, 'mafia');
    for (const p of s.players.filter((x) => x.id !== m)) s = go(s, { type: 'castVote', voterId: p.id, targetId: m });
    s = go(s, { type: 'resolveVote' });
    expect(s.phase).toBe('ended');
    expect(s.result).toBe('citizens');
  });
  it('mafia win after night when mafia >= others', () => {
    // 5 players: 1 mafia vs 4. Execute 2 innocents via votes, then kill one at night.
    let s = mk(5, 3);
    const m = one(s, 'mafia');
    s = toNight(s);
    s = toVote(toMorning(s)); // day 1 no kill
    const [a] = s.players.filter((p) => p.role !== 'mafia');
    for (const p of s.players.filter((x) => x.id !== a!.id)) s = go(s, { type: 'castVote', voterId: p.id, targetId: a!.id });
    s = go(s, { type: 'resolveVote' }); // 1 mafia vs 3
    expect(s.phase).toBe('night');
    const t = nonMafiaOf(s);
    s = go(s, { type: 'mafiaTarget', actorId: m, targetId: t });
    s = go(s, { type: 'resolveNight' }); // 1 vs 2 -> continue
    expect(s.phase).toBe('morning');
    s = toVote(s);
    const t2 = nonMafiaOf(s);
    s = go(s, { type: 'resolveVote' }); // nobody
    s = go(s, { type: 'mafiaTarget', actorId: m, targetId: t2 });
    s = go(s, { type: 'resolveNight' }); // 1 vs 1 -> mafia
    expect(s.phase).toBe('ended');
    expect(s.result).toBe('mafia');
  });
  it('mafia win after vote: execute innocent at parity edge', () => {
    // 6 players: 2 mafia, 4 others. Kill one at night (2v3), then execute one innocent (2v2).
    let s = toNight(mk(6, 11));
    const t = nonMafiaOf(s);
    s = toVote(toMorning(s, t));
    expect(s.phase).toBe('vote');
    const a = nonMafiaOf(s);
    for (const p of s.players.filter((x) => x.alive && x.id !== a))
      s = go(s, { type: 'castVote', voterId: p.id, targetId: a });
    s = go(s, { type: 'resolveVote' });
    expect(s.phase).toBe('ended');
    expect(s.result).toBe('mafia');
  });
  it('draw at maxDays', () => {
    let s = toNight(mk(8, 1, 2));
    s = toVote(toMorning(s));
    s = go(s, { type: 'resolveVote' });
    expect(s.phase).toBe('night');
    expect(s.day).toBe(2);
    s = toVote(toMorning(s));
    s = go(s, { type: 'resolveVote' });
    expect(s.phase).toBe('ended');
    expect(s.result).toBe('draw');
  });
  it('no actions after ended', () => {
    let s = toNight(mk(8, 1, 1));
    s = go(toVote(toMorning(s)), { type: 'resolveVote' });
    expect(s.phase).toBe('ended');
    expect(err(s, { type: 'resolveVote' })).toBe('wrong_phase');
  });
});

describe('views', () => {
  const roles: Role[] = ['mafia', 'doctor', 'police', 'citizen'];
  it('never leaks other roles before ended', () => {
    const s = mk(8, 13);
    for (const viewer of s.players) {
      const v = getPlayerView(s, viewer.id);
      expect(v.you?.role).toBe(viewer.role);
      expect(v.players.every((p) => p.role === undefined)).toBe(true);
      expect(Object.keys(v)).not.toContain('night');
      for (const other of s.players.filter((p) => p.id !== viewer.id)) {
        // the only other role info allowed is mafia teammate ids for mafia
        if (viewer.role === 'mafia' && other.role === 'mafia') continue;
        expect(v.you).not.toHaveProperty('teammates', expect.arrayContaining([other.id]));
      }
    }
    for (const r of roles) expect(ids(s, r).length).toBeGreaterThan(0);
  });
  it('mafia see only mafia teammates', () => {
    const s = mk(8, 13);
    const [m1, m2] = ids(s, 'mafia');
    expect(getPlayerView(s, m1!).you?.teammates).toEqual([m2]);
    expect(getPlayerView(s, one(s, 'doctor')).you?.teammates).toBeUndefined();
  });
  it('public view has no roles at all before ended', () => {
    const v = getPublicView(mk(6));
    expect(v.you).toBeNull();
    expect(v.players.every((p) => !('role' in p))).toBe(true);
  });
  it('dead players roles stay hidden until ended, then all revealed', () => {
    let s = toNight(mk(8, 2));
    const victim = nonMafiaOf(s);
    s = toMorning(s, victim);
    const v = getPlayerView(s, one(s, 'mafia'));
    expect(v.players.find((p) => p.id === victim)).toEqual(expect.not.objectContaining({ role: expect.anything() }));
    s = go(toVote(s), { type: 'resolveVote' });
    expect(s.phase).toBe('night');
    let e = toNight(mk(8, 1, 1));
    e = go(toVote(toMorning(e)), { type: 'resolveVote' });
    expect(e.phase).toBe('ended');
    for (const viewer of e.players) {
      const ev = getPlayerView(e, viewer.id);
      expect(ev.players.map((p) => p.role)).toEqual(e.players.map((p) => p.role));
    }
    expect(getPublicView(e).players.map((p) => p.role)).toEqual(e.players.map((p) => p.role));
  });
});

describe('immutability', () => {
  function deepFreeze<T>(o: T): T {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.freeze(o);
      Object.values(o).forEach(deepFreeze);
    }
    return o;
  }
  it('does not mutate input state for any action', () => {
    let s = mk(6, 3);
    const actions = (st: GameState): Action[] => {
      const m = one(st, 'mafia');
      const nm = nonMafiaOf(st);
      return [
        { type: 'ready', playerId: 'p1' },
        { type: 'timeout' },
        { type: 'mafiaTarget', actorId: m, targetId: nm },
        { type: 'doctorProtect', actorId: one(st, 'doctor'), targetId: nm },
        { type: 'policeInvestigate', actorId: one(st, 'police'), targetId: m },
        { type: 'resolveNight' },
        { type: 'startDiscussion' },
        { type: 'speak', playerId: st.discussion?.order[0] ?? 'p1', text: 'hello' },
        { type: 'skipTurn' },
        { type: 'castVote', voterId: 'p1', targetId: 'p2' },
        { type: 'resolveVote' },
      ];
    };
    const walk: Action[] = [
      { type: 'timeout' },
      { type: 'mafiaTarget', actorId: one(s, 'mafia'), targetId: nonMafiaOf(s) },
      { type: 'resolveNight' },
      { type: 'startDiscussion' },
    ];
    const check = () => {
      const snap = JSON.stringify(s);
      deepFreeze(s);
      for (const a of actions(s)) {
        const r = applyAction(s, a);
        expect(JSON.stringify(s)).toBe(snap);
        if (r.ok) expect(r.state).not.toBe(s);
      }
    };
    check();
    for (const a of walk) {
      s = go(s, a);
      check();
    }
    while (s.phase === 'discussion') s = go(s, { type: 'skipTurn' });
    check();
  });
});
