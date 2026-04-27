/**
 * CMS — Map solve score weights (Base / Time / Steps / Blocks), sum = 100%.
 * GET/PUT /api/cms/gameplay/map-solve-score
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cmsGameplayApi } from "@/services/api/cms/gameplay.api";
import type { MapSolveScoreConfigDto } from "@/services/api/cms/gameplay.api";
import { AlertToast } from "@/shared/components/AlertToast";
import { Loader2, Save, RotateCcw, Percent, Info } from "lucide-react";

const KEYS = ["baseScore", "timeScore", "stepsScore", "blocksScore"] as const;
type ScoreKey = (typeof KEYS)[number];

const LABELS: Record<ScoreKey, string> = {
  baseScore: "Base score",
  timeScore: "Time",
  stepsScore: "Steps",
  blocksScore: "Blocks",
};

const HINTS: Record<ScoreKey, string> = {
  baseScore: "Fixed portion for clearing the game",
  timeScore: "Faster runs score higher vs. time limit",
  stepsScore: "Fewer moves vs. optimal path",
  blocksScore: "Using required block types efficiently",
};

const EXPLANATIONS: Record<ScoreKey, string> = {
  baseScore:
    "Điểm nền khi người chơi hoàn thành màn. Tăng mục này sẽ giảm chênh lệch giữa người chơi nhanh/chậm.",
  timeScore:
    "Điểm thưởng theo tốc độ hoàn thành. Màn kết thúc càng nhanh (so với time limit) thì phần này càng cao.",
  stepsScore:
    "Điểm thưởng theo số bước hợp lý. Đi ít bước hơn, gần đường tối ưu hơn sẽ nhận nhiều điểm hơn.",
  blocksScore:
    "Điểm thưởng cho cách dùng block. Dùng đúng block yêu cầu, ít lặp dư thừa sẽ được cộng tốt hơn.",
};

const TUNING_GUIDE: Record<ScoreKey, string> = {
  baseScore: "Tăng để ưu tiên việc hoàn thành màn hơn là tối ưu kỹ thuật.",
  timeScore: "Tăng để khuyến khích người chơi giải nhanh.",
  stepsScore: "Tăng để khuyến khích tư duy đường đi tối ưu.",
  blocksScore: "Tăng để khuyến khích tư duy thuật toán/block sạch.",
};

/** Muted, theme-friendly accents */
const CHANNELS: Record<ScoreKey, { accent: string; accentSoft: string; dot: string }> = {
  baseScore: {
    accent: "#6366f1",
    accentSoft: "color-mix(in srgb, #6366f1 22%, var(--surface))",
    dot: "#6366f1",
  },
  timeScore: {
    accent: "#0ea5e9",
    accentSoft: "color-mix(in srgb, #0ea5e9 22%, var(--surface))",
    dot: "#0ea5e9",
  },
  stepsScore: {
    accent: "#10b981",
    accentSoft: "color-mix(in srgb, #10b981 22%, var(--surface))",
    dot: "#10b981",
  },
  blocksScore: {
    accent: "#d97706",
    accentSoft: "color-mix(in srgb, #d97706 22%, var(--surface))",
    dot: "#d97706",
  },
};

export type WeightsTuple = readonly [number, number, number, number];

/** When slider `changedIndex` moves to `newValue`, other three share the remaining % proportionally (integers, sum = 100). */
export function redistributeWeights(
  prev: WeightsTuple,
  changedIndex: 0 | 1 | 2 | 3,
  newValue: number,
): [number, number, number, number] {
  const v = Math.max(0, Math.min(100, Math.round(Number(newValue))));
  const out: [number, number, number, number] = [prev[0], prev[1], prev[2], prev[3]];
  out[changedIndex] = v;

  const others: number[] = [0, 1, 2, 3].filter((i) => i !== changedIndex);
  let remainder = 100 - v;

  if (remainder <= 0) {
    others.forEach((i) => {
      out[i] = 0;
    });
    return out;
  }

  const prevOthersSum = others.reduce((s, i) => s + prev[i], 0);

  if (prevOthersSum === 0) {
    const base = Math.floor(remainder / 3);
    let left = remainder - base * 3;
    others.forEach((i, k) => {
      out[i] = base + (k < left ? 1 : 0);
    });
    return out;
  }

  type Fr = { i: number; raw: number; floor: number; frac: number };
  const fracs: Fr[] = others.map((i) => {
    const raw = (prev[i] / prevOthersSum) * remainder;
    const floor = Math.floor(raw);
    return { i, raw, floor, frac: raw - floor };
  });
  const sumFloor = fracs.reduce((s, x) => s + x.floor, 0);
  let toDistribute = remainder - sumFloor;
  fracs.sort((a, b) => b.frac - a.frac);
  const bonus = new Set(
    fracs.slice(0, Math.max(0, Math.min(toDistribute, fracs.length))).map((x) => x.i),
  );
  fracs.forEach(({ i, floor }) => {
    out[i] = floor + (bonus.has(i) ? 1 : 0);
  });

  let total = out[0] + out[1] + out[2] + out[3];
  while (total !== 100 && others.length) {
    if (total < 100) {
      const i = others.reduce((best, j) => (out[j] < out[best] ? j : best), others[0]);
      out[i]++;
      total++;
    } else {
      const i = others.reduce((best, j) => (out[j] > out[best] ? j : best), others[0]);
      if (out[i] > 0) {
        out[i]--;
        total--;
      } else {
        break;
      }
    }
  }

  return out;
}

function dtoToTuple(d: MapSolveScoreConfigDto): WeightsTuple {
  return [d.baseScore, d.timeScore, d.stepsScore, d.blocksScore];
}

function tupleToBody(w: WeightsTuple): {
  baseScore: number;
  timeScore: number;
  stepsScore: number;
  blocksScore: number;
} {
  return {
    baseScore: w[0],
    timeScore: w[1],
    stepsScore: w[2],
    blocksScore: w[3],
  };
}

const GameplaySettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const saveToastTimerRef = useRef<number | null>(null);
  const [configKey, setConfigKey] = useState<string>("");
  const [serverWeights, setServerWeights] = useState<WeightsTuple>([25, 25, 25, 25]);
  const [weights, setWeights] = useState<WeightsTuple>([25, 25, 25, 25]);

  const dismissSaveToast = useCallback(() => {
    if (saveToastTimerRef.current !== null) {
      window.clearTimeout(saveToastTimerRef.current);
      saveToastTimerRef.current = null;
    }
    setSaveToast(null);
  }, []);

  const showSaveSuccessToast = useCallback((message: string) => {
    setSaveToast(message);
    if (saveToastTimerRef.current !== null) {
      window.clearTimeout(saveToastTimerRef.current);
    }
    saveToastTimerRef.current = window.setTimeout(() => {
      setSaveToast(null);
      saveToastTimerRef.current = null;
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (saveToastTimerRef.current !== null) {
        window.clearTimeout(saveToastTimerRef.current);
      }
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    dismissSaveToast();
    try {
      const { data } = await cmsGameplayApi.getMapSolveScoreConfig();
      if (!data.isSuccess || !data.data) {
        setError(data.message ?? data.errors?.join(", ") ?? "Failed to load score config");
        return;
      }
      const t = dtoToTuple(data.data);
      setConfigKey(data.data.configKey ?? "");
      setServerWeights(t);
      setWeights(t);
    } catch (e) {
      setError("Failed to load score config");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [dismissSaveToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = weights[0] + weights[1] + weights[2] + weights[3];
  const dirty = useMemo(
    () => weights.some((w, i) => w !== serverWeights[i]),
    [weights, serverWeights],
  );

  const onSliderChange = (index: 0 | 1 | 2 | 3, value: number) => {
    setWeights(redistributeWeights(weights, index, value));
    dismissSaveToast();
  };

  const handleReset = () => {
    setWeights(serverWeights);
    dismissSaveToast();
    setError(null);
  };

  const handleSave = async () => {
    if (total !== 100) {
      setError("Weights must sum to 100%.");
      return;
    }
    setSaving(true);
    setError(null);
    dismissSaveToast();
    try {
      const { data } = await cmsGameplayApi.updateMapSolveScoreConfig(tupleToBody(weights));
      if (!data.isSuccess) {
        setError(data.message ?? data.errors?.join(", ") ?? "Save failed");
        return;
      }
      setServerWeights(weights);
      const msg = (data.message ?? "").trim() || "Scoring settings saved.";
      showSaveSuccessToast(msg);
    } catch (e) {
      setError("Save failed");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="gss-page">
        <div className="gss-shell">
          <header className="gss-hero">
            <div className="gss-hero-icon" aria-hidden>
              <Percent size={18} strokeWidth={2.5} />
            </div>
            <div className="gss-hero-main">
              <div className="gss-hero-row">
                <h1 className="gss-title">Map solve scoring</h1>
                {configKey ? <span className="gss-key-pill">{configKey}</span> : null}
                <button
                  type="button"
                  className="gss-info-btn"
                  title="Open scoring guide"
                  aria-label="More about game solve scoring"
                  onClick={() => setShowGuideModal(true)}
                >
                  <Info size={15} strokeWidth={2.25} aria-hidden />
                </button>
              </div>
              <p className="gss-tagline">
                Four weights, always 100% total — drag any slider to rebalance the rest.
              </p>
            </div>
          </header>

          {loading ? (
            <div className="gss-loading">
              <Loader2 size={22} className="gss-spin" />
              <span>Loading configuration…</span>
            </div>
          ) : null}

          {error ? (
            <div className="gss-alert gss-alert--err" role="alert">
              {error}
            </div>
          ) : null}

          {!loading ? (
            <div className="gss-card">
              <div className="gss-card-head">
                <span className="gss-card-head-label">Distribution</span>
                <span
                  className={total === 100 ? "gss-total gss-total--ok" : "gss-total gss-total--bad"}
                >
                  Σ = {total}%
                </span>
              </div>

              <div className="gss-bar-wrap" aria-hidden>
                {weights.map((w, i) => {
                  const key = KEYS[i];
                  const ch = CHANNELS[key];
                  if (w <= 0) return null;
                  return (
                    <div
                      key={key}
                      className="gss-bar-seg"
                      style={{
                        flexGrow: w,
                        flexBasis: 0,
                        minWidth: Math.max(w * 0.5, 4),
                        background: ch.accent,
                        boxShadow: `inset 0 1px 0 color-mix(in srgb, white 35%, transparent)`,
                      }}
                      title={`${LABELS[key]}: ${w}%`}
                    />
                  );
                })}
              </div>

              <div className="gss-legend" role="list">
                {KEYS.map((key, i) => (
                  <span key={key} className="gss-legend-chip" role="listitem" title={LABELS[key]}>
                    <span className="gss-legend-dot" style={{ background: CHANNELS[key].dot }} />
                    <span className="gss-legend-name">{LABELS[key]}</span>
                    <span className="gss-legend-val">{weights[i]}%</span>
                  </span>
                ))}
              </div>

              <div className="gss-sliders">
                {KEYS.map((key, index) => {
                  const ch = CHANNELS[key];
                  const pct = `${weights[index]}%`;
                  return (
                    <div
                      key={key}
                      className="gss-slider-card"
                      style={
                        {
                          ["--gss-accent" as string]: ch.accent,
                          ["--gss-pct" as string]: pct,
                        } as React.CSSProperties
                      }
                    >
                      <div className="gss-slider-top">
                        <div className="gss-slider-labels">
                          <span className="gss-slider-dot" style={{ background: ch.dot }} />
                          <label
                            className="gss-slider-title"
                            htmlFor={`score-slider-${key}`}
                            title={HINTS[key]}
                          >
                            {LABELS[key]}
                          </label>
                        </div>
                        <output className="gss-slider-badge" htmlFor={`score-slider-${key}`}>
                          {weights[index]}
                          <span className="gss-slider-badge-unit">%</span>
                        </output>
                      </div>
                      <input
                        id={`score-slider-${key}`}
                        className="gss-range"
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={weights[index]}
                        onChange={(e) =>
                          onSliderChange(index as 0 | 1 | 2 | 3, Number(e.target.value))
                        }
                      />
                    </div>
                  );
                })}
              </div>

              <footer className="gss-footer">
                <button
                  type="button"
                  className="gss-btn gss-btn--primary"
                  disabled={saving || !dirty}
                  onClick={() => void handleSave()}
                >
                  {saving ? <Loader2 size={18} className="gss-spin" /> : <Save size={18} />}
                  Save changes
                </button>
                <button
                  type="button"
                  className="gss-btn gss-btn--ghost"
                  disabled={!dirty || saving}
                  onClick={handleReset}
                >
                  <RotateCcw size={18} />
                  Discard
                </button>
              </footer>
            </div>
          ) : null}
        </div>

        <style>{`
        .gss-page {
          min-height: 100%;
          padding: 12px min(16px, 3vw) 20px;
          background: linear-gradient(
            165deg,
            color-mix(in srgb, var(--primary) 5%, var(--bg)) 0%,
            var(--bg) 38%,
            var(--bg) 100%
          );
        }
        .gss-shell {
          max-width: min(900px, 100%);
          margin: 0 auto;
        }
        .gss-hero {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
        }
        .gss-hero-icon {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          color: var(--primary);
          background: color-mix(in srgb, var(--primary) 12%, var(--surface));
          border: 1px solid color-mix(in srgb, var(--primary) 22%, var(--border));
          box-shadow: 0 4px 14px color-mix(in srgb, var(--primary) 8%, transparent);
        }
        .gss-hero-main {
          min-width: 0;
          flex: 1;
        }
        .gss-hero-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px 10px;
        }
        .gss-title {
          margin: 0;
          font-size: clamp(1.1rem, 2.2vw, 1.35rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text);
          line-height: 1.2;
        }
        .gss-key-pill {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 3px 8px;
          border-radius: 999px;
          color: var(--text-2);
          background: var(--surface);
          border: 1px solid var(--border);
        }
        .gss-info-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          margin-left: 2px;
          border: none;
          border-radius: 8px;
          color: var(--muted);
          cursor: pointer;
          flex-shrink: 0;
          background: transparent;
          padding: 0;
        }
        .gss-info-btn:hover {
          color: var(--primary);
          background: color-mix(in srgb, var(--primary) 8%, transparent);
        }
        .gss-tagline {
          margin: 4px 0 0;
          font-size: 12px;
          line-height: 1.35;
          color: var(--text-2);
        }

        .gss-loading {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 0;
          color: var(--text-2);
          font-size: 13px;
        }
        .gss-spin {
          animation: gss-spin 0.85s linear infinite;
        }
        @keyframes gss-spin {
          to { transform: rotate(360deg); }
        }

        .gss-alert {
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.4;
          margin-bottom: 10px;
        }
        .gss-alert--err {
          background: color-mix(in srgb, var(--danger, #dc2626) 10%, var(--surface));
          border: 1px solid color-mix(in srgb, var(--danger) 30%, var(--border));
          color: var(--text);
        }
        .gss-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 14px 16px 14px;
          box-shadow:
            0 1px 0 color-mix(in srgb, white 8%, transparent) inset,
            0 16px 40px -28px rgba(0, 0, 0, 0.22);
        }
        .gss-card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .gss-card-head-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
        }
        .gss-total {
          font-size: 12px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          padding: 3px 8px;
          border-radius: 7px;
        }
        .gss-total--ok {
          color: var(--success, #16a34a);
          background: color-mix(in srgb, var(--success) 12%, transparent);
        }
        .gss-total--bad {
          color: var(--danger, #dc2626);
          background: color-mix(in srgb, var(--danger) 12%, transparent);
        }

        .gss-bar-wrap {
          display: flex;
          gap: 3px;
          height: 14px;
          border-radius: 8px;
          padding: 3px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          margin-bottom: 8px;
        }
        .gss-bar-seg {
          border-radius: 6px;
          min-height: 100%;
          transition: flex-grow 0.2s ease, min-width 0.2s ease;
        }

        .gss-legend {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px 8px;
          margin: 0 0 12px;
          padding: 0;
        }
        .gss-legend-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 8px;
          background: color-mix(in srgb, var(--surface-2) 70%, var(--surface));
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          font-size: 11px;
          color: var(--text-2);
        }
        .gss-legend-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .gss-legend-name {
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .gss-legend-val {
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          color: var(--text);
        }

        .gss-sliders {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .gss-slider-card {
          padding: 10px 12px 8px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--surface-2) 55%, var(--surface));
          border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .gss-slider-card:focus-within {
          border-color: color-mix(in srgb, var(--gss-accent) 45%, var(--border));
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--gss-accent) 18%, transparent);
        }
        .gss-slider-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }
        .gss-slider-labels {
          display: flex;
          gap: 8px;
          align-items: center;
          min-width: 0;
        }
        .gss-slider-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--surface) 100%, transparent);
        }
        .gss-slider-title {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
          cursor: pointer;
        }
        .gss-slider-badge {
          flex-shrink: 0;
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
          padding: 4px 9px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          color: var(--text);
          background: var(--surface);
          border: 1px solid var(--border);
        }
        .gss-slider-badge-unit {
          font-size: 12px;
          font-weight: 700;
          color: var(--muted);
          margin-left: 1px;
        }

        .gss-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 22px;
          background: transparent;
          cursor: pointer;
        }
        .gss-range:focus { outline: none; }

        .gss-range::-webkit-slider-runnable-track {
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(
            to right,
            var(--gss-accent) 0%,
            var(--gss-accent) var(--gss-pct),
            color-mix(in srgb, var(--border) 65%, var(--surface-2)) var(--gss-pct),
            color-mix(in srgb, var(--border) 65%, var(--surface-2)) 100%
          );
          border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.06);
        }
        .gss-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          margin-top: -5px;
          background: var(--surface);
          border: 3px solid var(--gss-accent);
          box-shadow:
            0 2px 6px rgba(0,0,0,0.12),
            0 0 0 1px color-mix(in srgb, var(--border) 40%, transparent);
          transition: transform 0.12s ease, box-shadow 0.12s ease;
        }
        .gss-range:hover::-webkit-slider-thumb {
          transform: scale(1.06);
          box-shadow:
            0 3px 10px rgba(0,0,0,0.15),
            0 0 0 1px color-mix(in srgb, var(--gss-accent) 35%, transparent);
        }
        .gss-range:active::-webkit-slider-thumb {
          transform: scale(1.02);
        }

        .gss-range::-moz-range-track {
          height: 10px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--border) 65%, var(--surface-2));
          border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.06);
        }
        .gss-range::-moz-range-progress {
          height: 10px;
          border-radius: 999px 0 0 999px;
          background: var(--gss-accent);
        }
        .gss-range::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 3px solid var(--gss-accent);
          background: var(--surface);
          box-shadow: 0 2px 6px rgba(0,0,0,0.12);
        }

        .gss-guide-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 16px;
        }
        .gss-guide-modal {
          width: min(760px, 100%);
          max-height: min(80vh, 680px);
          overflow: auto;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--surface);
          box-shadow: 0 26px 56px -24px rgba(0, 0, 0, 0.45);
          padding: 14px;
        }
        .gss-guide-modal-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .gss-guide-modal-title {
          margin: 0;
          color: var(--text);
          font-size: 17px;
          font-weight: 800;
        }
        .gss-guide-close {
          border: 1px solid var(--border);
          background: var(--surface-2);
          color: var(--text);
          border-radius: 9px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .gss-guide-close:hover {
          background: color-mix(in srgb, var(--surface-2) 80%, white 20%);
        }
        .gss-guide-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .gss-guide-item {
          border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
          border-radius: 10px;
          background: color-mix(in srgb, var(--surface-2) 62%, var(--surface));
          padding: 9px 10px;
          display: grid;
          gap: 4px;
        }
        .gss-guide-title-row {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--text);
          font-size: 12px;
        }
        .gss-guide-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .gss-guide-text {
          margin: 0;
          color: var(--text-2);
          font-size: 12px;
          line-height: 1.35;
        }
        .gss-guide-tip {
          margin: 0;
          color: var(--muted);
          font-size: 11px;
          line-height: 1.3;
          font-style: italic;
        }

        .gss-footer {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
        }
        .gss-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 9px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s ease, transform 0.12s ease, background 0.15s ease;
        }
        .gss-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }
        .gss-btn:not(:disabled):active {
          transform: scale(0.98);
        }
        .gss-btn--primary {
          border: none;
          color: #fff;
          background: linear-gradient(
            165deg,
            color-mix(in srgb, var(--primary) 92%, white),
            var(--primary)
          );
          box-shadow: 0 4px 14px color-mix(in srgb, var(--primary) 35%, transparent);
        }
        .gss-btn--primary:not(:disabled):hover {
          filter: brightness(1.05);
        }
        .gss-btn--ghost {
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
        }
        .gss-btn--ghost:not(:disabled):hover {
          background: var(--surface-2);
        }

        @media (max-width: 760px) {
          .gss-guide-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      </div>
      {showGuideModal ? (
        <div className="gss-guide-modal-backdrop" onClick={() => setShowGuideModal(false)}>
          <div className="gss-guide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gss-guide-modal-head">
              <h2 className="gss-guide-modal-title">Scoring Components Guide</h2>
              <button
                type="button"
                className="gss-guide-close"
                onClick={() => setShowGuideModal(false)}
              >
                Close
              </button>
            </div>
            <div className="gss-guide-grid" aria-label="Scoring component explanations">
              {KEYS.map((key) => (
                <article key={`guide-${key}`} className="gss-guide-item">
                  <div className="gss-guide-title-row">
                    <span className="gss-guide-dot" style={{ background: CHANNELS[key].dot }} />
                    <strong>{LABELS[key]}</strong>
                  </div>
                  <p className="gss-guide-text">{EXPLANATIONS[key]}</p>
                  <p className="gss-guide-tip">{TUNING_GUIDE[key]}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {saveToast ? (
        <AlertToast type="success" message={saveToast} onClose={dismissSaveToast} />
      ) : null}
    </>
  );
};

export default GameplaySettingsPage;
