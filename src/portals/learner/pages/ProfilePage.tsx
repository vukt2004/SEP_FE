// src/portals/learner/pages/ProfilePage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { learnerProfileApi, type ProfileResponse } from "@/services/api/learner/profile.api";
import { ROUTES } from "@/lib/constants/routes";
import styles from "./ProfilePage.module.css";
import {
  Camera,
  Save,
  Edit3,
  X,
  CheckCircle,
  AlertCircle,
  Map,
  Gamepad2,
  Store,
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

      try {
        const res = await learnerProfileApi.getProfile();
        if (!alive) return;

        if (!res.isSuccess) {
          setError(res.message ?? "Failed to load profile");
          return;
        }

        const p = res.data ?? null;
        setProfile(p);
        setForm({
          firstName: p?.firstName ?? "",
          lastName: p?.lastName ?? "",
          phoneNumber: p?.phoneNumber ?? "",
          avatarFile: null,
        });
      } catch {
        if (!alive) return;
        setError("Failed to load profile");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

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
        setError(res.message ?? "Update failed");
        return;
      }

      const p = res.data ?? null;
      setProfile(p);
      setForm((s) => ({ ...s, avatarFile: null }));
      setSuccessMsg("Saved");
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
                      if (img.src !== "/brand/avatar-fallback.png") {
                        img.src = "/brand/avatar-fallback.png";
                      }
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
                      if (img.src !== "/brand/avatar-fallback.png") {
                        img.src = "/brand/avatar-fallback.png";
                      }
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
                  Edit profile
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Two-column: Intro (left) + Contact/About (right) */}
        <div className={styles.profileBody}>
          <section className={styles.cardFb}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitleFb}>Intro</h2>
            </div>
            <div className={styles.introContent}>
              {profile?.bio ? (
                <p className={styles.introBio}>{profile.bio}</p>
              ) : (
                <p className={styles.introPlaceholder}>No bio yet.</p>
              )}
              {profile?.position && (
                <p className={styles.introLine}>
                  <strong>Work</strong> — {profile.position}
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
                  <strong>Phone</strong> — {profile.phoneNumber}
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
                    Born{" "}
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
                      Learner: {profile.learnerCode}
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
            </div>
          </section>

          <section className={styles.cardFb}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitleFb}>Quick links</h2>
            </div>
            <nav className={styles.quickLinks}>
              <Link to={ROUTES.LEARNER_MAPS ?? "/app/my-maps"} className={styles.quickLink}>
                <Map size={18} />
                <span>My Maps</span>
              </Link>
              <Link to={ROUTES.LEARNER_LEARN ?? "/app/browse"} className={styles.quickLink}>
                <Gamepad2 size={18} />
                <span>Browse games</span>
              </Link>
              <Link
                to={ROUTES.LEARNER_MARKETPLACE ?? "/app/marketplace"}
                className={styles.quickLink}
              >
                <Store size={18} />
                <span>Marketplace</span>
              </Link>
            </nav>
          </section>

          <aside className={styles.sidebar}>
            <section className={styles.cardFb}>
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitleFb}>Contact & details</h2>
                {isEditMode ? (
                  <div className={styles.cardHeadActions}>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      className={styles.btnSecondary}
                    >
                      <X size={14} />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={onSave}
                      disabled={saving || !hasChanges}
                      className={styles.btnSave}
                    >
                      <Save size={14} />
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={enterEditMode} className={styles.btnEditSmall}>
                    <Edit3 size={14} />
                    Edit
                  </button>
                )}
              </div>

              {isEditMode ? (
                <div className={styles.detailsForm}>
                  <Field
                    label="First name"
                    value={form.firstName}
                    onChange={(v) => setForm((s) => ({ ...s, firstName: v }))}
                    placeholder="First name"
                  />
                  <Field
                    label="Last name"
                    value={form.lastName}
                    onChange={(v) => setForm((s) => ({ ...s, lastName: v }))}
                    placeholder="Last name"
                  />
                  <div className={styles.label}>
                    <span className={styles.labelText}>Email</span>
                    <span className={styles.inputReadOnly}>{profile?.email ?? "—"}</span>
                  </div>
                  <Field
                    label="Phone"
                    value={form.phoneNumber}
                    onChange={(v) => setForm((s) => ({ ...s, phoneNumber: v }))}
                    placeholder="Phone number"
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
                    <span className={styles.detailLabel}>Phone</span>
                    <span className={styles.detailValue}>{profile?.phoneNumber ?? "—"}</span>
                  </div>
                </div>
              )}
            </section>
          </aside>
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
