/**
 * CMS Users Page
 *
 * Displays paginated list of all users with:
 * - Role badges (Admin/Learner)
 * - Status indicators (Active/Inactive/Suspended)
 * - Search and filter functionality
 * - Pagination controls
 * - Action buttons (View, Edit, Toggle Status)
 */

import React, { useCallback, useEffect, useState } from "react";
import { cmsUsersApi } from "@/services/api/cms/users.api";
import type {
  UserListItem,
  UserDetail,
  EntityStatusEnum,
  RoleEnum,
} from "@/types/api/cms/users";
import { Modal } from "../components/Modal";
import { Eye, Pencil, Lock, CheckCircle, Check, X, Search } from "lucide-react";
import { useTranslation } from "@/lib/i18n/translations";

export const UsersPage: React.FC = () => {
  const { t, locale } = useTranslation();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    status: 1 as EntityStatusEnum,
    newRole: 1 as RoleEnum,
  });

  // Search, filter and sort state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<EntityStatusEnum | "">("");
  const [joiningFrom, setJoiningFrom] = useState("");
  const [joiningTo, setJoiningTo] = useState("");
  const [sortBy, setSortBy] = useState("CreatedAt");
  const [isAscending, setIsAscending] = useState(false);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    filterStatus !== "" ||
    joiningFrom !== "" ||
    joiningTo !== "";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await cmsUsersApi.getUsers({
        page: currentPage,
        pageSize,
        search: debouncedSearchTerm.trim() || undefined,
        status: filterStatus === "" ? undefined : filterStatus,
        joiningFrom: joiningFrom || undefined,
        joiningTo: joiningTo || undefined,
        sortBy,
        isAscending,
      });

      setUsers(response.data.items);
      setTotalPages(response.data.totalPages);
      setTotalItems(response.data.totalItems);
    } catch (err) {
      setError(t("cmsUsers.failedLoadUsers"));
      console.error("Users fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    debouncedSearchTerm,
    filterStatus,
    joiningFrom,
    joiningTo,
    sortBy,
    isAscending,
  ]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFilterChange = (updaters: Array<() => void>) => {
    updaters.forEach((fn) => fn());
    setCurrentPage(1);
  };

  const handleViewDetails = async (userId: string) => {
    try {
      setActionLoading(true);
      const response = await cmsUsersApi.getUserById(userId);
      const user = response.data.data;
      if (user) {
        setSelectedUser(user);
        setViewModalOpen(true);
      } else {
        alert(t("cmsUsers.userNotFound"));
      }
    } catch (err) {
      alert(t("cmsUsers.failedLoadUserDetails"));
      console.error("User detail error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = async (userId: string) => {
    try {
      setActionLoading(true);
      const response = await cmsUsersApi.getUserById(userId);
      const user = response.data.data;
      if (user) {
        setSelectedUser(user);
        setEditForm({
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          phoneNumber: user.phoneNumber || "",
          status: user.status,
          newRole: user.roles[0] || 1,
        });
        setEditModalOpen(true);
      } else {
        alert(t("cmsUsers.userNotFound"));
      }
    } catch (err) {
      alert(t("cmsUsers.failedLoadUserDetails"));
      console.error("User detail error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      await cmsUsersApi.updateUser(selectedUser.id, editForm);
      alert(t("cmsUsers.updatedSuccess"));
      setEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert(t("cmsUsers.failedUpdate"));
      console.error("Update error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user: UserListItem) => {
    const newStatus: EntityStatusEnum = user.status === 1 ? 0 : 1;
    const statusLabel = newStatus === 1 ? t("cmsUsers.activate") : t("cmsUsers.deactivate");

    if (!confirm(`${t("cmsUsers.confirmToggle")}: ${statusLabel} ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await cmsUsersApi.batchUpdateStatus({
        userIds: [user.id],
        status: newStatus,
      });
      alert(`${t("cmsUsers.userLabel")} ${statusLabel} ${t("cmsUsers.success")}`);
      fetchUsers();
    } catch (err) {
      alert(`${t("cmsUsers.failedTo")} ${statusLabel} ${t("cmsUsers.userLabel")}`);
      console.error("Status toggle error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleLabel = (roles: RoleEnum[]) => {
    if (roles.includes(0)) return t("cmsUsers.role.admin");
    if (roles.includes(2)) return t("cmsUsers.role.moderator");
    if (roles.includes(1)) return t("cmsUsers.role.learner");
    return t("cmsUsers.role.user");
  };

  const getRoleColor = (roles: RoleEnum[]) => {
    if (roles.includes(0)) return "var(--primary)";
    if (roles.includes(2)) return "var(--warning)";
    if (roles.includes(1)) return "var(--info)";
    return "var(--text-2)";
  };

  const getStatusLabel = (status: EntityStatusEnum) => {
    switch (status) {
      case 0:
        return t("cmsUsers.status.inactive");
      case 1:
        return t("cmsUsers.status.active");
      case 2:
        return t("cmsUsers.status.suspended");
      case 3:
        return t("cmsUsers.status.deleted");
      default:
        return t("unknown");
    }
  };

  const getStatusColor = (status: EntityStatusEnum) => {
    switch (status) {
      case 0:
        return "var(--muted)";
      case 1:
        return "var(--success)";
      case 2:
        return "var(--warning)";
      case 3:
        return "var(--danger)";
      default:
        return "var(--text-2)";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading && users.length === 0) {
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
          <p style={{ color: "var(--text-2)", marginTop: "16px" }}>{t("cmsUsers.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
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
          {t("cmsUsers.title")}
        </h1>
        <p style={{ color: "var(--text-2)" }}>{t("cmsUsers.subtitle")}</p>
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
            {t("cmsUsers.totalUsers")}
          </div>
          <div style={{ color: "var(--text)", fontSize: "24px", fontWeight: "bold" }}>
            {totalItems}
          </div>
        </div>
      </div>

      {/* Search, Filter & Sort */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: "1", minWidth: "220px", maxWidth: "320px" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-2)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleFilterChange([() => setSearchTerm(e.target.value)])}
            placeholder={t("cmsUsers.searchPlaceholder")}
            style={{
              width: "100%",
              padding: "8px 12px 8px 32px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text)",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) =>
            handleFilterChange([
              () => setFilterStatus(e.target.value === "" ? "" : (Number(e.target.value) as EntityStatusEnum)),
            ])
          }
          style={{
            padding: "8px 12px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          <option value="">{t("cmsUsers.allStatuses")}</option>
          <option value={1}>{t("cmsUsers.status.active")}</option>
          <option value={0}>{t("cmsUsers.status.inactive")}</option>
        </select>

        <input
          type="date"
          value={joiningFrom}
          onChange={(e) => handleFilterChange([() => setJoiningFrom(e.target.value)])}
          style={{
            padding: "8px 12px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            fontSize: "14px",
          }}
          title={t("cmsUsers.joinedFrom")}
        />

        <input
          type="date"
          value={joiningTo}
          min={joiningFrom || undefined}
          onChange={(e) => handleFilterChange([() => setJoiningTo(e.target.value)])}
          style={{
            padding: "8px 12px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            fontSize: "14px",
          }}
          title={t("cmsUsers.joinedTo")}
        />

        <select
          value={sortBy}
          onChange={(e) => handleFilterChange([() => setSortBy(e.target.value)])}
          style={{
            padding: "8px 12px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          <option value="CreatedAt">{t("cmsUsers.sortJoinedDate")}</option>
          <option value="FirstName">{t("cmsUsers.sortFirstName")}</option>
          <option value="Email">{t("cmsUsers.sortEmail")}</option>
          <option value="LastLoginAt">{t("cmsUsers.sortLastLogin")}</option>
        </select>

        <button
          onClick={() => handleFilterChange([() => setIsAscending((prev) => !prev)])}
          style={{
            padding: "8px 14px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            fontSize: "14px",
            cursor: "pointer",
            fontWeight: "500",
          }}
          title={isAscending ? t("cmsUsers.ascending") : t("cmsUsers.descending")}
        >
          {isAscending ? `↑ ${t("cmsUsers.asc")}` : `↓ ${t("cmsUsers.desc")}`}
        </button>

        {hasActiveFilters && (
          <button
            onClick={() =>
              handleFilterChange([
                () => setSearchTerm(""),
                () => setFilterStatus(""),
                () => setJoiningFrom(""),
                () => setJoiningTo(""),
              ])
            }
            style={{
              padding: "8px 14px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text-2)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {t("clearFilters")}
          </button>
        )}
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

      {/* Users Table */}
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
                  {t("cmsUsers.table.name")}
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
                  {t("cmsUsers.table.email")}
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
                  {t("cmsUsers.table.role")}
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
                  {t("cmsUsers.table.status")}
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
                  {t("cmsUsers.table.joined")}
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
                  {t("cmsUsers.table.lastLogin")}
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
                  {t("cmsUsers.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
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
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "var(--text-2)",
                        }}
                      >
                        {user.firstName?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div style={{ fontWeight: "500", color: "var(--text)" }}>
                          {user.firstName} {user.lastName}
                        </div>
                        {user.phoneNumber && (
                          <div style={{ fontSize: "12px", color: "var(--text-2)" }}>
                            {user.phoneNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px", color: "var(--text-2)", fontSize: "14px" }}>
                    {user.email || "—"}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 12px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: "500",
                        background: `color-mix(in srgb, ${getRoleColor(user.roles)} 15%, transparent)`,
                        color: getRoleColor(user.roles),
                        border: `1px solid ${getRoleColor(user.roles)}`,
                      }}
                    >
                      {getRoleLabel(user.roles)}
                    </span>
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
                        background: `color-mix(in srgb, ${getStatusColor(user.status)} 15%, transparent)`,
                        color: getStatusColor(user.status),
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: getStatusColor(user.status),
                        }}
                      ></span>
                      {getStatusLabel(user.status)}
                    </span>
                  </td>
                  <td style={{ padding: "16px", color: "var(--text-2)", fontSize: "14px" }}>
                    {formatDate(user.joiningAt)}
                  </td>
                  <td style={{ padding: "16px", color: "var(--text-2)", fontSize: "14px" }}>
                    {formatDate(user.lastLoginAt)}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      {/* View Details */}
                      <button
                        onClick={() => handleViewDetails(user.id)}
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
                        title={t("cmsUsers.action.viewDetails")}
                      >
                        <Eye size={16} />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => handleEditClick(user.id)}
                        disabled={actionLoading}
                        style={{
                          padding: "6px 12px",
                          background: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          color: "var(--primary)",
                          cursor: "pointer",
                          fontSize: "12px",
                          transition: "all 0.2s ease",
                        }}
                        title={t("cmsUsers.action.editUser")}
                      >
                        <Pencil size={16} />
                      </button>

                      {/* Toggle Status */}
                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={actionLoading}
                        style={{
                          padding: "6px 12px",
                          background: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          color: user.status === 1 ? "var(--warning)" : "var(--success)",
                          cursor: "pointer",
                          fontSize: "12px",
                          transition: "all 0.2s ease",
                        }}
                        title={
                          user.status === 1
                            ? t("cmsUsers.action.deactivate")
                            : t("cmsUsers.action.activate")
                        }
                      >
                        {user.status === 1 ? <Lock size={16} /> : <CheckCircle size={16} />}
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
              {t("showingPage")} {currentPage} {t("of")} {totalPages}
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
                {t("previous")}
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
                {t("next")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={t("cmsUsers.viewModalTitle")}
      >
        {selectedUser && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                paddingBottom: "16px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "var(--surface-2)",
                  border: "2px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  fontWeight: "600",
                  color: "var(--text)",
                }}
              >
                {selectedUser.firstName?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: "600", color: "var(--text)" }}>
                  {selectedUser.firstName} {selectedUser.lastName}
                </div>
                <div style={{ fontSize: "14px", color: "var(--text-2)" }}>{selectedUser.email}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  {t("cmsUsers.field.phoneNumber")}
                </div>
                <div style={{ color: "var(--text)" }}>{selectedUser.phoneNumber || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  {t("cmsUsers.field.status")}
                </div>
                <div style={{ color: "var(--text)" }}>{getStatusLabel(selectedUser.status)}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  {t("cmsUsers.field.role")}
                </div>
                <div style={{ color: "var(--text)" }}>{getRoleLabel(selectedUser.roles)}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  {t("cmsUsers.field.joinedDate")}
                </div>
                <div style={{ color: "var(--text)" }}>{formatDate(selectedUser.joiningAt)}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  {t("cmsUsers.field.lastLogin")}
                </div>
                <div style={{ color: "var(--text)" }}>{formatDate(selectedUser.lastLoginAt)}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  {t("cmsUsers.field.emailConfirmed")}
                </div>
                <div
                  style={{
                    color: "var(--text)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {selectedUser.emailConfirmed ? (
                    <>
                      <Check size={16} color="var(--success)" /> <span>{t("cmsUsers.yes")}</span>
                    </>
                  ) : (
                    <>
                      <X size={16} color="var(--danger)" /> <span>{t("cmsUsers.no")}</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  {t("cmsUsers.field.phoneConfirmed")}
                </div>
                <div
                  style={{
                    color: "var(--text)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {selectedUser.phoneNumberConfirmed ? (
                    <>
                      <Check size={16} color="var(--success)" /> <span>{t("cmsUsers.yes")}</span>
                    </>
                  ) : (
                    <>
                      <X size={16} color="var(--danger)" /> <span>{t("cmsUsers.no")}</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  {t("cmsUsers.field.userId")}
                </div>
                <div style={{ color: "var(--text)", fontSize: "11px", fontFamily: "monospace" }}>
                  {selectedUser.id}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={t("cmsUsers.editModalTitle")}
      >
        {selectedUser && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateUser();
            }}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "var(--text-2)",
                  marginBottom: "6px",
                }}
              >
                {t("cmsUsers.field.firstName")}
              </label>
              <input
                type="text"
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  fontSize: "14px",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "var(--text-2)",
                  marginBottom: "6px",
                }}
              >
                {t("cmsUsers.field.lastName")}
              </label>
              <input
                type="text"
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  fontSize: "14px",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "var(--text-2)",
                  marginBottom: "6px",
                }}
              >
                {t("cmsUsers.field.email")}
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  fontSize: "14px",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "var(--text-2)",
                  marginBottom: "6px",
                }}
              >
                {t("cmsUsers.field.phoneNumber")}
              </label>
              <input
                type="tel"
                value={editForm.phoneNumber}
                onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  fontSize: "14px",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    color: "var(--text-2)",
                    marginBottom: "6px",
                  }}
                >
                  {t("cmsUsers.field.role")}
                </label>
                <select
                  value={editForm.newRole}
                  onChange={(e) =>
                    setEditForm({ ...editForm, newRole: Number(e.target.value) as RoleEnum })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--text)",
                    fontSize: "14px",
                  }}
                >
                  <option value={0}>{t("cmsUsers.role.admin")}</option>
                  <option value={1}>{t("cmsUsers.role.learner")}</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    color: "var(--text-2)",
                    marginBottom: "6px",
                  }}
                >
                  {t("cmsUsers.field.status")}
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: Number(e.target.value) as EntityStatusEnum })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--text)",
                    fontSize: "14px",
                  }}
                >
                  <option value={0}>{t("cmsUsers.status.inactive")}</option>
                  <option value={1}>{t("cmsUsers.status.active")}</option>
                  <option value={2}>{t("cmsUsers.status.suspended")}</option>
                  <option value={3}>{t("cmsUsers.status.deleted")}</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <button
                type="submit"
                disabled={actionLoading}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "var(--primary)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  opacity: actionLoading ? 0.6 : 1,
                }}
              >
                {actionLoading ? t("saving") : t("cmsUsers.saveChanges")}
              </button>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                {t("cancel")}
              </button>
            </div>
          </form>
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

export default UsersPage;
