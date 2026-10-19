export const PROFILE_KEY = "mafia.profile.v1";

export const LIMITS = {
  nicknameMin: 2,
  nicknameMax: 10,
  charNameMin: 1,
  charNameMax: 12,
  introMax: 40,
  personalityMax: 200,
  maxCharacters: 10, // 임시값
} as const;

export interface Character {
  id: string;
  name: string;
  intro: string;
  personality: string;
  photo: string | null;
}

export interface Profile {
  id: string;
  nickname: string;
  photo: string | null;
  characters: Character[];
}

export function newId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const len = (s: string) => [...s].length;

/** 에러 문구를 돌려준다. 유효하면 null. */
export function validateNickname(raw: string): string | null {
  const n = len(raw.trim());
  if (n < LIMITS.nicknameMin || n > LIMITS.nicknameMax) {
    return `닉네임은 ${LIMITS.nicknameMin}~${LIMITS.nicknameMax}자로 입력해 주세요.`;
  }
  return null;
}

export interface CharacterErrors {
  name?: string;
  intro?: string;
  personality?: string;
}

export function validateCharacter(c: Pick<Character, "name" | "intro" | "personality">): CharacterErrors {
  const errors: CharacterErrors = {};
  const n = len(c.name.trim());
  if (n < LIMITS.charNameMin || n > LIMITS.charNameMax) {
    errors.name = `이름은 ${LIMITS.charNameMin}~${LIMITS.charNameMax}자로 입력해 주세요.`;
  }
  if (len(c.intro) > LIMITS.introMax) {
    errors.intro = `한 줄 소개는 ${LIMITS.introMax}자까지 쓸 수 있어요.`;
  }
  if (len(c.personality) > LIMITS.personalityMax) {
    errors.personality = `성격·말투는 ${LIMITS.personalityMax}자까지 쓸 수 있어요.`;
  }
  return errors;
}

export function hasValidProfile(p: Profile | null): p is Profile {
  return p !== null && validateNickname(p.nickname) === null;
}

const isStr = (v: unknown): v is string => typeof v === "string";
const photoOf = (v: unknown): string | null => (isStr(v) ? v : null);

function parseCharacter(v: unknown): Character | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  if (!isStr(o.id) || !isStr(o.name)) return null;
  return {
    id: o.id,
    name: o.name,
    intro: isStr(o.intro) ? o.intro : "",
    personality: isStr(o.personality) ? o.personality : "",
    photo: photoOf(o.photo),
  };
}

/** 저장된 프로필. 없거나 깨졌거나 저장소를 못 쓰면 null. */
export function loadProfile(): Profile | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const o: unknown = JSON.parse(raw);
    if (typeof o !== "object" || o === null) return null;
    const r = o as Record<string, unknown>;
    if (!isStr(r.id) || !r.id || !isStr(r.nickname)) return null;
    const characters = Array.isArray(r.characters)
      ? r.characters.map(parseCharacter).filter((c): c is Character => c !== null)
      : [];
    return { id: r.id, nickname: r.nickname, photo: photoOf(r.photo), characters };
  } catch {
    return null;
  }
}

/** 저장에 성공하면 true. */
export function saveProfile(profile: Profile): boolean {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

/** 저장소 쓰기가 실패했을 때 폼에 보여주는 안내. */
export const SAVE_FAILED_MESSAGE = "저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.";
