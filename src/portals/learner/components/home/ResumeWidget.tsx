import { Link } from "react-router-dom";
import styles from "./GalaxyHome.module.css";
import type { ResumeState } from "@/portals/learner/components/home/home.types";

export default function ResumeWidget({ resume }: { resume: ResumeState }) {
  return (
    <div className={`card ${styles.widget}`} style={{ padding: 12 }}>
      <div className={styles.widgetTitle}>Resume Journey</div>
      <div className={styles.widgetBody}>
        <div style={{ fontWeight: 700 }}>{resume.title}</div>
        <div className={styles.muted} style={{ marginTop: 6 }}>
          {resume.progressText}
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <Link className="btn" to={resume.href}>
          Resume
        </Link>
      </div>
    </div>
  );
}
