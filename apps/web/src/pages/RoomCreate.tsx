import { Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { Segmented } from "../components/Segmented";
import ui from "../components/ui.module.css";
import {
  CAPACITIES,
  DEFAULT_ROOM_NAMES,
  MODES,
  MODE_LABEL,
  THEMES,
  compositionFor,
  randomRoomCode,
  type Capacity,
  type Visibility,
} from "../lib/rooms";
import type { GameMode } from "@mafia/engine";
import styles from "./RoomCreate.module.css";

const NAME_MAX = 20;

type ModeChoice = GameMode | "story";

function LockedTag() {
  return (
    <span className={styles.lockedTag}>
      <Lock size={14} aria-hidden="true" />
      준비 중
    </span>
  );
}

export function RoomCreate() {
  const navigate = useNavigate();
  const [name, setName] = useState(
    () => DEFAULT_ROOM_NAMES[Math.floor(Math.random() * DEFAULT_ROOM_NAMES.length)] ?? "오늘 밤의 마을",
  );
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [password, setPassword] = useState("");
  const [capacity, setCapacity] = useState<Capacity>(8);
  const [mode, setMode] = useState<GameMode>("classic");
  const [soon, setSoon] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameLen = [...name.trim()].length;
  const nameError = nameLen < 1 || nameLen > NAME_MAX ? `방 이름은 1~${NAME_MAX}자로 입력해 주세요.` : null;
  const pwError = visibility === "private" && !/^\d{4}$/.test(password) ? "비밀번호는 숫자 4자리예요." : null;
  const comp = compositionFor(mode, capacity);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (nameError || pwError) return;
    navigate(`/r/${randomRoomCode()}`);
  };

  return (
    <PageShell title="방 만들기" back={{ to: "/", label: "홈" }}>
      <form onSubmit={submit} className={styles.form} noValidate>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="room-name">방 이름</label>
          <input
            id="room-name"
            className={ui.input}
            value={name}
            autoComplete="off"
            aria-describedby="room-name-msg"
            aria-invalid={touched && nameError ? true : undefined}
            onChange={(e) => setName(e.target.value)}
          />
          <p id="room-name-msg" className={ui.error} role="status" aria-live="polite">
            {touched || name.length === 0 ? nameError ?? "" : ""}
          </p>
        </div>

        <Segmented<Visibility>
          name="visibility"
          legend="공개 설정"
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: "public", label: "공개" },
            { value: "private", label: "비공개" },
          ]}
        />

        {visibility === "private" && (
          <div className={ui.field}>
            <label className={ui.label} htmlFor="room-pw">비밀번호</label>
            <input
              id="room-pw"
              className={`${ui.input} ${styles.pw}`}
              value={password}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              aria-describedby="room-pw-msg"
              aria-invalid={touched && pwError ? true : undefined}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
            <p id="room-pw-msg" className={touched && pwError ? ui.error : ui.hint} role="status" aria-live="polite">
              {touched && pwError ? pwError : "숫자 4자리"}
            </p>
          </div>
        )}

        <div className={styles.modeBlock}>
          <Segmented<ModeChoice>
            name="mode"
            legend="모드"
            value={mode}
            onChange={(m) => {
              if (m === "story") return;
              setMode(m);
              setSoon(false);
            }}
            onLockedClick={() => setSoon(true)}
            options={[
              ...MODES.map((m) => ({ value: m, label: MODE_LABEL[m] })),
              { value: "story", label: "스토리", locked: true },
            ]}
          />
          <p className={styles.soonNote} role="status" aria-live="polite">{soon ? "곧 열려요" : ""}</p>
        </div>

        {mode === "classic" && (
          <div className={styles.lockedRow} role="group" aria-labelledby="map-label">
            <span id="map-label" className={ui.label}>맵</span>
            <span className={styles.lockedBody}>
              <input type="checkbox" role="switch" className={styles.switch} disabled aria-label="맵 사용" />
              <span>끔</span>
              <LockedTag />
            </span>
          </div>
        )}

        <div className={styles.lockedRow} role="group" aria-labelledby="special-label">
          <span id="special-label" className={ui.label}>특수 규칙</span>
          <span className={styles.lockedBody}>
            <LockedTag />
            <span>암전 · 침묵 · 랜덤 버프/디버프</span>
          </span>
        </div>

        <Segmented<string>
          name="theme"
          legend="테마"
          value={THEMES[0]}
          onChange={() => undefined}
          options={THEMES.map((t) => ({ value: t, label: t }))}
        />
        <Segmented<string>
          name="capacity"
          legend="정원"
          value={String(capacity)}
          onChange={(v) => setCapacity(Number(v) as Capacity)}
          options={CAPACITIES.map((c) => ({ value: String(c), label: `${c}명` }))}
        />

        <div className={styles.preview} aria-live="polite">
          <p className={styles.previewLabel}>직업 구성 미리보기 ({capacity}인)</p>
          <p data-testid="composition">
            마피아 {comp.mafia}
            {mode === "classic" && ` · 의사 ${comp.doctor} · 경찰 ${comp.police}`} · 시민 {comp.citizen}
          </p>
        </div>

        <div className={styles.submit}>
          <button type="submit" className={`${ui.button} ${ui.primary}`}>
            방 만들기
          </button>
        </div>
      </form>
    </PageShell>
  );
}
