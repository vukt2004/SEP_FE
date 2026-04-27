// src/portals/learner/pages/ProfilePage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  learnerProfileApi,
  type MyXpProfileResponse,
  type ProfileResponse,
} from "@/services/api/learner/profile.api";
import { learnerGameplayApi } from "@/services/api/learner/gameplay.api";
import { learnerXpApi } from "@/services/api/learner/xp.api";
import type { MapPlayHistoryItem, PaginationResult } from "@/types/api/learner/gameplay";
import type { XpHistoryItem } from "@/types/api/learner/xp";
import { useTranslation } from "@/lib/i18n/translations";
import styles from "./ProfilePage.module.css";
import {
  Camera,
  Save,
  Edit3,
  X,
  CheckCircle,
  AlertCircle,
  Mail,
  Calendar,
  VenusAndMars,
  Hash,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Maximize2,
} from "lucide-react";

type FormState = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  avatarFile: File | null;
};

function isRealProfileImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return !url.includes("/brand/avatar-fallback.png");
}

/** Hiển thị tối đa mỗi “trang” con trong tab XP / Lịch sử đấu */
const PROFILE_ACTIVITY_PAGE_SIZE = 5;
/** Một lần tải XP history để tính 7 ngày + chia trang client */
const PROFILE_XP_HISTORY_FETCH_SIZE = 100;

function interpolate(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, String(v)), template);
}

type PaginationSlot = number | "ellipsis";

/** Gần giống mẫu: 1–5 … 10 khi đang ở đầu; co cụm khi ở giữa / cuối. */
function buildPaginationItems(current: number, total: number): PaginationSlot[] {
  if (total < 1) return [];
  if (total === 1) return [1];
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", total];
  }
  if (current >= total - 3) {
    return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

function ProfilePagination(props: {
  currentPage: number;
  totalPages: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  previousLabel: string;
  nextLabel: string;
  navAriaLabel: string;
  pageAria: (page: number) => string;
}) {
  const { currentPage, totalPages, disabled, onPageChange, previousLabel, nextLabel, navAriaLabel, pageAria } =
    props;
  const slots = useMemo(
    () => buildPaginationItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  if (totalPages <= 1) return null;

  return (
    <nav className={styles.profilePagination} aria-label={navAriaLabel}>
      <button
        type="button"
        className={styles.profilePaginationSideBtn}
        disabled={disabled || currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft size={18} strokeWidth={2} aria-hidden className={styles.profilePaginationChevron} />
        <span>{previousLabel}</span>
      </button>

      <div className={styles.profilePaginationPages}>
        {slots.map((slot, idx) =>
          slot === "ellipsis" ? (
            <span key={`ellipsis-${idx}`} className={styles.profilePaginationEllipsis} aria-hidden>
              …
            </span>
          ) : slot === currentPage ? (
            <span key={slot} className={styles.profilePaginationPageActive} aria-current="page">
              {slot}
            </span>
          ) : (
            <button
              key={slot}
              type="button"
              className={styles.profilePaginationPage}
              disabled={disabled}
              aria-label={pageAria(slot)}
              onClick={() => onPageChange(slot)}
            >
              {slot}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        className={styles.profilePaginationSideBtn}
        disabled={disabled || currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <span>{nextLabel}</span>
        <ChevronRight size={18} strokeWidth={2} aria-hidden className={styles.profilePaginationChevron} />
      </button>
    </nav>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    avatarFile: null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [playHistory, setPlayHistory] = useState<PaginationResult<MapPlayHistoryItem> | null>(null);
  const [xpProfile, setXpProfile] = useState<MyXpProfileResponse | null>(null);
  const [xpHistory, setXpHistory] = useState<XpHistoryItem[]>([]);
  const [xpChunkIndex, setXpChunkIndex] = useState(0);
  const [profileActivityTab, setProfileActivityTab] = useState<"xp" | "history">("history");
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const fullName = useMemo(() => {
    const fn = form.firstName?.trim();
    const ln = form.lastName?.trim();
    return [fn, ln].filter(Boolean).join(" ") || "Unnamed";
  }, [form.firstName, form.lastName]);

  const avatarPreviewUrl = useMemo(() => {
    if (form.avatarFile) return URL.createObjectURL(form.avatarFile);
    return null;
  }, [form.avatarFile]);

  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxSrc(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxSrc]);

  const hasChanges = useMemo(() => {
    const p = profile;
    if (!p) return false;
    const fnChanged = form.firstName.trim() !== (p.firstName ?? "");
    const lnChanged = form.lastName.trim() !== (p.lastName ?? "");
    const phoneChanged = form.phoneNumber.trim() !== (p.phoneNumber ?? "");
    const avatarChanged = form.avatarFile !== null;
    return fnChanged || lnChanged || phoneChanged || avatarChanged;
  }, [profile, form.firstName, form.lastName, form.phoneNumber, form.avatarFile]);

  const enterEditMode = () => {
    setError(null);
    setSuccessMsg(null);
    setForm({
      firstName: profile?.firstName ?? "",
      lastName: profile?.lastName ?? "",
      phoneNumber: profile?.phoneNumber ?? "",
      avatarFile: null,
    });
    setIsEditMode(true);
  };

  const cancelEdit = () => {
    setForm({
      firstName: profile?.firstName ?? "",
      lastName: profile?.lastName ?? "",
      phoneNumber: profile?.phoneNumber ?? "",
      avatarFile: null,
    });
    setError(null);
    setIsEditMode(false);
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);
      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const [profileRes, historyRes, xpRes, xpHistoryRes] = await Promise.all([
          learnerProfileApi.getProfile(),
          learnerGameplayApi.getMyPlayHistory({ pageNumber: 1, pageSize: PROFILE_ACTIVITY_PAGE_SIZE }),
          learnerProfileApi.getMyXpProfile(),
          learnerXpApi.getMyHistory(1, PROFILE_XP_HISTORY_FETCH_SIZE),
        ]);

        if (!alive) return;

        if (profileRes.isSuccess) {
          const p = profileRes.data ?? null;
          setProfile(p);
          setForm({
            firstName: p?.firstName ?? "",
            lastName: p?.lastName ?? "",
            phoneNumber: p?.phoneNumber ?? "",
            avatarFile: null,
          });
        } else {
          setError(profileRes.message ?? t("failedLoadProfile"));
        }

        if (historyRes.isSuccess) {
          setPlayHistory(historyRes.data ?? null);
        } else {
          setHistoryError(historyRes.message ?? t("profileHistoryLoadFailed"));
        }

        if (xpRes.isSuccess) {
          setXpProfile(xpRes.data ?? null);
        }

        if (xpHistoryRes?.data?.isSuccess) {
          setXpHistory(xpHistoryRes.data.data?.items ?? []);
        }
      } catch {
        if (!alive) return;
        setError("Failed to load profile");
        setHistoryError(t("profileHistoryLoadFailed"));
      } finally {
        if (alive) setLoading(false);
        if (alive) setHistoryLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [t]);

  const xpLast7Days = useMemo(() => {
    const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return xpHistory.reduce((sum, item) => {
      const createdAt = item.createdAt ? Date.parse(item.createdAt) : NaN;
      if (!Number.isFinite(createdAt) || createdAt < threshold) return sum;
      return sum + item.delta;
    }, 0);
  }, [xpHistory]);

  const xpChunks = useMemo(() => {
    if (xpHistory.length === 0) return [];
    const chunks: XpHistoryItem[][] = [];
    for (let i = 0; i < xpHistory.length; i += PROFILE_ACTIVITY_PAGE_SIZE) {
      chunks.push(xpHistory.slice(i, i + PROFILE_ACTIVITY_PAGE_SIZE));
    }
    return chunks;
  }, [xpHistory]);

  useEffect(() => {
    if (xpChunks.length === 0) return;
    if (xpChunkIndex >= xpChunks.length) {
      setXpChunkIndex(xpChunks.length - 1);
    }
  }, [xpChunks.length, xpChunkIndex]);

  const visibleXpItems = xpChunks[xpChunkIndex] ?? [];

  const loadPlayHistoryPage = useCallback(async (page: number) => {
    setHistoryRefreshing(true);
    setHistoryError(null);
    try {
      const historyRes = await learnerGameplayApi.getMyPlayHistory({
        pageNumber: page,
        pageSize: PROFILE_ACTIVITY_PAGE_SIZE,
      });
      if (historyRes.isSuccess) {
        setPlayHistory(historyRes.data ?? null);
      } else {
        setHistoryError(historyRes.message ?? t("profileHistoryLoadFailed"));
      }
    } catch {
      setHistoryError(t("profileHistoryLoadFailed"));
    } finally {
      setHistoryRefreshing(false);
    }
  }, [t]);

  const onPickAvatar = (file: File | null) => {
    setSuccessMsg(null);
    setForm((s) => ({ ...s, avatarFile: file }));
  };

  const uploadCoverImage = async (file: File) => {
    const p = profile;
    if (!p) return;
    setCoverUploading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await learnerProfileApi.updateProfile({
        firstName: (p.firstName ?? "").trim(),
        lastName: (p.lastName ?? "").trim(),
        phoneNumber: (p.phoneNumber ?? "").trim(),
        coverImageFile: file,
      });
      if (res.isSuccess && res.data) {
        setProfile(res.data);
        setSuccessMsg(t("profileWallUpdated"));
      } else {
        setError(res.message ?? t("updateFailed"));
      }
    } catch {
      setError(t("updateFailed"));
    } finally {
      setCoverUploading(false);
    }
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await learnerProfileApi.updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        avatarFile: form.avatarFile,
      });

      if (!res.isSuccess) {
        setError(res.message ?? t("updateFailed"));
        return;
      }

      const p = res.data ?? null;
      setProfile(p);
      setForm((s) => ({ ...s, avatarFile: null }));
      setSuccessMsg(t("saved"));
      setIsEditMode(false);
    } catch (_err) {
      console.error(_err);
      setError("Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.bg} aria-hidden />
        <div className={styles.content}>
          <div className={styles.loadingCard}>
            <div className={styles.loadingCardTitle} />
            <div className={styles.loadingContent}>
              <div className={styles.loadingAvatar} />
              <div className={styles.loadingMeta}>
                <div className={styles.loadingLine} />
                <div className={styles.loadingLine} style={{ width: "70%", marginTop: 12 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.content}>
        {/* Facebook-style: cover + identity bar */}
        <div className={styles.profileHero}>
          <div className={styles.coverWrap}>
            <div
              className={`${styles.cover} ${profile?.coverImagePath ? styles.coverHasImage : ""} ${
                profile?.coverImagePath ? styles.coverViewable : ""
              }`}
              style={
                profile?.coverImagePath
                  ? {
                      backgroundImage: `url(${profile.coverImagePath})`,
                    }
                  : undefined
              }
              role={profile?.coverImagePath ? "button" : undefined}
              tabIndex={profile?.coverImagePath ? 0 : undefined}
              aria-label={profile?.coverImagePath ? t("profileViewCover") : undefined}
              onClick={() => {
                if (profile?.coverImagePath) setLightboxSrc(profile.coverImagePath);
              }}
              onKeyDown={(e) => {
                if (!profile?.coverImagePath) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setLightboxSrc(profile.coverImagePath);
                }
              }}
            />
            <div className={styles.coverActions}>
              <label
                className={`${styles.coverUploadLabel} ${coverUploading ? styles.coverUploadLabelBusy : ""}`}
              >
                <input
                  type="file"
                  accept="image/*"
                  className={styles.coverFileInput}
                  disabled={coverUploading}
                  onChange={(e) => {
                    const f = e.currentTarget.files?.[0];
                    e.currentTarget.value = "";
                    if (f) void uploadCoverImage(f);
                  }}
                />
                {coverUploading ? (
                  <Loader2 size={18} className={styles.coverUploadSpinner} aria-hidden />
                ) : (
                  <ImagePlus size={18} aria-hidden />
                )}
                <span>{t("profileChangeWallPhoto")}</span>
              </label>
            </div>
          </div>
          <div className={styles.identityBar}>
            <div className={styles.avatarWrap}>
              {isEditMode ? (
                <div className={styles.avatarWrapperFb}>
                  {(avatarPreviewUrl || isRealProfileImageUrl(profile?.avatarPath)) && (
                    <button
                      type="button"
                      className={styles.avatarViewBtn}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const src = avatarPreviewUrl ?? profile?.avatarPath;
                        if (src) setLightboxSrc(src);
                      }}
                      aria-label={t("profileViewPhoto")}
                      title={t("profileViewPhoto")}
                    >
                      <Maximize2 size={16} strokeWidth={2.5} />
                    </button>
                  )}
                  <label className={styles.avatarLabelBlock}>
                    <img
                      src={avatarPreviewUrl ?? profile?.avatarPath ?? "/brand/avatar-fallback.png"}
                      alt="Avatar"
                      className={styles.avatarImg}
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        const fallbackSrc = "/brand/avatar-fallback.png";
                        if (img.dataset.fallbackTried === "1") return;
                        img.dataset.fallbackTried = "1";
                        if (!img.src.includes(fallbackSrc)) img.src = fallbackSrc;
                      }}
                    />
                    <div className={styles.avatarOverlay}>
                      <Camera size={24} />
                      <span className={styles.avatarOverlayText}>Change photo</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onPickAvatar(e.currentTarget.files?.[0] ?? null)}
                      className={styles.avatarInput}
                    />
                  </label>
                </div>
              ) : (
                <div
                  className={`${styles.avatarWrapperFb} ${styles.avatarWrapperStatic} ${
                    isRealProfileImageUrl(profile?.avatarPath) ? styles.avatarViewable : ""
                  }`}
                  role={isRealProfileImageUrl(profile?.avatarPath) ? "button" : undefined}
                  tabIndex={isRealProfileImageUrl(profile?.avatarPath) ? 0 : undefined}
                  aria-label={isRealProfileImageUrl(profile?.avatarPath) ? t("profileViewPhoto") : undefined}
                  onClick={() => {
                    if (isRealProfileImageUrl(profile?.avatarPath)) setLightboxSrc(profile!.avatarPath!);
                  }}
                  onKeyDown={(e) => {
                    if (!isRealProfileImageUrl(profile?.avatarPath)) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setLightboxSrc(profile!.avatarPath!);
                    }
                  }}
                >
                  <img
                    src={profile?.avatarPath ?? "/brand/avatar-fallback.png"}
                    alt="Avatar"
                    className={styles.avatarImg}
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      const fallbackSrc = "/brand/avatar-fallback.png";
                      if (img.dataset.fallbackTried === "1") return;
                      img.dataset.fallbackTried = "1";
                      if (!img.src.includes(fallbackSrc)) img.src = fallbackSrc;
                    }}
                  />
                </div>
              )}
            </div>
            <div className={styles.identityMeta}>
              <h1 className={styles.identityName}>{fullName}</h1>
              <p className={styles.identitySubtitle}>{profile?.email ?? "—"}</p>
              {xpProfile && (
                <div className={styles.identityXpCompact}>
                  <div className={styles.identityXpMainRow}>
                    <span className={styles.identityLevelBadge}>Lv. {xpProfile.currentLevel}</span>
                    <div className={styles.identityXpBarColumn}>
                      <div
                        className={styles.identityXpBar}
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(xpProfile.progressPercent)}
                        aria-label="Experience progress"
                      >
                        <div
                          className={styles.identityXpBarFill}
                          style={{ width: `${Math.max(0, Math.min(100, xpProfile.progressPercent))}%` }}
                        />
                      </div>
                      <span className={styles.identityXpSubline}>
                        {xpProfile.xpToNextLevel.toLocaleString()} XP to Lv. {xpProfile.nextLevel}
                      </span>
                    </div>
                  </div>
                  <div className={styles.identityStatBadges}>
                    <span className={styles.introBadge}>
                      {t("profileTotalXpLabel")}: {(xpProfile?.currentXp ?? 0).toLocaleString()}
                    </span>
                    <span className={styles.introBadge}>
                      {t("profileLast7DaysXpLabel")}: +{xpLast7Days.toLocaleString()} XP
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.identityActions}>
              {successMsg && (
                <span className={styles.pillSuccess}>
                  <CheckCircle size={14} /> {successMsg}
                </span>
              )}
              {error && (
                <span className={styles.pillError}>
                  <AlertCircle size={14} /> {error}
                </span>
              )}
              {!isEditMode ? (
                <button type="button" onClick={enterEditMode} className={styles.btnEditProfile}>
                  <Edit3 size={18} />
                  {t("editProfile")}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Intro + Game history */}
        <div className={styles.profileBody}>
          <section className={styles.cardFb}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitleFb}>{t("intro")}</h2>
            </div>
            <div className={styles.introContent}>
              {profile?.bio ? (
                <p className={styles.introBio}>{profile.bio}</p>
              ) : (
                <p className={styles.introPlaceholder}>{t("noBioYet")}</p>
              )}
              {profile?.position && (
                <p className={styles.introLine}>
                  <strong>{t("work")}</strong> — {profile.position}
                </p>
              )}
              {profile?.email && (
                <p className={styles.introLine}>
                  <Mail size={14} className={styles.introIcon} />
                  <span>{profile.email}</span>
                </p>
              )}
              {profile?.phoneNumber && (
                <p className={styles.introLine}>
                  <strong>{t("phone")}</strong> — {profile.phoneNumber}
                </p>
              )}
              {profile?.gender && (
                <p className={styles.introLine}>
                  <VenusAndMars size={14} className={styles.introIcon} />
                  <span>{profile.gender}</span>
                </p>
              )}
              {profile?.dateOfBirth && (
                <p className={styles.introLine}>
                  <Calendar size={14} className={styles.introIcon} />
                  <span>
                    {t("born")}{" "}
                    {new Date(profile.dateOfBirth).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </p>
              )}
              {(profile?.learnerCode || profile?.teacherCode) && (
                <div className={styles.introBadges}>
                  {profile?.learnerCode && (
                    <span className={styles.introBadge}>
                      <Hash size={12} />
                      {t("learner")}: {profile.learnerCode}
                    </span>
                  )}
                  {profile?.teacherCode && (
                    <span className={styles.introBadge}>
                      <Hash size={12} />
                      Teacher: {profile.teacherCode}
                    </span>
                  )}
                </div>
              )}

              <div style={{ height: 1, background: "var(--border)", margin: "12px 0" }} />

              <div className={styles.cardHead} style={{ marginBottom: 10 }}>
                <h2 className={styles.cardTitleFb}>{t("contactDetails")}</h2>
                {isEditMode ? (
                  <div className={styles.cardHeadActions}>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      className={styles.btnSecondary}
                    >
                      <X size={14} />
                      {t("cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={onSave}
                      disabled={saving || !hasChanges}
                      className={styles.btnSave}
                    >
                      <Save size={14} />
                      {saving ? t("saving") : t("save")}
                    </button>
                  </div>
                ) : null}
              </div>

              {isEditMode ? (
                <div className={styles.detailsForm}>
                  <Field
                    label={t("firstName")}
                    value={form.firstName}
                    onChange={(v) => setForm((s) => ({ ...s, firstName: v }))}
                    placeholder={t("firstNamePlaceholder")}
                  />
                  <Field
                    label={t("lastName")}
                    value={form.lastName}
                    onChange={(v) => setForm((s) => ({ ...s, lastName: v }))}
                    placeholder={t("lastNamePlaceholder")}
                  />
                  <div className={styles.label}>
                    <span className={styles.labelText}>Email</span>
                    <span className={styles.inputReadOnly}>{profile?.email ?? "—"}</span>
                  </div>
                  <Field
                    label={t("phone")}
                    value={form.phoneNumber}
                    onChange={(v) => setForm((s) => ({ ...s, phoneNumber: v }))}
                    placeholder={t("phone")}
                  />
                </div>
              ) : (
                <div className={styles.detailsList}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>First name</span>
                    <span className={styles.detailValue}>{profile?.firstName ?? "—"}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Last name</span>
                    <span className={styles.detailValue}>{profile?.lastName ?? "—"}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Email</span>
                    <span className={styles.detailValue}>{profile?.email ?? "—"}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t("phone")}</span>
                    <span className={styles.detailValue}>{profile?.phoneNumber ?? "—"}</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className={styles.cardFb} aria-label={`${t("profilePlayHistoryTab")} / ${t("profileXpTrackingTitle")}`}>
            <div
              className={styles.profileActivityTabRow}
              role="tablist"
              aria-label={`${t("profilePlayHistoryTab")} / ${t("profileXpTrackingTitle")}`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={profileActivityTab === "history"}
                id="profile-tab-history"
                className={`${styles.profileActivityTab} ${profileActivityTab === "history" ? styles.profileActivityTabActive : ""}`}
                onClick={() => setProfileActivityTab("history")}
              >
                {t("profilePlayHistoryTab")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={profileActivityTab === "xp"}
                id="profile-tab-xp"
                className={`${styles.profileActivityTab} ${profileActivityTab === "xp" ? styles.profileActivityTabActive : ""}`}
                onClick={() => setProfileActivityTab("xp")}
              >
                {t("profileXpTrackingTitle")}
              </button>
            </div>

            <div role="tabpanel" aria-labelledby="profile-tab-history" hidden={profileActivityTab !== "history"}>
              {historyLoading ? (
                <div className={styles.introPlaceholder}>{t("loading")}</div>
              ) : historyError ? (
                <div className={styles.pillError}>{historyError}</div>
              ) : playHistory?.items?.length ? (
                <>
                  <div className={styles.historyList}>
                    {playHistory.items.map((item) => (
                      <div key={item.id} className={styles.historyItem}>
                        <div className={styles.historyItemTop}>
                          <div style={{ minWidth: 0 }}>
                            <div className={styles.historyTitle}>
                              {item.mapTitle ?? `${t("profileHistoryGameFallback")} ${item.mapId.slice(0, 8)}...`}
                            </div>
                            <div className={styles.historyMeta}>
                              {item.playMode} ·{" "}
                              {item.isCompleted ? t("profilePlayCompleted") : t("profilePlayNotCompleted")}
                            </div>
                          </div>
                          <div className={styles.historyScore}>
                            {item.score != null ? `${item.score}` : "—"}
                            {item.stars != null ? ` ★${item.stars}` : ""}
                          </div>
                        </div>
                        <div className={styles.historyBottom}>
                          <span>
                            {new Date(item.startTime).toLocaleString("en-US", {
                              month: "short",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {(playHistory.totalPages ?? 0) > 1 ? (
                    <div className={historyRefreshing ? styles.profilePaginationWrapBusy : styles.profilePaginationWrap}>
                      <ProfilePagination
                        currentPage={playHistory.currentPage ?? 1}
                        totalPages={playHistory.totalPages ?? 1}
                        disabled={historyRefreshing}
                        onPageChange={(p) => void loadPlayHistoryPage(p)}
                        previousLabel={t("profilePaginationPrevious")}
                        nextLabel={t("profilePaginationNext")}
                        navAriaLabel={t("profilePaginationNavLabel")}
                        pageAria={(p) => interpolate(t("profileActivityPageTabAria"), { n: p })}
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                <div className={styles.introPlaceholder}>{t("profileNoGameHistoryYet")}</div>
              )}
            </div>

            <div role="tabpanel" aria-labelledby="profile-tab-xp" hidden={profileActivityTab !== "xp"}>
              {visibleXpItems.length > 0 ? (
                <>
                  <div className={styles.historyList}>
                    {visibleXpItems.map((item) => (
                      <div key={item.id} className={styles.historyItem}>
                        <div className={styles.historyItemTop}>
                          <div style={{ minWidth: 0 }}>
                            <div className={styles.historyTitle}>
                              {item.reason || item.sourceType}
                            </div>
                            <div className={styles.historyMeta}>{item.sourceType}</div>
                          </div>
                          <div className={styles.historyScore}>+{item.delta} XP</div>
                        </div>
                        <div className={styles.historyBottom}>
                          <span>
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleString("en-US", {
                                  month: "short",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {xpChunks.length > 1 ? (
                    <ProfilePagination
                      currentPage={xpChunkIndex + 1}
                      totalPages={xpChunks.length}
                      onPageChange={(p) => setXpChunkIndex(p - 1)}
                      previousLabel={t("profilePaginationPrevious")}
                      nextLabel={t("profilePaginationNext")}
                      navAriaLabel={t("profilePaginationNavLabel")}
                      pageAria={(p) => interpolate(t("profileActivityPageTabAria"), { n: p })}
                    />
                  ) : null}
                </>
              ) : (
                <div className={styles.introPlaceholder}>{t("profileNoXpActivityYet")}</div>
              )}
            </div>
          </section>

          {/* quick links removed (space kept consistent with Facebook-style layout) */}
        </div>
      </div>

      {lightboxSrc ? (
        <div
          className={styles.imageLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={t("profileImagePreview")}
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            className={styles.imageLightboxClose}
            onClick={(e) => {
              e.stopPropagation();
              setLightboxSrc(null);
            }}
            aria-label={t("cancel")}
          >
            <X size={26} />
          </button>
          <img
            src={lightboxSrc}
            alt=""
            className={styles.imageLightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className={styles.label}>
      <span className={styles.labelText}>{props.label}</span>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        placeholder={props.placeholder}
        className={styles.input}
      />
    </label>
  );
}
