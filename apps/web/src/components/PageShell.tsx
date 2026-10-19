import { ChevronLeft } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import styles from "./PageShell.module.css";

interface Props {
  title: string;
  back?: { to: string; label: string };
  action?: ReactNode;
  width?: "narrow" | "wide";
  children: ReactNode;
}

export function useDocTitle(title: string) {
  useEffect(() => {
    document.title = title === "마피아" ? title : `${title} · 마피아`;
  }, [title]);
}

export function PageShell({ title, back, action, width = "narrow", children }: Props) {
  useDocTitle(title);
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={`${styles.bar} ${width === "wide" ? styles.wide : ""}`}>
          {back ? (
            <Link to={back.to} className={styles.back}>
              <ChevronLeft size={18} aria-hidden="true" />
              {back.label}
            </Link>
          ) : (
            <span />
          )}
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.action}>{action}</div>
        </div>
      </header>
      <main className={`${styles.main} ${width === "wide" ? styles.wide : ""}`}>{children}</main>
    </div>
  );
}
