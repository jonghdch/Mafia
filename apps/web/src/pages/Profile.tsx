import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { ImagePicker } from "../components/ImagePicker";
import { PageShell } from "../components/PageShell";
import ui from "../components/ui.module.css";
import { useProfile } from "../lib/ProfileContext";
import { LIMITS, SAVE_FAILED_MESSAGE, validateNickname, type Character } from "../lib/profile";
import { CharacterDialog } from "./CharacterDialog";
import styles from "./Profile.module.css";

/** next 는 같은 사이트 안의 경로만 허용한다. */
function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) return raw;
  return "/";
}

export function Profile() {
  const { profile, save } = useProfile();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));

  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [photo, setPhoto] = useState<string | null>(profile?.photo ?? null);
  const [characters, setCharacters] = useState<Character[]>(profile?.characters ?? []);
  const [touched, setTouched] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [dialogFailed, setDialogFailed] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; character: Character | null }>({ open: false, character: null });

  const error = validateNickname(nickname);
  const shownError = touched || nickname.length > 0 ? error : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (error) return;
    if (!save({ nickname, photo, characters })) {
      setSaveFailed(true);
      return;
    }
    navigate(next, { replace: true });
  };

  // 캐릭터는 저장 버튼과 상관없이 바로 저장한다. 닉네임·사진은 디스크에 있는 값을 그대로 둔다.
  const commitCharacters = (list: Character[]) => {
    if (!save({ nickname: profile?.nickname ?? "", photo: profile?.photo ?? null, characters: list })) {
      setDialogFailed(true);
      return;
    }
    setDialogFailed(false);
    setCharacters(list);
    setDialog((d) => ({ ...d, open: false }));
  };
  const upsert = (c: Character) =>
    commitCharacters(characters.some((x) => x.id === c.id) ? characters.map((x) => (x.id === c.id ? c : x)) : [...characters, c]);
  const remove = (id: string) => commitCharacters(characters.filter((x) => x.id !== id));
  const closeDialog = () => {
    setDialogFailed(false);
    setDialog((d) => ({ ...d, open: false }));
  };

  return (
    <PageShell title="프로필" back={{ to: "/", label: "뒤로" }}>
      <form onSubmit={submit} className={styles.form} noValidate>
        <ImagePicker photo={photo} name={nickname} onChange={setPhoto} />

        <div className={ui.field}>
          <label className={ui.label} htmlFor="nickname">닉네임</label>
          <input
            id="nickname"
            className={ui.input}
            value={nickname}
            autoComplete="off"
            aria-describedby="nickname-msg"
            aria-invalid={shownError ? true : undefined}
            onChange={(e) => setNickname(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          <p id="nickname-msg" className={shownError ? ui.error : ui.hint} role="status" aria-live="polite">
            {shownError ?? `${LIMITS.nicknameMin}~${LIMITS.nicknameMax}자`}
          </p>
        </div>

        <section className={styles.chars} aria-labelledby="chars-h">
          <div className={styles.charsHead}>
            <div>
              <h2 id="chars-h" className={styles.h2}>내 캐릭터</h2>
              <p className={ui.hint}>나만 보여요.</p>
            </div>
            <button
              type="button"
              className={ui.button}
              disabled={characters.length >= LIMITS.maxCharacters}
              onClick={() => {
                setDialogFailed(false);
                setDialog({ open: true, character: null });
              }}
            >
              <Plus size={16} aria-hidden="true" />
              추가
            </button>
          </div>
          {characters.length === 0 ? (
            <p className={styles.empty}>아직 만든 캐릭터가 없어요.</p>
          ) : (
            <ul className={styles.list}>
              {characters.map((c) => (
                <li key={c.id} className={styles.row}>
                  <Avatar photo={c.photo} name={c.name} size={36} />
                  <div className={styles.rowText}>
                    <span className={styles.rowName}>{c.name}</span>
                    {c.intro && <span className={styles.rowIntro}>{c.intro}</span>}
                  </div>
                  <button
                    type="button"
                    className={`${ui.button} ${ui.ghost}`}
                    aria-label={`${c.name} 편집`}
                    onClick={() => {
                      setDialogFailed(false);
                      setDialog({ open: true, character: c });
                    }}
                  >
                    편집
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className={ui.error} role="status" aria-live="polite">
          {saveFailed ? SAVE_FAILED_MESSAGE : ""}
        </p>

        <div className={styles.submit}>
          <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={error !== null}>
            저장
          </button>
        </div>
      </form>

      <CharacterDialog
        open={dialog.open}
        character={dialog.character}
        onSave={upsert}
        onDelete={remove}
        onClose={closeDialog}
        error={dialogFailed ? SAVE_FAILED_MESSAGE : null}
      />
    </PageShell>
  );
}
