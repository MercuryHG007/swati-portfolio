import type { ReactNode } from "react";
import styles from "./card-title.module.css";

// Underlines the title when the enclosing `.group` card is hovered or focused.
export function CardTitle({ children }: { children: ReactNode }) {
  return <span className={styles.underline}>{children}</span>;
}
