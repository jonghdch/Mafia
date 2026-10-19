import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import styles from "./Dialog.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement | null): HTMLElement[] {
  return root ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
}

export function Dialog({ open, onClose, title, children }: Props) {
  const [mounted, setMounted] = useState(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), 150);
    return () => clearTimeout(t);
  }, [open]);

  // 열릴 때 안쪽으로 포커스를 옮기고, 닫히면 열기 전 요소로 되돌린다.
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const list = focusables(panelRef.current);
    const first = list.find((el) => el.dataset.autofocus !== undefined) ?? list[0] ?? panelRef.current;
    first?.focus();
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, [open]);

  // 안쪽 요소가 사라져 포커스가 body 로 빠지면(예: 삭제 확인 단계로 버튼이 바뀔 때) 다시 안으로 모은다.
  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    const obs = new MutationObserver(() => {
      if (!panel.contains(document.activeElement)) (focusables(panel)[0] ?? panel).focus();
    });
    obs.observe(panel, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [open, mounted]);

  // 포커스가 이미 밖에 있을 때의 Tab 도 안으로 되돌린다.
  useEffect(() => {
    if (!open) return;
    const onDocKey = (e: globalThis.KeyboardEvent) => {
      const panel = panelRef.current;
      if (e.key !== "Tab" || !panel || panel.contains(document.activeElement)) return;
      e.preventDefault();
      const list = focusables(panel);
      (e.shiftKey ? list[list.length - 1] : list[0] ?? panel)?.focus();
    };
    document.addEventListener("keydown", onDocKey);
    return () => document.removeEventListener("keydown", onDocKey);
  }, [open, mounted]);

  if (!open && !mounted) return null;

  // 닫히는 150ms 동안 안쪽은 눌리지 않게 막는다 (빠른 더블클릭으로 저장이 두 번 도는 것 방지).
  const blockWhileClosing = (e: SyntheticEvent) => {
    if (open) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const list = focusables(panelRef.current);
    if (list.length === 0) {
      e.preventDefault();
      return;
    }
    const first = list[0]!;
    const last = list[list.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className={styles.overlay}
      data-state={open ? "open" : "closing"}
      onKeyDown={onKeyDown}
      onClickCapture={blockWhileClosing}
      onSubmitCapture={blockWhileClosing}
      {...(open ? {} : { inert: "" })}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
