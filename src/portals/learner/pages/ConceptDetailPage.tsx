// src/portals/learner/pages/ConceptDetailPage.tsx
// Chi tiết concept: layout kiểu W3Schools (sidebar TOC + nội dung + mini-game).
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Loader2, Check, List } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import { learnerLearningPathApi } from "@/services/api/learner/learningPath.api";
import { learnerProfileApi } from "@/services/api/learner/profile.api";
import { ConceptMiniGame } from "@/portals/learner/components/ConceptMiniGame";
import { getConceptContentComponent } from "@/portals/learner/concept-content";
import type { ConceptDetailDto, ConceptCompletionDto } from "@/types/api/learner/learningPath";
import { AlertToast } from "@/shared/components/AlertToast";
import styles from "./ConceptDetailPage.module.css";

/** Chuẩn hóa contentKey từ BE (có thể tiếng Việt hoặc tên khác) → key file/TOC/mini-game */
function getNormalizedContentKey(contentKey: string | null | undefined): string | null {
  if (!contentKey?.trim()) return null;
  const k = contentKey.toLowerCase().trim().replace(/\s+/g, "-").replace(/_/g, "-");
  const slug = k.replace(/[^a-z0-9-]/g, "");
  if (k === "if-else" || k.includes("if-else") || slug.includes("ifelse")) return "if-else";
  if (k === "variables" || k.includes("variable") || slug.includes("var") || slug.includes("bin"))
    return "variables";
  // Seed DB dùng ContentKey "operators" (Phép toán) — không chứa chuỗi "operation"
  if (k === "operators" || slug === "operators") return "operations";
  if (
    k === "operations" ||
    k.includes("operation") ||
    slug.includes("phep") ||
    slug.includes("toan") ||
    slug.includes("math") ||
    slug.includes("php") ||
    slug.includes("ton")
  )
    return "operations";
  if (k === "comparison" || k.includes("comparison") || slug.includes("sosanh") || slug.includes("so-sanh"))
    return "comparison";
  // while-loop must be before any rule that treats generic "loop" as for-loop
  if (
    k === "while-loop" ||
    k.includes("while-loop") ||
    k.includes("while loop") ||
    (k.includes("while") && !k.includes("for"))
  )
    return "while-loop";
  if (
    k === "for-loop" ||
    k.includes("for-loop") ||
    k.includes("for loop") ||
    slug.includes("forloop") ||
    slug.includes("loop") ||
    slug.includes("vonglap") ||
    slug.includes("vong-lap")
  )
    return "for-loop";
  if (
    k === "execution-order" ||
    k.includes("execution") ||
    k.includes("order") ||
    slug.includes("thutu") ||
    slug.includes("thucthi") ||
    slug.includes("thc")
  )
    return "execution-order";
  // Seed: "problem-analysis" — giữ tường minh, rule `includes("problem")` cũng đủ nhưng dễ va chạm sau này
  if (k === "problem-analysis" || k.includes("problem-analysis") || slug === "problemanalysis")
    return "problem-solving";
  if (k === "basic-algorithm" || k.includes("basic-algorithm") || slug.includes("thuattoan"))
    return "basic-algorithm";
  if (
    k === "problem-solving" ||
    k.includes("problem") ||
    k.includes("solving") ||
    slug.includes("phantich") ||
    slug.includes("baitoan") ||
    slug.includes("phan-tich")
  )
    return "problem-solving";
  return null;
}

/** Mục lục theo contentKey đã chuẩn hóa (if-else, variables, operations, execution-order) */
const TOC_BY_KEY: Record<string, { id: string; label: string }[]> = {
  "if-else": [
    { id: "section-intro", label: "Bài này học gì?" },
    { id: "section-1", label: "Hiểu đúng và sai" },
    { id: "section-2", label: "Hình dung: con đường rẽ đôi" },
    { id: "section-3", label: "Viết ra sao?" },
    { id: "section-4", label: "Ví dụ: Điểm đạt hay chưa?" },
    { id: "section-5", label: "Nhiều nhánh: else if" },
    { id: "section-6", label: "Trong game" },
    { id: "section-summary", label: "Ôn lại nhanh" },
  ],
  variables: [
    { id: "section-intro", label: "Bài này học gì?" },
    { id: "section-1", label: "Biến là gì?" },
    { id: "section-2", label: "Tại sao cần biến?" },
    { id: "section-3", label: "Gán và Đọc" },
    { id: "section-4", label: "Ví dụ trong game" },
    { id: "section-5", label: "Đặt tên biến" },
    { id: "section-summary", label: "Ôn lại nhanh" },
  ],
  operations: [
    { id: "section-intro", label: "Bài này học gì?" },
    { id: "section-1", label: "Bốn phép tính" },
    { id: "section-2", label: "Ví dụ trong game" },
    { id: "section-3", label: "Nhân/Chia trước" },
    { id: "section-4", label: "Dùng với biến" },
    { id: "section-5", label: "Tóm tắt bằng hình" },
    { id: "section-summary", label: "Ôn lại nhanh" },
  ],
  "execution-order": [
    { id: "section-intro", label: "Bài này học gì?" },
    { id: "section-1", label: "Đọc từ trên xuống" },
    { id: "section-2", label: "Ví dụ từng bước" },
    { id: "section-3", label: "Xếp khối trong game" },
    { id: "section-4", label: "Tại sao thứ tự quan trọng?" },
    { id: "section-summary", label: "Ôn lại nhanh" },
  ],
  "for-loop": [
    { id: "section-intro", label: "Bài này học gì?" },
    { id: "section-1", label: "Vòng lặp For là gì?" },
    { id: "section-2", label: "Viết for ra sao?" },
    { id: "section-3", label: "Ví dụ: Đếm 1 đến 3" },
    { id: "section-4", label: "Trong game" },
    { id: "section-5", label: "Lặp ngược và bước nhảy" },
    { id: "section-summary", label: "Ôn lại nhanh" },
  ],
  "while-loop": [
    { id: "section-intro", label: "Bài này học gì?" },
    { id: "section-1", label: "Cấu trúc tư duy" },
    { id: "section-2", label: "Vòng lặp vô hạn" },
    { id: "section-3", label: "Ví dụ đếm ngược" },
    { id: "section-summary", label: "Ôn lại nhanh" },
  ],
  comparison: [
    { id: "section-intro", label: "Bài này học gì?" },
    { id: "section-1", label: "Kết quả so sánh" },
    { id: "section-2", label: "Bảng gợi nhớ" },
    { id: "section-3", label: "Gắn với if" },
    { id: "section-summary", label: "Ôn lại nhanh" },
  ],
  "basic-algorithm": [
    { id: "section-intro", label: "Bài này học gì?" },
    { id: "section-1", label: "Thuật toán vs code" },
    { id: "section-2", label: "Input – bước – output" },
    { id: "section-3", label: "Ví dụ tìm max" },
    { id: "section-4", label: "Khi nào cần vòng lặp?" },
    { id: "section-summary", label: "Ôn lại nhanh" },
  ],
  "problem-solving": [
    { id: "section-intro", label: "Bài này học gì?" },
    { id: "section-1", label: "Đọc đề như checklist" },
    { id: "section-2", label: "Chia nhỏ bài toán" },
    { id: "section-3", label: "Thử tay bằng ví dụ" },
    { id: "section-4", label: "Pseudo-code trước" },
    { id: "section-summary", label: "Ôn lại nhanh" },
  ],
};

function normalizeConceptDetail(raw: Record<string, unknown>): ConceptDetailDto {
  return {
    id: String(raw.id ?? raw.Id ?? ""),
    learningGoalId: String(raw.learningGoalId ?? raw.LearningGoalId ?? ""),
    learningGoalName:
      raw.learningGoalName != null
        ? String(raw.learningGoalName)
        : raw.LearningGoalName != null
          ? String(raw.LearningGoalName)
          : null,
    name: String(raw.name ?? raw.Name ?? ""),
    description:
      raw.description != null
        ? String(raw.description)
        : raw.Description != null
          ? String(raw.Description)
          : null,
    contentKey:
      raw.contentKey != null
        ? String(raw.contentKey)
        : raw.ContentKey != null
          ? String(raw.ContentKey)
          : null,
    sortOrder: Number(raw.sortOrder ?? raw.SortOrder ?? 0),
  };
}

function normalizeCompletion(raw: Record<string, unknown>): ConceptCompletionDto {
  return {
    isCompleted: Boolean(raw.isCompleted ?? raw.IsCompleted),
    completedAt:
      raw.completedAt != null
        ? String(raw.completedAt)
        : raw.CompletedAt != null
          ? String(raw.CompletedAt)
          : null,
  };
}

/** Chuẩn hóa contentKey để thử với file: lowercase, thay space/underscore bằng hyphen */
function toSlug(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** Load nội dung theo contentKey từ public. Thử preferredKey (chuẩn hóa) trước, rồi key gốc, slug. */
async function loadContentByKey(
  contentKey: string,
  preferredKey?: string | null,
): Promise<string | null> {
  const keysToTry = [
    preferredKey,
    contentKey.trim(),
    toSlug(contentKey),
    contentKey.toLowerCase().trim(),
  ].filter((k): k is string => !!k && String(k).length > 0);
  const unique = [...new Set(keysToTry)];

  for (const key of unique) {
    const base = `/content/${key}`;
    try {
      const resHtml = await fetch(`${base}.html`, { method: "GET" });
      if (resHtml.ok) return await resHtml.text();
      const resMd = await fetch(`${base}.md`, { method: "GET" });
      if (resMd.ok) return await resMd.text();
    } catch {
      // try next key
    }
  }
  return null;
}

export default function ConceptDetailPage() {
  const { id: conceptId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [concept, setConcept] = useState<ConceptDetailDto | null>(null);
  const [completion, setCompletion] = useState<ConceptCompletionDto | null>(null);
  const [contentHtml, setContentHtml] = useState<string>("");
  const [loadingConcept, setLoadingConcept] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xpToast, setXpToast] = useState<string>("");

  const fetchConcept = useCallback(() => {
    if (!conceptId) return;
    setLoadingConcept(true);
    setError(null);
    learnerLearningPathApi
      .getConceptById(conceptId)
      .then((res) => {
        const raw = res.data as Record<string, unknown> | undefined;
        const payload = raw?.data ?? raw?.Data;
        if (payload && typeof payload === "object") {
          setConcept(normalizeConceptDetail(payload as Record<string, unknown>));
        } else {
          setError("Concept not found.");
        }
      })
      .catch(() => setError("Could not load concept."))
      .finally(() => setLoadingConcept(false));
  }, [conceptId]);

  const fetchCompletion = useCallback(() => {
    if (!conceptId) return;
    learnerLearningPathApi
      .getConceptCompletion(conceptId)
      .then((res) => {
        const raw = res.data as Record<string, unknown> | undefined;
        const payload = raw?.data ?? raw?.Data;
        if (payload && typeof payload === "object") {
          setCompletion(normalizeCompletion(payload as Record<string, unknown>));
        }
      })
      .catch(() => {});
  }, [conceptId]);

  useEffect(() => {
    fetchConcept();
  }, [fetchConcept]);

  useEffect(() => {
    fetchCompletion();
  }, [fetchCompletion]);

  // Load content by contentKey khi đã có concept (dùng normalized key để map "Biến là gì" → variables.html)
  useEffect(() => {
    const key = concept?.contentKey?.trim();
    if (!key) {
      setContentHtml("");
      return;
    }
    setLoadingContent(true);
    const preferredKey = getNormalizedContentKey(key);
    loadContentByKey(key, preferredKey ?? undefined)
      .then((text) => {
        if (text) {
          // Nếu là HTML thì render; nếu là markdown/plain thì hiển thị trong pre (hoặc có thể dùng thư viện markdown sau)
          const looksLikeHtml = text.trimStart().startsWith("<");
          setContentHtml(
            looksLikeHtml ? text : `<pre class="${styles.preContent}">${escapeHtml(text)}</pre>`,
          );
        } else {
          setContentHtml("");
        }
      })
      .finally(() => setLoadingContent(false));
  }, [concept?.contentKey]);

  if (!conceptId) {
    navigate(ROUTES.LEARNER_MY_PATH);
    return null;
  }

  const handleMarkComplete = async () => {
    setCompleting(true);
    try {
      const before = await learnerProfileApi.getMyXpProfile().catch(() => null);
      const res = await learnerLearningPathApi.completeConcept(conceptId);
      if (res.data?.isSuccess) {
        setCompleted(true);
        setCompletion((c) =>
          c ? { ...c, isCompleted: true } : { isCompleted: true, completedAt: null },
        );
        const after = await learnerProfileApi.getMyXpProfile().catch(() => null);
        const beforeXp = before?.data?.currentXp ?? null;
        const afterXp = after?.data?.currentXp ?? null;
        if (beforeXp != null && afterXp != null) {
          const delta = afterXp - beforeXp;
          if (delta > 0) {
            setXpToast(`+${delta} XP`);
            window.setTimeout(() => setXpToast(""), 2600);
          }
        }
        setTimeout(() => navigate(ROUTES.LEARNER_MY_PATH), 800);
        return;
      }
      window.alert(res.data?.message ?? "Could not mark as complete.");
    } catch {
      window.alert("Could not mark as complete.");
    } finally {
      setCompleting(false);
    }
  };

  const isCompleted = completed || completion?.isCompleted;
  const contentKeyNorm = getNormalizedContentKey(concept?.contentKey ?? null);
  const toc = contentKeyNorm ? TOC_BY_KEY[contentKeyNorm] : undefined;
  const contentNode = getConceptContentComponent(contentKeyNorm);

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.wrapper}>
        {xpToast ? <AlertToast type="success" message={xpToast} onClose={() => setXpToast("")} /> : null}
        {toc && toc.length > 0 && (
          <aside className={styles.sidebar} aria-label="Mục lục">
            <div className={styles.sidebarSticky}>
              <h3 className={styles.tocTitle}>
                <List size={18} /> Mục lục
              </h3>
              <nav className={styles.tocNav}>
                {toc.map((item) => (
                  <a key={item.id} href={`#${item.id}`} className={styles.tocLink}>
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}
        <div className={styles.main}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate(ROUTES.LEARNER_MY_PATH)}
            aria-label={t("back")}
          >
            <ChevronLeft size={20} />
            {t("backToPath")}
          </button>

          {loadingConcept ? (
            <p className={styles.noContent}>{t("loading")}</p>
          ) : error ? (
            <p className={styles.noContent}>{error}</p>
          ) : concept ? (
            <>
              <header className={styles.header}>
                <h1 className={styles.title}>{concept.name}</h1>
                {concept.description && <p className={styles.description}>{concept.description}</p>}
              </header>
              {loadingContent && concept.contentKey ? (
                <p className={styles.noContent}>{t("loading")}</p>
              ) : contentNode ? (
                <div className={styles.content}>{contentNode}</div>
              ) : contentHtml ? (
                <div className={styles.content} dangerouslySetInnerHTML={{ __html: contentHtml }} />
              ) : concept.contentKey ? (
                <p className={styles.noContent}>
                  {!contentKeyNorm
                    ? t("conceptContentKeyUnsupported").replace("{key}", concept.contentKey)
                    : t("conceptContent")}
                </p>
              ) : null}

              <ConceptMiniGame contentKey={contentKeyNorm ?? concept.contentKey} />

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.completeBtn}
                  onClick={handleMarkComplete}
                  disabled={completing || isCompleted}
                >
                  {completing ? (
                    <Loader2 size={18} className={styles.spinner} aria-hidden />
                  ) : isCompleted ? (
                    <Check size={18} aria-hidden />
                  ) : null}
                  {completing ? t("loading") : isCompleted ? t("completed") : t("markComplete")}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
