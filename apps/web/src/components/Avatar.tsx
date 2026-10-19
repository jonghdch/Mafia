import styles from "./Avatar.module.css";

interface Props {
  photo: string | null;
  name: string;
  size?: number;
}

/** 장식용 아바타. 사진이 없으면 이름 첫 글자를 표면색 위에 보인다. */
export function Avatar({ photo, name, size = 40 }: Props) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  if (photo) {
    return <img className={styles.avatar} src={photo} alt="" aria-hidden="true" style={style} />;
  }
  const initial = [...name.trim()][0] ?? "?";
  return (
    <span className={`${styles.avatar} ${styles.fallback}`} aria-hidden="true" style={style}>
      {initial}
    </span>
  );
}
