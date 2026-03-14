// src/portals/learner/pages/ProfilePage.tsx
import { useEffect, useMemo, useState } from "react";
import "@/shared/styles/profile.css";
import { learnerProfileApi, type ProfileResponse } from "@/services/api/learner/profile.api";
import {
  User,
  Mail,
  Camera,
  Save,
  Edit3,
  X,
  CheckCircle,
  AlertCircle,
  Calendar,
  VenusAndMars,
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
      <div style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingHeader}>
            <div style={styles.loadingTitle} />
            <div style={styles.loadingSubtitle} />
          </div>
          <div style={styles.loadingContent}>
            <div style={styles.loadingAvatar} />
            <div style={{ flex: 1 }}>
              <div style={styles.loadingLine} />
              <div style={{ ...styles.loadingLine, width: "70%", marginTop: 12 }} />
              <div style={{ ...styles.loadingLine, width: "50%", marginTop: 12 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerIcon}>
            <User size={28} strokeWidth={2} />
          </div>
          <div>
            <h1 style={styles.title}>Profile</h1>
            <p style={styles.subtitle}>Manage your personal information and avatar</p>
          </div>
        </div>
        <div style={styles.headerActions}>
          {successMsg && (
            <span style={styles.pillSuccess}>
              <CheckCircle size={14} /> {successMsg}
            </span>
          )}
          {error && (
            <span style={styles.pillError}>
              <AlertCircle size={14} /> {error}
            </span>
          )}
          {isEditMode ? (
            <>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                style={btnSecondary(saving)}
              >
                <X size={16} />
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving || !hasChanges}
                style={btnSave(saving || !hasChanges)}
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save changes"}
              </button>
            </>
          ) : (
            <button type="button" onClick={enterEditMode} style={btnPrimary()}>
              <Edit3 size={16} />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={styles.grid} className="profile-grid">
        {/* Left: Avatar card */}
        <section style={styles.card}>
          <div style={styles.avatarSection}>
            {isEditMode ? (
              <label style={styles.avatarWrapper} className="profile-avatar-wrapper">
                <img
                  src={avatarPreviewUrl ?? profile?.avatarPath ?? "/brand/avatar-fallback.png"}
                  alt="Avatar"
                  style={styles.avatarImg}
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    if (img.src !== "/brand/avatar-fallback.png") {
                      img.src = "/brand/avatar-fallback.png";
                    }
                  }}
                />
                <div style={styles.avatarOverlay} className="profile-avatar-overlay">
                  <Camera size={24} />
                  <span style={styles.avatarOverlayText}>Change photo</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPickAvatar(e.currentTarget.files?.[0] ?? null)}
                  style={styles.avatarInput}
                />
              </label>
            ) : (
              <div style={{ ...styles.avatarWrapper, cursor: "default" }}>
                <img
                  src={profile?.avatarPath ?? "/brand/avatar-fallback.png"}
                  alt="Avatar"
                  style={styles.avatarImg}
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    if (img.src !== "/brand/avatar-fallback.png") {
                      img.src = "/brand/avatar-fallback.png";
                    }
                  }}
                />
              </div>
            )}

            <div style={styles.profileInfo}>
              <h2 style={styles.profileName}>{fullName}</h2>
              <div style={styles.emailRow}>
                <Mail size={14} />
                <span>{profile?.email ?? "—"}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Edit form */}
        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>Basic info</h3>

          {isEditMode ? (
            <>
              <div style={styles.formGrid} className="profile-form-grid">
                <Field
                  label="First name"
                  value={form.firstName}
                  onChange={(v) => setForm((s) => ({ ...s, firstName: v }))}
                  placeholder="Enter your first name"
                />
                <Field
                  label="Last name"
                  value={form.lastName}
                  onChange={(v) => setForm((s) => ({ ...s, lastName: v }))}
                  placeholder="Enter your last name"
                />
              </div>

              <div style={styles.formField}>
                <Field
                  label="Phone number"
                  value={form.phoneNumber}
                  onChange={(v) => setForm((s) => ({ ...s, phoneNumber: v }))}
                  placeholder="e.g. 09xxxxxxxx"
                />
              </div>
            </>
          ) : (
            <div style={styles.kvSection}>
              <div style={styles.kvItem}>
                <span style={styles.kvKey}>First name</span>
                <span style={styles.kvVal}>{profile?.firstName ?? "—"}</span>
              </div>
              <div style={styles.kvItem}>
                <span style={styles.kvKey}>Last name</span>
                <span style={styles.kvVal}>{profile?.lastName ?? "—"}</span>
              </div>
              <div style={styles.kvItem}>
                <span style={styles.kvKey}>Phone number</span>
                <span style={styles.kvVal}>{profile?.phoneNumber ?? "—"}</span>
              </div>
            </div>
          )}

          <div style={styles.divider} />

          <div style={styles.kvSection}>
            <div style={styles.kvItem}>
              <span style={styles.kvKey}>
                <Mail size={14} /> Email
              </span>
              <span style={styles.kvVal}>{profile?.email ?? "—"}</span>
            </div>
            <div style={styles.kvItem}>
              <span style={styles.kvKey}>
                <VenusAndMars size={14} /> Gender
              </span>
              <span style={styles.kvVal}>{profile?.gender ?? "—"}</span>
            </div>
            <div style={styles.kvItem}>
              <span style={styles.kvKey}>
                <Calendar size={14} /> Date of birth
              </span>
              <span style={styles.kvVal}>
                {profile?.dateOfBirth
                  ? new Date(profile.dateOfBirth).toLocaleDateString("en-US")
                  : "—"}
              </span>
            </div>
          </div>
        </section>
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
    <label style={styles.label}>
      <span style={styles.labelText}>{props.label}</span>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        placeholder={props.placeholder}
        style={styles.input}
        className="profile-input"
      />
    </label>
  );
}

const btnPrimary = (): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 20px",
  borderRadius: 12,
  border: "none",
  background: "var(--primary)",
  color: "white",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  transition: "all 0.2s ease",
  boxShadow: "0 4px 14px color-mix(in srgb, var(--primary) 40%, transparent)",
});

const btnSecondary = (disabled: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 20px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 700,
  fontSize: 14,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.7 : 1,
  transition: "all 0.2s ease",
});

const btnSave = (disabled: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 20px",
  borderRadius: 12,
  border: "none",
  background: "var(--primary)",
  color: "white",
  fontWeight: 700,
  fontSize: 14,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.7 : 1,
  transition: "all 0.2s ease",
  boxShadow: "0 4px 14px color-mix(in srgb, var(--primary) 40%, transparent)",
});

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "24px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },

  loadingCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    padding: 32,
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
  },
  loadingHeader: {
    marginBottom: 24,
  },
  loadingTitle: {
    height: 28,
    width: 160,
    background:
      "linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
    borderRadius: 8,
  },
  loadingSubtitle: {
    height: 16,
    width: 240,
    background: "var(--surface-2)",
    borderRadius: 6,
    marginTop: 12,
  },
  loadingContent: {
    display: "flex",
    gap: 20,
    alignItems: "center",
  },
  loadingAvatar: {
    width: 96,
    height: 96,
    borderRadius: "50%",
    background: "var(--surface-2)",
    flexShrink: 0,
  },
  loadingLine: {
    height: 14,
    background: "var(--surface-2)",
    borderRadius: 6,
  },

  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    padding: "24px 28px",
    background:
      "linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, var(--surface)), var(--surface))",
    border: "1px solid var(--border)",
    borderRadius: 20,
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
  },
  headerContent: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: "color-mix(in srgb, var(--primary) 25%, transparent)",
    border: "1px solid color-mix(in srgb, var(--primary) 40%, transparent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--primary)",
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "var(--text)",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: 14,
    color: "var(--text-2)",
    fontWeight: 500,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  pillSuccess: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 10,
    background: "color-mix(in srgb, var(--success) 18%, transparent)",
    color: "var(--success)",
    fontWeight: 600,
    fontSize: 13,
  },
  pillError: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 10,
    background: "color-mix(in srgb, var(--danger) 18%, transparent)",
    color: "var(--danger)",
    fontWeight: 600,
    fontSize: 13,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 360px) 1fr",
    gap: 24,
  },

  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    padding: 28,
    boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
  },

  avatarSection: {
    display: "flex",
    alignItems: "center",
    gap: 20,
  },
  avatarWrapper: {
    position: "relative",
    width: 96,
    height: 96,
    borderRadius: "50%",
    overflow: "hidden",
    border: "3px solid color-mix(in srgb, var(--primary) 35%, transparent)",
    flexShrink: 0,
    cursor: "pointer",
    display: "block",
    transition: "border-color 0.2s ease",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  avatarOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    color: "white",
    opacity: 0,
    transition: "opacity 0.2s ease",
  },
  avatarOverlayText: {
    fontSize: 11,
    fontWeight: 600,
  },
  avatarInput: {
    position: "absolute",
    inset: 0,
    opacity: 0,
    cursor: "pointer",
  },

  profileInfo: {
    minWidth: 0,
    flex: 1,
  },
  profileName: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: "var(--text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  emailRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "var(--text-2)",
    fontSize: 14,
    marginTop: 6,
  },

  divider: {
    height: 1,
    background: "var(--border)",
    margin: "24px 0",
  },

  kvSection: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  kvItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    background: "var(--surface-2)",
    borderRadius: 12,
    border: "1px solid transparent",
  },
  kvKey: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "var(--text-2)",
    fontSize: 13,
    fontWeight: 600,
  },
  kvVal: {
    color: "var(--text)",
    fontSize: 13,
    fontWeight: 600,
    textAlign: "right",
  },

  sectionTitle: {
    margin: "0 0 20px",
    fontSize: 18,
    fontWeight: 800,
    color: "var(--text)",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  formField: {
    marginTop: 16,
  },

  label: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  labelText: {
    fontSize: 13,
    color: "var(--text-2)",
    fontWeight: 600,
  },
  input: {
    height: 44,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text)",
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
};
