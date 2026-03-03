/**
 * CMS Marketplace Page
 *
 * Displays paginated list of all user packages with:
 * - Package details (name, duration, limit, price)
 * - Status indicators (Active/Inactive/Archived)
 * - Features specification
 * - Pagination controls
 * - Action buttons (View Details)
 */

import React, { useEffect, useState } from "react";
import { cmsMarketplaceApi } from "@/services/api/cms/marketplace.api";
import type {
  PackageListItem,
  PackageDetail,
  PackageStatusEnum,
} from "@/types/api/cms/marketplace";
import { Modal } from "../components/Modal";

export const MarketplacePage: React.FC = () => {
  const [packages, setPackages] = useState<PackageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal and action states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: "",
    durationDays: 0,
    limit: 0,
    price: 0,
    featuresSpec: "",
  });

  const [updateForm, setUpdateForm] = useState({
    name: "",
    durationDays: 0,
    limit: 0,
    price: 0,
    featuresSpec: "",
    isActive: false,
  });

  useEffect(() => {
    fetchPackages();
  }, [currentPage]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await cmsMarketplaceApi.getPackages({
        pageNumber: currentPage,
        pageSize,
      });

      const paginationData = response.data.data;
      if (paginationData) {
        setPackages(paginationData.items);
        setTotalPages(paginationData.totalPages);
        setTotalItems(paginationData.totalItems);
      }
    } catch (err) {
      setError("Failed to load packages");
      console.error("Packages fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (packageId: string) => {
    try {
      setActionLoading(true);
      const response = await cmsMarketplaceApi.getPackageById(packageId);
      const packageDetail = response.data.data;
      if (packageDetail) {
        setSelectedPackage(packageDetail);
        setDetailModalOpen(true);
      } else {
        alert("Package not found");
      }
    } catch (err) {
      alert("Failed to load package details");
      console.error("Package detail error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const response = await cmsMarketplaceApi.createPackage(createForm);
      if (response.data.isSuccess) {
        alert(`Package created successfully! ID: ${response.data.data}`);
        setCreateModalOpen(false);
        setCreateForm({ name: "", durationDays: 0, limit: 0, price: 0, featuresSpec: "" });
        fetchPackages();
      } else {
        alert(response.data.message || "Failed to create package");
      }
    } catch (err) {
      alert("Failed to create package");
      console.error("Create package error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenUpdateModal = async (packageId: string) => {
    try {
      setActionLoading(true);
      const response = await cmsMarketplaceApi.getPackageById(packageId);
      const packageDetail = response.data.data;
      if (packageDetail) {
        setSelectedPackage(packageDetail);
        setUpdateForm({
          name: packageDetail.name,
          durationDays: packageDetail.durationDays,
          limit: packageDetail.limit,
          price: packageDetail.price,
          featuresSpec: packageDetail.featuresSpec,
          isActive: packageDetail.isActive,
        });
        setUpdateModalOpen(true);
      } else {
        alert("Package not found");
      }
    } catch (err) {
      alert("Failed to load package details");
      console.error("Package detail error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;
    try {
      setActionLoading(true);
      const response = await cmsMarketplaceApi.updatePackage(selectedPackage.id, updateForm);
      if (response.data.isSuccess) {
        alert(response.data.message || "Package updated successfully!");
        setUpdateModalOpen(false);
        setSelectedPackage(null);
        fetchPackages();
      } else {
        alert(response.data.message || "Failed to update package");
      }
    } catch (err) {
      alert("Failed to update package");
      console.error("Update package error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const getPackageStatusLabel = (status: PackageStatusEnum) => {
    switch (status) {
      case 0:
        return "Inactive";
      case 1:
        return "Active";
      case 2:
        return "Archived";
      default:
        return "Unknown";
    }
  };

  const getPackageStatusColor = (status: PackageStatusEnum) => {
    switch (status) {
      case 0:
        return "var(--muted)";
      case 1:
        return "var(--success)";
      case 2:
        return "var(--warning)";
      default:
        return "var(--text-2)";
    }
  };

  const formatDuration = (days: number) => {
    if (days === 0) return "Unlimited";
    if (days >= 365) {
      const years = Math.floor(days / 365);
      return `${years} ${years === 1 ? "year" : "years"}`;
    }
    if (days >= 30) {
      const months = Math.floor(days / 30);
      return `${months} ${months === 1 ? "month" : "months"}`;
    }
    return `${days} ${days === 1 ? "day" : "days"}`;
  };

  const formatLimit = (limit: number) => {
    if (limit === 0) return "Unlimited";
    return limit.toString();
  };

  if (loading && packages.length === 0) {
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
          <p style={{ color: "var(--text-2)", marginTop: "16px" }}>Loading packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1
            style={{
              color: "var(--text)",
              fontSize: "28px",
              fontWeight: "bold",
              marginBottom: "8px",
            }}
          >
            Marketplace Packages
          </h1>
          <p style={{ color: "var(--text-2)" }}>Manage user subscription packages</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          style={{
            padding: "10px 20px",
            background: "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          ➕ Create Package
        </button>
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
            Total Packages
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
            Active Packages
          </div>
          <div style={{ color: "var(--text)", fontSize: "24px", fontWeight: "bold" }}>
            {packages.filter((p) => p.isActive).length}
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

      {/* Packages Table */}
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
                  PACKAGE NAME
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
                  DURATION
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
                  LIMIT
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
                  PRICE
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
                  FEATURES
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
              {packages.map((pkg) => (
                <tr
                  key={pkg.id}
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
                    <div style={{ fontWeight: "500", color: "var(--text)" }}>{pkg.name}</div>
                  </td>
                  <td style={{ padding: "16px", color: "var(--text-2)", fontSize: "14px" }}>
                    {formatDuration(pkg.durationDays)}
                  </td>
                  <td style={{ padding: "16px", color: "var(--text-2)", fontSize: "14px" }}>
                    {formatLimit(pkg.limit)}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div
                      style={{
                        color: pkg.price > 0 ? "var(--primary)" : "var(--text-2)",
                        fontSize: "14px",
                        fontWeight: pkg.price > 0 ? "500" : "normal",
                      }}
                    >
                      {pkg.price > 0 ? `$${pkg.price.toFixed(2)}` : "Free"}
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 12px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: "500",
                          background: `color-mix(in srgb, ${getPackageStatusColor(pkg.status)} 15%, transparent)`,
                          color: getPackageStatusColor(pkg.status),
                          width: "fit-content",
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: getPackageStatusColor(pkg.status),
                          }}
                        ></span>
                        {getPackageStatusLabel(pkg.status)}
                      </span>
                      {pkg.isActive && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--success)",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          ✓ Available
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div
                      style={{
                        color: "var(--text-2)",
                        fontSize: "13px",
                        maxWidth: "200px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {pkg.featuresSpec || "—"}
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      {/* View Details */}
                      <button
                        onClick={() => handleViewDetails(pkg.id)}
                        disabled={actionLoading}
                        style={{
                          padding: "6px 12px",
                          background: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          color: "var(--info)",
                          cursor: "pointer",
                          fontSize: "12px",
                          transition: "all 0.2s ease",
                        }}
                        title="View Details"
                      >
                        👁️
                      </button>
                      {/* Edit Package */}
                      <button
                        onClick={() => handleOpenUpdateModal(pkg.id)}
                        disabled={actionLoading}
                        style={{
                          padding: "6px 12px",
                          background: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          color: "var(--warning)",
                          cursor: "pointer",
                          fontSize: "12px",
                          transition: "all 0.2s ease",
                        }}
                        title="Edit Package"
                      >
                        ✏️
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

      {/* Create Package Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Package"
        maxWidth="600px"
      >
        <form
          onSubmit={handleCreatePackage}
          style={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          {/* Name */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              Package Name *
            </label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
              }}
              placeholder="Enter package name"
            />
          </div>

          {/* Duration Days */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              Duration (Days) *
            </label>
            <input
              type="number"
              value={createForm.durationDays}
              onChange={(e) =>
                setCreateForm({ ...createForm, durationDays: parseInt(e.target.value) || 0 })
              }
              required
              min="0"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
              }}
              placeholder="0 for unlimited"
            />
          </div>

          {/* Limit */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              Usage Limit *
            </label>
            <input
              type="number"
              value={createForm.limit}
              onChange={(e) =>
                setCreateForm({ ...createForm, limit: parseInt(e.target.value) || 0 })
              }
              required
              min="0"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
              }}
              placeholder="0 for unlimited"
            />
          </div>

          {/* Price */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              Price *
            </label>
            <input
              type="number"
              value={createForm.price}
              onChange={(e) =>
                setCreateForm({ ...createForm, price: parseFloat(e.target.value) || 0 })
              }
              required
              min="0"
              step="0.01"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
              }}
              placeholder="0 for free"
            />
          </div>

          {/* Features Spec */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              Features Specification *
            </label>
            <textarea
              value={createForm.featuresSpec}
              onChange={(e) => setCreateForm({ ...createForm, featuresSpec: e.target.value })}
              required
              rows={4}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
                resize: "vertical",
                fontFamily: "inherit",
              }}
              placeholder="Describe package features"
            />
          </div>

          {/* Submit Button */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
              paddingTop: "16px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              disabled={actionLoading}
              style={{
                padding: "10px 20px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              style={{
                padding: "10px 20px",
                background: actionLoading ? "var(--surface-2)" : "var(--primary)",
                border: "none",
                borderRadius: "8px",
                color: "white",
                fontSize: "14px",
                fontWeight: "500",
                cursor: actionLoading ? "not-allowed" : "pointer",
              }}
            >
              {actionLoading ? "Creating..." : "Create Package"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Package Modal */}
      <Modal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title="Update Package"
        maxWidth="600px"
      >
        <form
          onSubmit={handleUpdatePackage}
          style={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          {/* Name */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              Package Name *
            </label>
            <input
              type="text"
              value={updateForm.name}
              onChange={(e) => setUpdateForm({ ...updateForm, name: e.target.value })}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
              }}
              placeholder="Enter package name"
            />
          </div>

          {/* Duration Days */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              Duration (Days) *
            </label>
            <input
              type="number"
              value={updateForm.durationDays}
              onChange={(e) =>
                setUpdateForm({ ...updateForm, durationDays: parseInt(e.target.value) || 0 })
              }
              required
              min="0"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
              }}
              placeholder="0 for unlimited"
            />
          </div>

          {/* Limit */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              Usage Limit *
            </label>
            <input
              type="number"
              value={updateForm.limit}
              onChange={(e) =>
                setUpdateForm({ ...updateForm, limit: parseInt(e.target.value) || 0 })
              }
              required
              min="0"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
              }}
              placeholder="0 for unlimited"
            />
          </div>

          {/* Price */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              Price *
            </label>
            <input
              type="number"
              value={updateForm.price}
              onChange={(e) =>
                setUpdateForm({ ...updateForm, price: parseFloat(e.target.value) || 0 })
              }
              required
              min="0"
              step="0.01"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
              }}
              placeholder="0 for free"
            />
          </div>

          {/* Features Spec */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              Features Specification *
            </label>
            <textarea
              value={updateForm.featuresSpec}
              onChange={(e) => setUpdateForm({ ...updateForm, featuresSpec: e.target.value })}
              required
              rows={4}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
                resize: "vertical",
                fontFamily: "inherit",
              }}
              placeholder="Describe package features"
            />
          </div>

          {/* Is Active */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={updateForm.isActive}
                onChange={(e) => setUpdateForm({ ...updateForm, isActive: e.target.checked })}
                style={{
                  width: "18px",
                  height: "18px",
                  cursor: "pointer",
                }}
              />
              <span style={{ fontSize: "14px", color: "var(--text)" }}>
                Package is active and available for purchase
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
              paddingTop: "16px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              onClick={() => setUpdateModalOpen(false)}
              disabled={actionLoading}
              style={{
                padding: "10px 20px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              style={{
                padding: "10px 20px",
                background: actionLoading ? "var(--surface-2)" : "var(--primary)",
                border: "none",
                borderRadius: "8px",
                color: "white",
                fontSize: "14px",
                fontWeight: "500",
                cursor: actionLoading ? "not-allowed" : "pointer",
              }}
            >
              {actionLoading ? "Updating..." : "Update Package"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Package Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Package Details"
        maxWidth="700px"
      >
        {selectedPackage && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Basic Info */}
            <div style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "var(--text)",
                  marginBottom: "8px",
                }}
              >
                {selectedPackage.name}
              </h2>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 12px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: "500",
                    background: `color-mix(in srgb, ${getPackageStatusColor(selectedPackage.status)} 15%, transparent)`,
                    color: getPackageStatusColor(selectedPackage.status),
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: getPackageStatusColor(selectedPackage.status),
                    }}
                  ></span>
                  {getPackageStatusLabel(selectedPackage.status)}
                </span>
                {selectedPackage.isActive && (
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--success)",
                      fontWeight: "500",
                    }}
                  >
                    ✓ Currently Available
                  </span>
                )}
              </div>
            </div>

            {/* Metadata Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Duration
                </div>
                <div style={{ color: "var(--text)", fontSize: "16px", fontWeight: "500" }}>
                  {formatDuration(selectedPackage.durationDays)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Limit
                </div>
                <div style={{ color: "var(--text)", fontSize: "16px", fontWeight: "500" }}>
                  {formatLimit(selectedPackage.limit)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Price
                </div>
                <div
                  style={{
                    color: selectedPackage.price > 0 ? "var(--primary)" : "var(--text)",
                    fontSize: "20px",
                    fontWeight: "600",
                  }}
                >
                  {selectedPackage.price > 0 ? `$${selectedPackage.price.toFixed(2)}` : "Free"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Availability
                </div>
                <div style={{ color: "var(--text)", fontSize: "16px", fontWeight: "500" }}>
                  {selectedPackage.isActive ? "Available" : "Unavailable"}
                </div>
              </div>
            </div>

            {/* Features Spec */}
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "var(--text)",
                  marginBottom: "8px",
                }}
              >
                Features Specification
              </div>
              <div
                style={{
                  padding: "12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text-2)",
                  fontSize: "13px",
                  lineHeight: "1.6",
                  whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                  maxHeight: "200px",
                  overflow: "auto",
                }}
              >
                {selectedPackage.featuresSpec || "No features specified"}
              </div>
            </div>

            {/* Metadata */}
            <div
              style={{
                paddingTop: "16px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--text-2)", marginBottom: "4px" }}>
                Package ID
              </div>
              <div style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text)" }}>
                {selectedPackage.id}
              </div>
            </div>
          </div>
        )}
      </Modal>

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

export default MarketplacePage;
