import { useState, type FormEvent } from "react";
import { useProfile } from "../lib/ProfileContext";
import { LIMITS, SAVE_FAILED_MESSAGE, validateNickname } from "../lib/profile";
import { Dialog } from "./Dialog";
import { ImagePicker } from "./ImagePicker";
import ui from "./ui.module.css";
import styles from "./ProfileSetupDialog.module.css";

interface Props {
  open: boolean;
  /** 취소·닫기·Esc */
  onClose: () => void;
  /** 프로필을 저장한 뒤 */
  onSaved: () => void;
}

/** 프로필 없이 방 만들기·들어가기로 갈 때 띄우는 사진·닉네임만 받는 팝업. */
export function ProfileSetupDialog({ open, onClose, onSaved }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title="프로필 만들기">
      <SetupForm onClose={onClose} onSaved={onSaved} />
    </Dialog>
  );
}

// Dialog 가 닫히면 이 폼은 사라지므로 다시 열 때마다 입력이 새로 시작한다.
function SetupForm({ onClose, onSaved }: Omit<Props, "open">) {
  const { profile, save } = useProfile();
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [photo, setPhoto] = useState<string | null>(profile?.photo ?? null);
  const [touched, setTouched] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const error = validateNickname(nickname);
  const shownError = touched || nickname.length > 0 ? error : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (error) return;
    if (!save({ nickname, photo, characters: profile?.characters ?? [] })) {
      setSaveFailed(true);
      return;
    }
    setSaveFailed(false);
    onSaved();
  };

  return (
    <form onSubmit={submit} className={styles.form} noValidate>
      <ImagePicker photo={photo} name={nickname} onChange={setPhoto} />

      <div className={ui.field}>
        <label className={ui.label} htmlFor="setup-nickname">닉네임</label>
        <input
          id="setup-nickname"
          className={ui.input}
          value={nickname}
          data-autofocus
          autoComplete="off"
          aria-describedby="setup-nickname-msg"
          aria-invalid={shownError ? true : undefined}
          onChange={(e) => setNickname(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        <p id="setup-nickname-msg" className={shownError ? ui.error : ui.hint} role="status" aria-live="polite">
          {shownError ?? `${LIMITS.nicknameMin}~${LIMITS.nicknameMax}자`}
        </p>
      </div>

      <p className={ui.hint}>캐릭터는 나중에 프로필에서 만들 수 있어요.</p>

      <p className={ui.error} role="status" aria-live="polite">
        {saveFailed ? SAVE_FAILED_MESSAGE : ""}
      </p>

      <div className={styles.footer}>
        <button type="button" className={ui.button} onClick={onClose}>
          취소
        </button>
        <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={error !== null}>
          저장하고 계속
        </button>
      </div>
    </form>
  );
}
