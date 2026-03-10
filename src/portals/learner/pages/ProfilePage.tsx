// src/portals/learner/pages/ProfilePage.tsx
import { useEffect, useMemo, useState } from "react";
import { learnerProfileApi, type ProfileResponse } from "@/services/api/learner/profile.api";

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
    } catch (_err) {
      console.error(_err);
      setError("Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={card()}>
        <div style={{ height: 18, width: 180, background: "var(--surface)", borderRadius: 10 }} />
        <div
          style={{
            height: 12,
            width: 260,
            background: "var(--surface)",
            borderRadius: 10,
            marginTop: 10,
          }}
        />
        <div
          style={{ height: 220, background: "var(--surface)", borderRadius: 16, marginTop: 16 }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={card()}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.2 }}>Profile</div>
            <div style={{ color: "var(--muted)", marginTop: 4, fontSize: 13 }}>
              Manage your basic information and avatar
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {successMsg ? (
              <span style={pill("var(--ok-weak)", "var(--ok)")}>{successMsg}</span>
            ) : null}
            {error ? (
              <span style={pill("var(--danger-weak)", "var(--danger)")}>{error}</span>
            ) : null}
            <button type="button" onClick={onSave} disabled={saving} style={btnPrimary(saving)}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "360px 1fr" }}>
        {/* Left: Avatar card */}
        <section style={card()}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={avatarWrap()}>
              <img
                src={avatarPreviewUrl ?? profile?.avatarPath ?? "/brand/avatar-fallback.png"}
                alt="Avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/brand/avatar-fallback.png";
                }}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 16,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {fullName}
              </div>
              <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>
                {profile?.email ?? "—"}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <label style={label()}>
              <span style={labelText()}>Change avatar</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onPickAvatar(e.currentTarget.files?.[0] ?? null)}
              />
            </label>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={kvRow()}>
                <span style={kvKey()}>Learner code</span>
                <span style={kvVal()}>{profile?.learnerCode ?? "—"}</span>
              </div>
              <div style={kvRow()}>
                <span style={kvKey()}>User ID</span>
                <span style={kvVal()}>{profile?.userId ?? "—"}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Edit form */}
        <section style={card()}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Basic info</div>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
            <Field
              label="First name"
              value={form.firstName}
              onChange={(v) => setForm((s) => ({ ...s, firstName: v }))}
              placeholder="Your first name"
            />
            <Field
              label="Last name"
              value={form.lastName}
              onChange={(v) => setForm((s) => ({ ...s, lastName: v }))}
              placeholder="Your last name"
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <Field
              label="Phone number"
              value={form.phoneNumber}
              onChange={(v) => setForm((s) => ({ ...s, phoneNumber: v }))}
              placeholder="e.g. 09xxxxxxxx"
            />
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
            <div style={kvRow()}>
              <span style={kvKey()}>Email</span>
              <span style={kvVal()}>{profile?.email ?? "—"}</span>
            </div>
            <div style={kvRow()}>
              <span style={kvKey()}>Gender</span>
              <span style={kvVal()}>{profile?.gender ?? "—"}</span>
            </div>
            <div style={kvRow()}>
              <span style={kvKey()}>Date of birth</span>
              <span style={kvVal()}>
                {profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : "—"}
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
    <label style={label()}>
      <span style={labelText()}>{props.label}</span>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        placeholder={props.placeholder}
        style={input()}
      />
    </label>
  );
}

/** styles (inline to match your current style approach) */
function card(): React.CSSProperties {
  return {
    background: "var(--elevated, var(--surface))",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  };
}
function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    cursor: disabled ? "not-allowed" : "pointer",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--primary)",
    color: "var(--on-primary, #0b1020)",
    fontWeight: 900,
    opacity: disabled ? 0.7 : 1,
  };
}
function pill(bg: string, fg: string): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: bg,
    color: fg,
    fontWeight: 800,
    fontSize: 12,
    whiteSpace: "nowrap",
  };
}
function label(): React.CSSProperties {
  return { display: "grid", gap: 6 };
}
function labelText(): React.CSSProperties {
  return { fontSize: 12, color: "var(--muted)", fontWeight: 800 };
}
function input(): React.CSSProperties {
  return {
    height: 40,
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text)",
    padding: "0 12px",
    outline: "none",
  };
}
function avatarWrap(): React.CSSProperties {
  return {
    width: 64,
    height: 64,
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    flex: "0 0 auto",
  };
}
function kvRow(): React.CSSProperties {
  return { display: "flex", justifyContent: "space-between", gap: 12 };
}
function kvKey(): React.CSSProperties {
  return { color: "var(--muted)", fontWeight: 800, fontSize: 12 };
}
function kvVal(): React.CSSProperties {
  return { color: "var(--text)", fontWeight: 800, fontSize: 12, textAlign: "right" };
}
