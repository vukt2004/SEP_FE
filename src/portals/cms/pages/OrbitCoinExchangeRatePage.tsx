import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Save, Coins } from "lucide-react";
import { cmsOrbitCoinApi, type CmsExchangeRateDto } from "@/services/api/cms/orbitcoin.api";

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
        setError(data.message || data.errors?.join(", ") || "Failed to load exchange rate");
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
      setError("Failed to load exchange rate");
    } finally {
      setLoading(false);
    }
  }, []);

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
      setError("Rate must be a positive number.");
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
        setError(data.message || data.errors?.join(", ") || "Update failed");
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
      setSuccess(data.message || "Exchange rate updated successfully.");
      await loadExchangeRateHistory();
    } catch {
      setError("Update failed");
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const confirmMessage = useMemo(() => {
    const currentText = currentRate != null ? currentRate.toLocaleString("vi-VN") : "N/A";
    const nextText = Number.isFinite(numericRate) ? numericRate.toLocaleString("vi-VN") : "N/A";
    return `Apply exchange rate change from ${currentText} to ${nextText} VND / 1 OrbitCoin?`;
  }, [currentRate, numericRate]);

  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
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
            <h2 style={{ margin: 0, fontSize: 20, color: "var(--text)" }}>OrbitCoin Exchange Rate</h2>
            <p style={{ margin: "4px 0 0", color: "var(--text-2)", fontSize: 14 }}>
              Manage conversion rate between OrbitCoin and VND for future top-up orders.
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
          Refresh
        </button>
      </div>

      <div style={{ ...cardStyle, display: "grid", gap: 10 }}>
        <div style={{ color: "var(--text-2)", fontSize: 13 }}>Current active rate</div>
        <div style={{ color: "var(--text)", fontSize: 28, fontWeight: 700 }}>
          {currentRate != null ? `${currentRate.toLocaleString("vi-VN")} VND / 1 OrbitCoin` : "--"}
        </div>
        {lastUpdatedAt ? (
          <div style={{ color: "var(--text-2)", fontSize: 13 }}>
            Last updated: {new Date(lastUpdatedAt).toLocaleString()}
          </div>
        ) : null}
      </div>

      <div style={{ ...cardStyle, display: "grid", gap: 14 }}>
        {loading ? (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-2)" }}>
            <Loader2 size={16} className="spin" /> Loading...
          </div>
        ) : null}

        {error ? (
          <div style={{ color: "var(--danger)", fontSize: 14, background: "color-mix(in srgb, var(--danger) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 35%, transparent)", borderRadius: 10, padding: "10px 12px" }}>
            {error}
          </div>
        ) : null}

        {success ? (
          <div style={{ color: "var(--ok)", fontSize: 14, background: "color-mix(in srgb, var(--ok) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--ok) 35%, transparent)", borderRadius: 10, padding: "10px 12px" }}>
            {success}
          </div>
        ) : null}

        <div>
          <label style={labelStyle}>Rate (VND for 1 OrbitCoin)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.rate}
            onChange={(e) => setForm((prev) => ({ ...prev, rate: e.target.value }))}
            style={inputStyle}
            placeholder="Example: 1000"
          />
        </div>

        <div>
          <label style={labelStyle}>Reason (optional)</label>
          <textarea
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
            placeholder="Reason for this rate update"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div>
            <label style={labelStyle}>Effective from (optional)</label>
            <input
              type="datetime-local"
              value={form.effectiveFrom}
              onChange={(e) => setForm((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Effective to (optional)</label>
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
            {saving ? "Saving..." : "Update rate"}
          </button>
        </div>
      </div>

      <div style={{ ...cardStyle, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "var(--text)", fontSize: 18 }}>Rate change history</h3>
          <span style={{ color: "var(--text-2)", fontSize: 13 }}>
            {historyLoading ? "Refreshing..." : `${history.length} records`}
          </span>
        </div>

        {history.length === 0 ? (
          <div style={{ color: "var(--text-2)", fontSize: 14 }}>No exchange rate history yet.</div>
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
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ color: "var(--text)", fontWeight: 600 }}>
                    {item.rate.toLocaleString("vi-VN")} VND / 1 OrbitCoin
                  </div>
                  <div
                    style={{
                      color: item.isActive ? "var(--ok)" : "var(--text-2)",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {item.isActive ? "Active" : "Archived"}
                  </div>
                </div>
                <div style={{ color: "var(--text-2)", fontSize: 13 }}>
                  Effective: {item.effectiveFrom ? new Date(item.effectiveFrom).toLocaleString() : "-"}
                  {" -> "}
                  {item.effectiveTo ? new Date(item.effectiveTo).toLocaleString() : "No end"}
                </div>
                <div style={{ color: "var(--text-2)", fontSize: 13 }}>
                  Updated: {new Date(item.updatedAt || item.createdAt || "").toLocaleString()}
                </div>
                {item.reason ? (
                  <div style={{ color: "var(--text)", fontSize: 13 }}>Reason: {item.reason}</div>
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
            <h3 style={{ margin: 0, color: "var(--text)", fontSize: 18 }}>Confirm rate update</h3>
            <p style={{ margin: 0, color: "var(--text-2)", lineHeight: 1.5 }}>{confirmMessage}</p>
            <p style={{ margin: 0, color: "var(--text-2)", fontSize: 13 }}>
              This affects upcoming top-up conversions from OrbitCoin to VND.
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
                Cancel
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
                {saving ? "Updating..." : "Confirm update"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OrbitCoinExchangeRatePage;
