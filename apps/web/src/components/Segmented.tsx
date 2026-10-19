import { Lock } from "lucide-react";
import styles from "./Segmented.module.css";

interface Option<T extends string> {
  value: T;
  label: string;
  /** 잠긴 옵션: 고를 수 없고 "준비 중" 으로 보인다. 키보드·스크린리더는 닿을 수 있어야 해서 disabled 가 아니라 aria-disabled 로 둔다. */
  locked?: boolean;
}

interface Props<T extends string> {
  name: string;
  legend: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  /** 잠긴 옵션을 눌렀을 때 (안내 문구용). */
  onLockedClick?: (v: T) => void;
  hideLegend?: boolean;
}

/**
 * 네이티브 radio 로 만든 분할 선택. 화살표 키 이동은 브라우저가 처리한다.
 * 선택지가 하나뿐이면 고를 게 없으니 읽기 전용 글자로만 보인다.
 */
export function Segmented<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  onLockedClick,
  hideLegend,
}: Props<T>) {
  const only = options.length === 1 ? options[0] : undefined;
  if (only) {
    return (
      <div className={styles.set} role="group" aria-label={legend}>
        <p className={hideLegend ? "sr-only" : styles.legend} aria-hidden="true">{legend}</p>
        <p className={styles.readonly}>{only.label}</p>
      </div>
    );
  }
  return (
    <fieldset className={styles.set}>
      <legend className={hideLegend ? "sr-only" : styles.legend}>{legend}</legend>
      <div className={styles.group}>
        {options.map((o) => (
          <label
            key={o.value}
            className={`${styles.item} ${o.locked ? styles.locked : ""}`}
          >
            <input
              type="radio"
              className={styles.input}
              name={name}
              value={o.value}
              checked={o.value === value}
              aria-disabled={o.locked ? true : undefined}
              // 클릭·Space·화살표 이동은 모두 change 로 들어온다. 잠긴 옵션은 값을 바꾸지 않고 안내만 띄운다.
              onChange={() => (o.locked ? onLockedClick?.(o.value) : onChange(o.value))}
              onKeyDown={
                o.locked
                  ? (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onLockedClick?.(o.value);
                      }
                    }
                  : undefined
              }
            />
            <span className={styles.face}>
              {o.locked && <Lock size={14} aria-hidden="true" />}
              {o.label}
              {o.locked && <span className={styles.soon}>준비 중</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
