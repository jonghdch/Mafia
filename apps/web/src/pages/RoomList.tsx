import { Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dialog } from "../components/Dialog";
import { PageShell } from "../components/PageShell";
import { Segmented } from "../components/Segmented";
import ui from "../components/ui.module.css";
import { CODE_PATTERN, MOCK_ROOMS, MODES, MODE_LABEL, STATUS_LABEL, THEMES, type Room } from "../lib/rooms";
import styles from "./RoomList.module.css";

type Tab = "all" | "public" | "private";
const ALL = "all";

export function RoomList() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("all");
  const [mode, setMode] = useState(ALL);
  const [theme, setTheme] = useState(ALL);
  const [onlyWaiting, setOnlyWaiting] = useState(false);
  const [code, setCode] = useState("");
  const [target, setTarget] = useState<{ open: boolean; room: Room | null }>({ open: false, room: null });

  const rooms = MOCK_ROOMS.filter(
    (r) =>
      (tab === "all" || r.visibility === tab) &&
      (mode === ALL || r.mode === mode) &&
      (theme === ALL || r.theme === theme) &&
      (!onlyWaiting || r.status === "waiting"),
  );

  const join = (r: Room) => {
    if (r.visibility === "private") setTarget({ open: true, room: r });
    else navigate(`/r/${r.code}`);
  };

  const submitCode = (e: FormEvent) => {
    e.preventDefault();
    if (CODE_PATTERN.test(code)) navigate(`/r/${code}`);
  };

  return (
    <PageShell
      title="방 들어가기"
      back={{ to: "/", label: "홈" }}
      width="wide"
      action={
        <Link to="/create" className={`${ui.button} ${styles.createBtn}`}>
          방 만들기
        </Link>
      }
    >
      <div className={styles.filters}>
        <Segmented<Tab>
          name="tab"
          legend="공개 범위"
          hideLegend
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: "전체" },
            { value: "public", label: "공개" },
            { value: "private", label: "비공개" },
          ]}
        />
        <div className={styles.inline}>
          <label className={ui.label} htmlFor="f-mode">모드</label>
          <select id="f-mode" className={`${ui.input} ${styles.select}`} value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value={ALL}>전체</option>
            {MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
          </select>
        </div>
        <div className={styles.inline}>
          <label className={ui.label} htmlFor="f-theme">테마</label>
          <select id="f-theme" className={`${ui.input} ${styles.select}`} value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value={ALL}>전체</option>
            {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <label className={ui.check}>
          <input type="checkbox" checked={onlyWaiting} onChange={(e) => setOnlyWaiting(e.target.checked)} />
          대기 중인 방만
        </label>
      </div>

      <form className={styles.codeForm} onSubmit={submitCode}>
        <label className={ui.label} htmlFor="code">초대 코드</label>
        <input
          id="code"
          className={`${ui.input} ${styles.code}`}
          value={code}
          maxLength={4}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="ABCD"
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))}
        />
        <button type="submit" className={ui.button} disabled={!CODE_PATTERN.test(code)}>
          참가
        </button>
      </form>

      <p className="sr-only" role="status" aria-live="polite">{`방 ${rooms.length}개`}</p>

      {rooms.length === 0 ? (
        <div className={styles.empty}>
          <p>지금 열린 방이 없어요. 직접 방을 만들어 보세요.</p>
          <Link to="/create" className={`${ui.button} ${ui.primary}`}>방 만들기</Link>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">방 이름</th>
              <th scope="col">모드</th>
              <th scope="col">테마</th>
              <th scope="col">인원</th>
              <th scope="col">상태</th>
              <th scope="col"><span className="sr-only">입장</span></th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => {
              const blocked = r.status !== "waiting";
              return (
                <tr key={r.code}>
                  <th scope="row" className={styles.name}>
                    {r.visibility === "private" && (
                      <>
                        <Lock size={14} aria-hidden="true" className={styles.lock} />
                        <span className="sr-only">비공개 </span>
                      </>
                    )}
                    {r.name}
                  </th>
                  <td>{MODE_LABEL[r.mode]}</td>
                  <td>{r.theme}</td>
                  <td className={styles.num}>{r.players} / {r.capacity}</td>
                  <td data-status={r.status}>{STATUS_LABEL[r.status]}</td>
                  <td className={styles.actionCell}>
                    <button
                      type="button"
                      className={ui.button}
                      disabled={blocked}
                      aria-label={`${r.name} 들어가기`}
                      onClick={() => join(r)}
                    >
                      들어가기
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <PasswordDialog
        open={target.open}
        room={target.room}
        onClose={() => setTarget((t) => ({ ...t, open: false }))}
        onSuccess={(r) => navigate(`/r/${r.code}`)}
      />
    </PageShell>
  );
}

function PasswordDialog({
  open,
  room,
  onClose,
  onSuccess,
}: {
  open: boolean;
  room: Room | null;
  onClose: () => void;
  onSuccess: (r: Room) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <>
          <Lock size={18} aria-hidden="true" />
          {room?.name}
        </>
      }
    >
      {room && <PasswordForm room={room} onClose={onClose} onSuccess={onSuccess} />}
    </Dialog>
  );
}

function PasswordForm({ room, onClose, onSuccess }: { room: Room; onClose: () => void; onSuccess: (r: Room) => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (pw === room.password) onSuccess(room);
    else setError("비밀번호가 맞지 않아요");
  };

  return (
    <form onSubmit={submit} className={styles.pwForm} noValidate>
      <div className={ui.field}>
        <label className={ui.label} htmlFor="join-pw">비밀번호</label>
        <input
          id="join-pw"
          className={`${ui.input} ${styles.pwInput}`}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={pw}
          data-autofocus
          aria-describedby="join-pw-msg"
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            setPw(e.target.value.replace(/\D/g, "").slice(0, 4));
            setError("");
          }}
        />
        <p id="join-pw-msg" className={ui.error} role="alert" aria-live="assertive">
          {error}
        </p>
      </div>
      <div className={styles.pwFooter}>
        <button type="button" className={ui.button} onClick={onClose}>취소</button>
        <button type="submit" className={`${ui.button} ${ui.primary}`}>입장</button>
      </div>
    </form>
  );
}
