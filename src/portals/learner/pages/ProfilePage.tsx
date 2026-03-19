// src/portals/learner/pages/ProfilePage.tsx
import { useEffect, useMemo, useState } from "react";
import { learnerProfileApi, type ProfileResponse } from "@/services/api/learner/profile.api";
import { learnerGameplayApi } from "@/services/api/learner/gameplay.api";
import type { MapPlayHistoryItem, PaginationResult } from "@/types/api/learner/gameplay";
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
} from "lucide-react";

type FormState = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  avatarFile: File | null;
};

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

  const fullName = useMemo(() => {
    const fn = form.firstName?.trim();
    const ln = form.lastName?.trim();
    return [fn, ln].filter(Boolean).join(" ") || "Unnamed";
  }, [form.firstName, form.lastName]);

  const avatarPreviewUrl = useMemo(() => {
    if (form.avatarFile) return URL.createObjectURL(form.avatarFile);
    return null;
  }, [form.avatarFile]);

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
        const [profileRes, historyRes] = await Promise.all([
          learnerProfileApi.getProfile(),
          learnerGameplayApi.getMyPlayHistory({ pageNumber: 1, pageSize: 10 }),
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
          setHistoryError(historyRes.message ?? "Failed to load play history");
        }
      } catch {
        if (!alive) return;
        setError("Failed to load profile");
        setHistoryError("Failed to load play history");
      } finally {
        if (alive) setLoading(false);
        if (alive) setHistoryLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [t]);

  const onPickAvatar = (file: File | null) => {
    setSuccessMsg(null);
    setForm((s) => ({ ...s, avatarFile: file }));
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
          <div className={styles.cover} aria-hidden />
          <div className={styles.identityBar}>
            <div className={styles.avatarWrap}>
              {isEditMode ? (
                <label className={styles.avatarWrapperFb}>
                  <img
                    src={avatarPreviewUrl ?? profile?.avatarPath ?? "/brand/avatar-fallback.png"}
                    alt="Avatar"
                    className={styles.avatarImg}
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      const fallbackSrc = "/brand/avatar-fallback.png";
                      if (img.dataset.fallbackTried === "1") return;
                      img.dataset.fallbackTried = "1";
                      // Guard against browsers turning the src into an absolute URL.
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
              ) : (
                <div className={`${styles.avatarWrapperFb} ${styles.avatarWrapperStatic}`}>
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
              <h2 className={styles.cardTitleFb}>Intro</h2>
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

          <section className={styles.cardFb}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitleFb}>Lịch sử đấu</h2>
            </div>

            {historyLoading ? (
              <div className={styles.introPlaceholder}>Loading...</div>
            ) : historyError ? (
              <div className={styles.pillError}>{historyError}</div>
            ) : playHistory?.items?.length ? (
              <div className={styles.historyList}>
                {playHistory.items.map((item) => (
                  <div key={item.id} className={styles.historyItem}>
                    <div className={styles.historyItemTop}>
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.historyTitle}>
                          {item.mapTitle ?? `Map ${item.mapId.slice(0, 8)}...`}
                        </div>
                        <div className={styles.historyMeta}>
                          {item.playMode} · {item.isCompleted ? "Completed" : "Not completed"}
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
            ) : (
              <div className={styles.introPlaceholder}>No game history yet.</div>
            )}
          </section>

          {/* quick links removed (space kept consistent with Facebook-style layout) */}
        </div>
      </div>
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
