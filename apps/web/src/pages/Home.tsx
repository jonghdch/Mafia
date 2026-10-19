import { ChevronRight, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { useDocTitle } from "../components/PageShell";
import { ProfileSetupDialog } from "../components/ProfileSetupDialog";
import { useProfile } from "../lib/ProfileContext";
import { hasValidProfile } from "../lib/profile";
import styles from "./Home.module.css";

const MENU = [
  { to: "/create", ko: "방 만들기", en: "NEW ROOM" },
  { to: "/rooms", ko: "방 들어가기", en: "JOIN ROOM" },
  { to: "/replays", ko: "지난 사건 일지", en: "CASE FILES" },
  { to: "/profile", ko: "프로필", en: "PROFILE" },
] as const;

/** 프로필이 있어야 갈 수 있는 메뉴 */
const GUARDED: ReadonlySet<string> = new Set(["/create", "/rooms"]);

export function Home() {
  useDocTitle("마피아");
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [active, setActive] = useState(0);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const activeRef = useRef(active);
  activeRef.current = active;
  // 프로필이 없을 때 방 만들기·들어가기를 고르면 이동 대신 팝업을 띄우고, 고른 항목을 기억한다.
  const [pending, setPending] = useState<number | null>(null);
  const validRef = useRef(false);
  validRef.current = hasValidProfile(profile);

  const choose = (i: number) => {
    if (GUARDED.has(MENU[i]!.to) && !validRef.current) setPending(i);
    else navigate(MENU[i]!.to);
  };
  const chooseRef = useRef(choose);
  chooseRef.current = choose;

  // 팝업이 닫히면 포커스를 고른 메뉴 항목으로 돌린다.
  const lastPending = useRef<number | null>(null);
  useEffect(() => {
    if (pending === null && lastPending.current !== null) itemRefs.current[lastPending.current]?.focus();
    lastPending.current = pending;
  }, [pending]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 팝업이 떠 있거나 입력란에서 누른 키는 팝업·입력란의 것이다
      if (document.querySelector('[aria-modal="true"]')) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || el.closest("input, textarea, select"))) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        const next = (activeRef.current + step + MENU.length) % MENU.length;
        setActive(next);
        itemRefs.current[next]?.focus();
      } else if (e.key === "Enter") {
        // 링크·버튼에 포커스가 있으면 브라우저가 직접 처리한다
        const t = e.target as HTMLElement | null;
        if (t && (t.closest("a") || t.closest("button"))) return;
        chooseRef.current(activeRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const valid = hasValidProfile(profile);

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link
          to="/profile"
          className={styles.profileCard}
          aria-label={valid ? `프로필: ${profile.nickname}` : "프로필 만들기"}
        >
          {valid ? (
            <>
              <Avatar photo={profile.photo} name={profile.nickname} size={28} />
              <span className={styles.nick}>{profile.nickname}</span>
            </>
          ) : (
            <>
              <UserRound size={18} aria-hidden="true" />
              <span className={styles.nick}>프로필 만들기</span>
            </>
          )}
        </Link>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>마피아</h1>
        <nav aria-label="메인 메뉴">
          <ul className={styles.menu}>
            {MENU.map((m, i) => (
              <li key={m.to}>
                <Link
                  to={m.to}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  className={styles.item}
                  data-active={i === active}
                  onClick={(e) => {
                    if (GUARDED.has(m.to) && !valid) {
                      e.preventDefault();
                      setPending(i);
                    }
                  }}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                >
                  <ChevronRight className={styles.marker} size={20} aria-hidden="true" />
                  <span className={styles.ko}>{m.ko}</span>
                  <span className={styles.en}>{m.en}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className={styles.hint} aria-hidden="true">
          ↑↓ 이동 · Enter 선택
        </p>
      </main>

      <footer className={styles.footer}>
        <p>AI 플레이어의 발언과 사회자의 내레이션은 AI가 생성합니다.</p>
        <div className={styles.legal}>
          <span>
            <Link to="/terms" className={styles.footLink}>이용약관</Link>
            {" · "}
            <Link to="/privacy" className={styles.footLink}>개인정보처리방침</Link>
          </span>
          <span>© 2026 Jeong Hong Cho</span>
        </div>
      </footer>

      <ProfileSetupDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onSaved={() => {
          const to = MENU[pending!]!.to;
          setPending(null);
          navigate(to);
        }}
      />
    </div>
  );
}
