import { Link } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import ui from "../components/ui.module.css";
import styles from "./Placeholder.module.css";

export function Placeholder({ title, missing }: { title: string; missing?: boolean }) {
  return (
    <PageShell title={title}>
      <div className={styles.body}>
        <p>{missing ? "주소가 잘못됐거나 없어진 페이지예요." : "준비 중이에요."}</p>
        <Link to="/" className={`${ui.button} ${ui.primary}`}>
          홈으로
        </Link>
      </div>
    </PageShell>
  );
}
