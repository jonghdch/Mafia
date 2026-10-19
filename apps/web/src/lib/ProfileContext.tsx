import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { loadProfile, newId, saveProfile, type Character, type Profile } from "./profile";

interface ProfileValue {
  profile: Profile | null;
  /** 닉네임·사진·캐릭터를 저장한다. id 는 처음 한 번만 만든다. 저장소 쓰기에 성공하면 true. */
  save: (data: { nickname: string; photo: string | null; characters: Character[] }) => boolean;
}

const Ctx = createContext<ProfileValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(() => loadProfile());

  const save = useCallback<ProfileValue["save"]>(
    (data) => {
      const next: Profile = {
        id: profile?.id ?? newId(),
        nickname: data.nickname.trim(),
        photo: data.photo,
        characters: data.characters,
      };
      setProfile(next); // 저장소가 막혀도 이번 접속 동안은 메모리에서 쓴다
      return saveProfile(next);
    },
    [profile],
  );

  const value = useMemo(() => ({ profile, save }), [profile, save]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile(): ProfileValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("ProfileProvider 안에서만 쓸 수 있어요.");
  return v;
}
