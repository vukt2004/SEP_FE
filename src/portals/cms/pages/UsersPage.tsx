/**
 * CMS Users Page
 *
 * Displays paginated list of all users with:
 * - Role badges (Admin/Student)
 * - Status indicators (Active/Inactive/Suspended)
 * - Search and filter functionality
 * - Pagination controls
 * - Action buttons (View, Edit, Toggle Status)
 */

import React, { useEffect, useState } from "react";
import { cmsUsersApi } from "@/services/api/cms/users.api";
import type { UserListItem, UserDetail, EntityStatusEnum, RoleEnum } from "@/types/api/cms/users";
import { Modal } from "../components/Modal";

export const UsersPage: React.FC = () => {
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

  useEffect(() => {
    fetchUsers();
  }, [currentPage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await cmsUsersApi.getUsers({
        pageNumber: currentPage,
        pageSize,
      });

      setUsers(response.data.items);
      setTotalPages(response.data.totalPages);
      setTotalItems(response.data.totalItems);
    } catch (err) {
      setError("Failed to load users");
      console.error("Users fetch error:", err);
    } finally {
      setLoading(false);
    }
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
        alert("User not found");
      }
    } catch (err) {
      alert("Failed to load user details");
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
        alert("User not found");
      }
    } catch (err) {
      alert("Failed to load user details");
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
      alert("User updated successfully!");
      setEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert("Failed to update user");
      console.error("Update error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user: UserListItem) => {
    const newStatus: EntityStatusEnum = user.status === 1 ? 0 : 1;
    const statusLabel = newStatus === 1 ? "activate" : "deactivate";

    if (!confirm(`Are you sure you want to ${statusLabel} ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await cmsUsersApi.batchUpdateStatus({
        userIds: [user.id],
        status: newStatus,
      });
      alert(`User ${statusLabel}d successfully!`);
      fetchUsers();
    } catch (err) {
      alert(`Failed to ${statusLabel} user`);
      console.error("Status toggle error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleLabel = (roles: RoleEnum[]) => {
    if (roles.includes(0)) return "Admin";
    if (roles.includes(1)) return "Student";
    return "User";
  };

  const getRoleColor = (roles: RoleEnum[]) => {
    if (roles.includes(0)) return "var(--primary)";
    if (roles.includes(1)) return "var(--info)";
    return "var(--text-2)";
  };

  const getStatusLabel = (status: EntityStatusEnum) => {
    switch (status) {
      case 0:
        return "Inactive";
      case 1:
        return "Active";
      case 2:
        return "Suspended";
      case 3:
        return "Deleted";
      default:
        return "Unknown";
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
    return new Date(dateString).toLocaleDateString("en-US", {
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
          <p style={{ color: "var(--text-2)", marginTop: "16px" }}>Loading users...</p>
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
          Users Management
        </h1>
        <p style={{ color: "var(--text-2)" }}>View and manage all platform users</p>
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
            Total Users
          </div>
          <div style={{ color: "var(--text)", fontSize: "24px", fontWeight: "bold" }}>
            {totalItems}
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
                  NAME
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
                  EMAIL
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
                  ROLE
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
                  JOINED
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
                  LAST LOGIN
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
                        title="View Details"
                      >
                        👁️
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
                        title="Edit User"
                      >
                        ✏️
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
                        title={user.status === 1 ? "Deactivate" : "Activate"}
                      >
                        {user.status === 1 ? "🔒" : "✅"}
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

      {/* View Details Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="User Details">
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
                  Phone Number
                </div>
                <div style={{ color: "var(--text)" }}>{selectedUser.phoneNumber || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Status
                </div>
                <div style={{ color: "var(--text)" }}>{getStatusLabel(selectedUser.status)}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Role
                </div>
                <div style={{ color: "var(--text)" }}>{getRoleLabel(selectedUser.roles)}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Joined Date
                </div>
                <div style={{ color: "var(--text)" }}>{formatDate(selectedUser.joiningAt)}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Last Login
                </div>
                <div style={{ color: "var(--text)" }}>{formatDate(selectedUser.lastLoginAt)}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Email Confirmed
                </div>
                <div style={{ color: "var(--text)" }}>
                  {selectedUser.emailConfirmed ? "✅ Yes" : "❌ No"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Phone Confirmed
                </div>
                <div style={{ color: "var(--text)" }}>
                  {selectedUser.phoneNumberConfirmed ? "✅ Yes" : "❌ No"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  User ID
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
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit User">
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
                First Name
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
                Last Name
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
                Email
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
                Phone Number
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
                  Role
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
                  <option value={0}>Admin</option>
                  <option value={1}>Student</option>
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
                  Status
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
                  <option value={0}>Inactive</option>
                  <option value={1}>Active</option>
                  <option value={2}>Suspended</option>
                  <option value={3}>Deleted</option>
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
                {actionLoading ? "Saving..." : "Save Changes"}
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
                Cancel
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
