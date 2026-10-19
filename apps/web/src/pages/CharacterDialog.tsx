import { useState, type FormEvent } from "react";
import { Dialog } from "../components/Dialog";
import { ImagePicker } from "../components/ImagePicker";
import ui from "../components/ui.module.css";
import { LIMITS, newId, validateCharacter, type Character } from "../lib/profile";
import styles from "./CharacterDialog.module.css";

interface Props {
  open: boolean;
  /** null 이면 새 캐릭터 */
  character: Character | null;
  onSave: (c: Character) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  /** 저장 실패 안내 문구 */
  error?: string | null;
}

export function CharacterDialog({ open, character, onSave, onDelete, onClose, error }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title="캐릭터 편집">
      <CharacterForm character={character} onSave={onSave} onDelete={onDelete} onClose={onClose} error={error} />
    </Dialog>
  );
}

function CharacterForm({ character, onSave, onDelete, onClose, error }: Omit<Props, "open">) {
  const [name, setName] = useState(character?.name ?? "");
  const [intro, setIntro] = useState(character?.intro ?? "");
  const [personality, setPersonality] = useState(character?.personality ?? "");
  const [photo, setPhoto] = useState<string | null>(character?.photo ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [touched, setTouched] = useState(false);

  const errors = validateCharacter({ name, intro, personality });
  const valid = Object.keys(errors).length === 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    onSave({
      id: character?.id ?? newId(),
      name: name.trim(),
      intro: intro.trim(),
      personality: personality.trim(),
      photo,
    });
  };

  const showName = touched || name.length > 0 ? errors.name : undefined;

  return (
    <form onSubmit={submit} className={styles.form} noValidate>
      <ImagePicker photo={photo} name={name} onChange={setPhoto} />

      <div className={ui.field}>
        <label className={ui.label} htmlFor="char-name">이름</label>
        <input
          id="char-name"
          className={ui.input}
          value={name}
          data-autofocus
          autoComplete="off"
          aria-describedby="char-name-msg"
          aria-invalid={showName ? true : undefined}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        <p id="char-name-msg" className={ui.error} role="status" aria-live="polite">
          {showName ?? ""}
        </p>
      </div>

      <div className={ui.field}>
        <label className={ui.label} htmlFor="char-intro">한 줄 소개</label>
        <input
          id="char-intro"
          className={ui.input}
          value={intro}
          autoComplete="off"
          aria-describedby="char-intro-msg"
          aria-invalid={errors.intro ? true : undefined}
          onChange={(e) => setIntro(e.target.value)}
        />
        <p id="char-intro-msg" className={errors.intro ? ui.error : ui.hint} role="status" aria-live="polite">
          {errors.intro ?? `${[...intro].length} / ${LIMITS.introMax}`}
        </p>
      </div>

      <div className={ui.field}>
        <label className={ui.label} htmlFor="char-personality">성격·말투</label>
        <textarea
          id="char-personality"
          className={ui.input}
          value={personality}
          rows={4}
          aria-describedby="char-personality-msg"
          aria-invalid={errors.personality ? true : undefined}
          onChange={(e) => setPersonality(e.target.value)}
        />
        <p
          id="char-personality-msg"
          className={errors.personality ? ui.error : ui.hint}
          role="status"
          aria-live="polite"
        >
          {errors.personality ?? `${[...personality].length} / ${LIMITS.personalityMax}`}
        </p>
      </div>

      <p className={ui.error} role="status" aria-live="polite">
        {error ?? ""}
      </p>

      {confirmDelete ? (
        <div className={styles.confirm} role="alertdialog" aria-label="캐릭터 삭제 확인">
          <p>이 캐릭터를 삭제할까요? 되돌릴 수 없어요.</p>
          <div className={styles.footerRight}>
            <button type="button" className={ui.button} onClick={() => setConfirmDelete(false)}>
              취소
            </button>
            <button
              type="button"
              className={`${ui.button} ${ui.danger}`}
              onClick={() => character && onDelete(character.id)}
            >
              삭제
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.footer}>
          {character ? (
            <button type="button" className={`${ui.button} ${ui.danger}`} onClick={() => setConfirmDelete(true)}>
              삭제
            </button>
          ) : (
            <span />
          )}
          <div className={styles.footerRight}>
            <button type="button" className={ui.button} onClick={onClose}>
              취소
            </button>
            <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={!valid}>
              저장
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
