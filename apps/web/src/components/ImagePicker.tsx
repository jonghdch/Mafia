import { useId, useRef, useState } from "react";
import { fileToAvatar, isImageFile } from "../lib/image";
import { Avatar } from "./Avatar";
import ui from "./ui.module.css";
import styles from "./ImagePicker.module.css";

interface Props {
  photo: string | null;
  name: string;
  onChange: (photo: string | null) => void;
}

export function ImagePicker({ photo, name, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const msgId = useId();
  const [message, setMessage] = useState("");

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!isImageFile(file)) {
      setMessage("이미지 파일만 올릴 수 있어요.");
      return;
    }
    try {
      onChange(await fileToAvatar(file));
      setMessage("");
    } catch {
      setMessage("이미지를 읽지 못했어요. 다른 파일로 다시 시도해 주세요.");
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <Avatar photo={photo} name={name} size={72} />
        <div className={styles.actions}>
          <button type="button" className={ui.button} onClick={() => inputRef.current?.click()}>
            사진 바꾸기
          </button>
          <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => { onChange(null); setMessage(""); }} disabled={photo === null}>
            기본 이미지로
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="사진 파일 선택"
        aria-describedby={msgId}
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <p id={msgId} className={ui.error} role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
