/**
 * CMS Reports Page
 *
 * Displays paginated list of all community reports with:
 * - Report status indicators
 * - Map information
 * - User details
 * - Report reason and details
 * - Pagination controls
 * - Action buttons (Resolve, Dismiss)
 */

import React, { useCallback, useEffect, useState } from "react";
import { cmsReportsApi } from "@/services/api/cms/reports.api";
import type { ReportListItem } from "@/types/api/cms/reports";
import { CheckCircle, X } from "lucide-react";

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Action state
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await cmsReportsApi.getReports({
        pageNumber: currentPage,
        pageSize,
      });

      const paginationData = response.data.data;
      if (paginationData) {
        setReports(paginationData.items);
        setTotalPages(paginationData.totalPages);
        setTotalItems(paginationData.totalItems);
      }
    } catch (err) {
      setError("Failed to load reports");
      console.error("Reports fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleResolve = async (reportId: string, mapTitle: string) => {
    const reviewNote = prompt(`Resolve report for "${mapTitle}"?\n\nEnter review note (optional):`);
    if (reviewNote === null) return; // User cancelled

    try {
      setActionLoading(true);
      await cmsReportsApi.resolveReport(reportId, { reviewNote: reviewNote || undefined });
      alert("Report resolved successfully!");
      fetchReports();
    } catch (err) {
      alert("Failed to resolve report");
      console.error("Resolve error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismiss = async (reportId: string, mapTitle: string) => {
    const reviewNote = prompt(`Dismiss report for "${mapTitle}"?\n\nEnter review note (optional):`);
    if (reviewNote === null) return; // User cancelled

    try {
      setActionLoading(true);
      await cmsReportsApi.dismissReport(reportId, { reviewNote: reviewNote || undefined });
      alert("Report dismissed successfully!");
      fetchReports();
    } catch (err) {
      alert("Failed to dismiss report");
      console.error("Dismiss error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("pending")) return "var(--warning)";
    if (statusLower.includes("resolved")) return "var(--success)";
    if (statusLower.includes("rejected")) return "var(--danger)";
    if (statusLower.includes("review")) return "var(--info)";
    return "var(--text-2)";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && reports.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              width: "48px",
              height: "48px",
              border: "4px solid var(--border)",
              borderTop: "4px solid var(--primary)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          ></div>
          <p style={{ color: "var(--text-2)", marginTop: "16px" }}>Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            color: "var(--text)",
            fontSize: "28px",
            fontWeight: "bold",
            marginBottom: "8px",
          }}
        >
          Community Reports
        </h1>
        <p style={{ color: "var(--text-2)" }}>View and manage user-submitted reports</p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "16px 20px",
            minWidth: "150px",
          }}
        >
          <div style={{ color: "var(--text-2)", fontSize: "13px", marginBottom: "4px" }}>
            Total Reports
          </div>
          <div style={{ color: "var(--text)", fontSize: "24px", fontWeight: "bold" }}>
            {totalItems}
          </div>
        </div>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "16px 20px",
            minWidth: "150px",
          }}
        >
          <div style={{ color: "var(--text-2)", fontSize: "13px", marginBottom: "4px" }}>
            Current Page
          </div>
          <div style={{ color: "var(--text)", fontSize: "24px", fontWeight: "bold" }}>
            {reports.length}
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "16px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid var(--danger)",
            borderRadius: "12px",
            color: "var(--danger)",
            marginBottom: "24px",
          }}
        >
          {error}
        </div>
      )}

      {/* Reports Table */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              color: "var(--text)",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "var(--surface-2)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "13px",
                    color: "var(--text-2)",
                  }}
                >
                  MAP
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "13px",
                    color: "var(--text-2)",
                  }}
                >
                  REASON
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "13px",
                    color: "var(--text-2)",
                  }}
                >
                  DETAILS
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "13px",
                    color: "var(--text-2)",
                  }}
                >
                  STATUS
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "13px",
                    color: "var(--text-2)",
                  }}
                >
                  REPORTED BY
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "13px",
                    color: "var(--text-2)",
                  }}
                >
                  CREATED AT
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    fontWeight: "600",
                    fontSize: "13px",
                    color: "var(--text-2)",
                  }}
                >
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr
                  key={report.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <td style={{ padding: "16px" }}>
                    <div>
                      <div style={{ fontWeight: "500", color: "var(--text)", marginBottom: "4px" }}>
                        {report.mapTitle}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--text-2)",
                          fontFamily: "monospace",
                        }}
                      >
                        {report.mapId.substring(0, 8)}...
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div
                      style={{
                        color: "var(--text)",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      {report.reason}
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div
                      style={{
                        color: "var(--text-2)",
                        fontSize: "13px",
                        maxWidth: "300px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {report.details || "—"}
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 12px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: "500",
                        background: `color-mix(in srgb, ${getStatusColor(report.reportStatus)} 15%, transparent)`,
                        color: getStatusColor(report.reportStatus),
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: getStatusColor(report.reportStatus),
                        }}
                      ></span>
                      {report.reportStatus}
                    </span>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-2)",
                        fontFamily: "monospace",
                      }}
                    >
                      {report.userId.substring(0, 13)}...
                    </div>
                  </td>
                  <td style={{ padding: "16px", color: "var(--text-2)", fontSize: "14px" }}>
                    {formatDate(report.createdAt)}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      {/* Resolve */}
                      <button
                        onClick={() => handleResolve(report.id, report.mapTitle)}
                        disabled={actionLoading}
                        style={{
                          padding: "6px 12px",
                          background: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          color: "var(--success)",
                          cursor: "pointer",
                          fontSize: "12px",
                          transition: "all 0.2s ease",
                        }}
                        title="Resolve Report"
                      >
                        <CheckCircle size={16} />
                      </button>

                      {/* Dismiss */}
                      <button
                        onClick={() => handleDismiss(report.id, report.mapTitle)}
                        disabled={actionLoading}
                        style={{
                          padding: "6px 12px",
                          background: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          color: "var(--danger)",
                          cursor: "pointer",
                          fontSize: "12px",
                          transition: "all 0.2s ease",
                        }}
                        title="Dismiss Report"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div style={{ color: "var(--text-2)", fontSize: "14px" }}>
              Showing page {currentPage} of {totalPages}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "8px 16px",
                  background: currentPage === 1 ? "var(--surface-2)" : "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: currentPage === 1 ? "var(--muted)" : "var(--text)",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  transition: "all 0.2s ease",
                }}
              >
                Previous
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: "8px 16px",
                  background: currentPage === totalPages ? "var(--surface-2)" : "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: currentPage === totalPages ? "var(--muted)" : "var(--text)",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  transition: "all 0.2s ease",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add keyframes for loading spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ReportsPage;
