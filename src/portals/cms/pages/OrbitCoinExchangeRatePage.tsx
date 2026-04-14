import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Save, Coins } from "lucide-react";
import { cmsOrbitCoinApi, type CmsExchangeRateDto } from "@/services/api/cms/orbitcoin.api";
import { useTranslation } from "@/lib/i18n/translations";

type FormState = {
  rate: string;
  reason: string;
  effectiveFrom: string;
  effectiveTo: string;
};

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 20,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface-2)",
  color: "var(--text)",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  color: "var(--text-2)",
  fontSize: 13,
  marginBottom: 6,
  display: "block",
};

const OrbitCoinExchangeRatePage: React.FC = () => {
  const { t, locale } = useTranslation();
  const localeTag = locale === "vi" ? "vi-VN" : "en-US";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<CmsExchangeRateDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    rate: "",
    reason: "",
    effectiveFrom: "",
    effectiveTo: "",
  });

  const loadExchangeRate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await cmsOrbitCoinApi.getExchangeRate();
      if (!data.isSuccess || !data.data) {
        setError(data.message || data.errors?.join(", ") || t("cmsOrbit.failedLoad"));
        return;
      }

      const dto = data.data;
      setCurrentRate(dto.rate);
      setLastUpdatedAt(dto.updatedAt || dto.createdAt || null);
      setForm((prev) => ({
        ...prev,
        rate: String(dto.rate),
      }));
    } catch {
      setError(t("cmsOrbit.failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadExchangeRateHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data } = await cmsOrbitCoinApi.getExchangeRateHistory("OrbitCoin", "VND", 20);
      if (!data.isSuccess || !data.data) {
        return;
      }
      setHistory(data.data);
    } catch {
      // Keep page functional even if timeline fails.
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExchangeRate();
    void loadExchangeRateHistory();
  }, [loadExchangeRate, loadExchangeRateHistory]);

  const numericRate = useMemo(() => Number(form.rate), [form.rate]);
  const canSave = useMemo(
    () => Number.isFinite(numericRate) && numericRate > 0 && !saving && !loading,
    [numericRate, saving, loading],
  );

  const handleSave = async () => {
    if (!canSave) {
      setError(t("cmsOrbit.positiveRate"));
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await cmsOrbitCoinApi.updateExchangeRate({
        rate: numericRate,
        reason: form.reason.trim() || undefined,
        effectiveFrom: form.effectiveFrom || null,
        effectiveTo: form.effectiveTo || null,
      });

      if (!data.isSuccess || !data.data) {
        setError(data.message || data.errors?.join(", ") || t("cmsOrbit.updateFailed"));
        return;
      }

      const dto = data.data;
      setCurrentRate(dto.rate);
      setLastUpdatedAt(dto.updatedAt || dto.createdAt || null);
      setForm((prev) => ({
        ...prev,
        rate: String(dto.rate),
        reason: "",
      }));
      setSuccess(data.message || t("cmsOrbit.updateSuccess"));
      await loadExchangeRateHistory();
    } catch {
      setError(t("cmsOrbit.updateFailed"));
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const confirmMessage = useMemo(() => {
    const currentText = currentRate != null ? currentRate.toLocaleString(localeTag) : t("cmsOrbit.na");
    const nextText = Number.isFinite(numericRate)
      ? numericRate.toLocaleString(localeTag)
      : t("cmsOrbit.na");
    return t("cmsOrbit.confirmMessage")
      .replace("{current}", currentText)
      .replace("{next}", nextText);
  }, [currentRate, localeTag, numericRate, t]);

  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      <div
        style={{
          ...cardStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "color-mix(in srgb, var(--primary) 18%, var(--surface))",
              display: "grid",
              placeItems: "center",
              color: "var(--primary)",
            }}
          >
            <Coins size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: "var(--text)" }}>
              {t("cmsOrbit.title")}
            </h2>
            <p style={{ margin: "4px 0 0", color: "var(--text-2)", fontSize: 14 }}>
              {t("cmsOrbit.subtitle")}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadExchangeRate();
            void loadExchangeRateHistory();
          }}
          disabled={loading || saving}
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            color: "var(--text)",
            borderRadius: 10,
            padding: "8px 12px",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            cursor: loading || saving ? "not-allowed" : "pointer",
            opacity: loading || saving ? 0.7 : 1,
          }}
        >
          <RefreshCw size={16} />
          {t("cmsOrbit.refresh")}
        </button>
      </div>

      <div style={{ ...cardStyle, display: "grid", gap: 10 }}>
        <div style={{ color: "var(--text-2)", fontSize: 13 }}>{t("cmsOrbit.currentRate")}</div>
        <div style={{ color: "var(--text)", fontSize: 28, fontWeight: 700 }}>
          {currentRate != null
            ? `${currentRate.toLocaleString(localeTag)} ${t("cmsOrbit.vndPerOrbitCoin")}`
            : "--"}
        </div>
        {lastUpdatedAt ? (
          <div style={{ color: "var(--text-2)", fontSize: 13 }}>
            {t("cmsOrbit.lastUpdated")}: {new Date(lastUpdatedAt).toLocaleString(localeTag)}
          </div>
        ) : null}
      </div>

      <div style={{ ...cardStyle, display: "grid", gap: 14 }}>
        {loading ? (
          <div
            style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-2)" }}
          >
            <Loader2 size={16} className="spin" /> {t("cmsOrbit.loading")}
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              color: "var(--danger)",
              fontSize: 14,
              background: "color-mix(in srgb, var(--danger) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--danger) 35%, transparent)",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            {error}
          </div>
        ) : null}

        {success ? (
          <div
            style={{
              color: "var(--ok)",
              fontSize: 14,
              background: "color-mix(in srgb, var(--ok) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--ok) 35%, transparent)",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            {success}
          </div>
        ) : null}

        <div>
          <label style={labelStyle}>{t("cmsOrbit.field.rate")}</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.rate}
            onChange={(e) => setForm((prev) => ({ ...prev, rate: e.target.value }))}
            style={inputStyle}
            placeholder={t("cmsOrbit.placeholder.rate")}
          />
        </div>

        <div>
          <label style={labelStyle}>{t("cmsOrbit.field.reason")}</label>
          <textarea
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
            placeholder={t("cmsOrbit.placeholder.reason")}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <label style={labelStyle}>{t("cmsOrbit.field.effectiveFrom")}</label>
            <input
              type="datetime-local"
              value={form.effectiveFrom}
              onChange={(e) => setForm((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("cmsOrbit.field.effectiveTo")}</label>
            <input
              type="datetime-local"
              value={form.effectiveTo}
              onChange={(e) => setForm((prev) => ({ ...prev, effectiveTo: e.target.value }))}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={!canSave}
            style={{
              background: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "10px 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: canSave ? "pointer" : "not-allowed",
              opacity: canSave ? 1 : 0.65,
              fontWeight: 600,
            }}
          >
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            {saving ? t("cmsOrbit.saving") : t("cmsOrbit.updateRate")}
          </button>
        </div>
      </div>

      <div style={{ ...cardStyle, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "var(--text)", fontSize: 18 }}>
            {t("cmsOrbit.historyTitle")}
          </h3>
          <span style={{ color: "var(--text-2)", fontSize: 13 }}>
            {historyLoading
              ? t("cmsOrbit.refreshing")
              : `${history.length} ${t("cmsOrbit.records")}`}
          </span>
        </div>

        {history.length === 0 ? (
          <div style={{ color: "var(--text-2)", fontSize: 14 }}>{t("cmsOrbit.noHistory")}</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {history.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid var(--border)",
                  background: item.isActive
                    ? "color-mix(in srgb, var(--primary) 8%, var(--surface))"
                    : "var(--surface-2)",
                  borderRadius: 12,
                  padding: 12,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ color: "var(--text)", fontWeight: 600 }}>
                    {item.rate.toLocaleString(localeTag)} {t("cmsOrbit.vndPerOrbitCoin")}
                  </div>
                  <div
                    style={{
                      color: item.isActive ? "var(--ok)" : "var(--text-2)",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {item.isActive ? t("cmsOrbit.status.active") : t("cmsOrbit.status.archived")}
                  </div>
                </div>
                <div style={{ color: "var(--text-2)", fontSize: 13 }}>
                  {t("cmsOrbit.effective")}: {" "}
                  {item.effectiveFrom ? new Date(item.effectiveFrom).toLocaleString(localeTag) : "-"}
                  {" -> "}
                  {item.effectiveTo
                    ? new Date(item.effectiveTo).toLocaleString(localeTag)
                    : t("cmsOrbit.noEnd")}
                </div>
                <div style={{ color: "var(--text-2)", fontSize: 13 }}>
                  {t("cmsOrbit.updated")}: {new Date(item.updatedAt || item.createdAt || "").toLocaleString(localeTag)}
                </div>
                {item.reason ? (
                  <div style={{ color: "var(--text)", fontSize: 13 }}>
                    {t("cmsOrbit.reason")}: {item.reason}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 1000,
          }}
          onClick={() => {
            if (!saving) setConfirmOpen(false);
          }}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 18,
              display: "grid",
              gap: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, color: "var(--text)", fontSize: 18 }}>
              {t("cmsOrbit.confirmTitle")}
            </h3>
            <p style={{ margin: 0, color: "var(--text-2)", lineHeight: 1.5 }}>{confirmMessage}</p>
            <p style={{ margin: 0, color: "var(--text-2)", fontSize: 13 }}>
              {t("cmsOrbit.confirmHint")}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmOpen(false)}
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={saving || !canSave}
                onClick={() => void handleSave()}
                style={{
                  background: "var(--primary)",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  padding: "8px 12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.75 : 1,
                }}
              >
                {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                {saving ? t("cmsOrbit.updating") : t("cmsOrbit.confirmUpdate")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OrbitCoinExchangeRatePage;
