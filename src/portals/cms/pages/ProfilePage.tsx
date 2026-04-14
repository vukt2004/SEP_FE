/**
 * CMS Profile Page
 *
 * Displays and manages the current admin user's profile information:
 * - Personal details (name, email, phone, etc.)
 * - Avatar/profile picture
 * - Bio and position
 * - Edit profile functionality
 */

import React, { useEffect, useState } from "react";
import { cmsAuthApi } from "@/services/api/cms/auth.api";
import type { ProfileResponse, UpdateProfileRequest } from "@/types/api/cms/auth";
import { Modal } from "../components/Modal";
import { Pencil } from "lucide-react";
import { useTranslation } from "@/lib/i18n/translations";

export const ProfilePage: React.FC = () => {
  const { t, locale } = useTranslation();
  const localeTag = locale === "vi" ? "vi-VN" : "en-US";
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    avatarFile: null as File | null,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await cmsAuthApi.getProfile();
      const profileData = response.data.data;

      if (profileData) {
        setProfile(profileData);
      }
    } catch (err) {
      setError(t("cmsProfile.failedLoad"));
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = () => {
    if (profile) {
      setEditForm({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        phoneNumber: profile.phoneNumber || "",
        avatarFile: null,
      });
      setEditModalOpen(true);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);

      const updateData: UpdateProfileRequest = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phoneNumber: editForm.phoneNumber,
      };

      if (editForm.avatarFile) {
        updateData.avatarFile = editForm.avatarFile;
      }

      const response = await cmsAuthApi.updateProfile(updateData);

      if (response.data.isSuccess) {
        alert(t("cmsProfile.updateSuccess"));
        setEditModalOpen(false);
        fetchProfile(); // Refresh profile data
      } else {
        alert(response.data.message || t("cmsProfile.updateFailed"));
      }
    } catch (err) {
      alert(t("cmsProfile.updateFailed"));
      console.error("Update profile error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditForm({ ...editForm, avatarFile: file });
    }
  };

  const formatGender = (gender: number | null) => {
    if (gender === null) return t("cmsProfile.none");
    switch (gender) {
      case 0:
        return t("cmsProfile.gender.male");
      case 1:
        return t("cmsProfile.gender.female");
      case 2:
        return t("cmsProfile.gender.other");
      default:
        return t("cmsProfile.none");
    }
  };

  if (loading) {
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
          <p style={{ color: "var(--text-2)", marginTop: "16px" }}>{t("cmsProfile.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
        <div
          style={{
            padding: "16px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid var(--danger)",
            borderRadius: "12px",
            color: "var(--danger)",
          }}
        >
          {error || t("cmsProfile.failedLoad")}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
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
            {t("cmsProfile.title")}
          </h1>
          <p style={{ color: "var(--text-2)" }}>{t("cmsProfile.subtitle")}</p>
        </div>
        <button
          onClick={handleOpenEditModal}
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
          <Pencil size={16} />
          <span>{t("cmsProfile.editProfile")}</span>
        </button>
      </div>

      {/* Profile Card */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {/* Avatar Section */}
        <div
          style={{
            padding: "32px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <div
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: profile.avatarPath
                ? `url(${profile.avatarPath}) center/cover`
                : "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "48px",
              color: "white",
              fontWeight: "bold",
            }}
          >
            {!profile.avatarPath &&
              (profile.firstName?.[0] || profile.email?.[0] || "?").toUpperCase()}
          </div>
          <div>
            <h2
              style={{
                color: "var(--text)",
                fontSize: "24px",
                fontWeight: "600",
                marginBottom: "4px",
              }}
            >
              {profile.firstName && profile.lastName
                ? `${profile.firstName} ${profile.lastName}`
                : profile.email || t("cmsProfile.adminUser")}
            </h2>
            <p style={{ color: "var(--text-2)", fontSize: "14px", marginBottom: "8px" }}>
              {profile.position || t("cmsProfile.administrator")}
            </p>
            <p style={{ color: "var(--text-2)", fontSize: "14px" }}>{profile.email}</p>
          </div>
        </div>

        {/* Details Section */}
        <div style={{ padding: "32px" }}>
          <h3
            style={{
              color: "var(--text)",
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "24px",
            }}
          >
            {t("cmsProfile.personalInfo")}
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
            {/* First Name */}
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                {t("cmsProfile.field.firstName")}
              </div>
              <div style={{ color: "var(--text)", fontSize: "16px", fontWeight: "500" }}>
                {profile.firstName || t("cmsProfile.none")}
              </div>
            </div>

            {/* Last Name */}
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                {t("cmsProfile.field.lastName")}
              </div>
              <div style={{ color: "var(--text)", fontSize: "16px", fontWeight: "500" }}>
                {profile.lastName || t("cmsProfile.none")}
              </div>
            </div>

            {/* Email */}
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                {t("cmsProfile.field.email")}
              </div>
              <div style={{ color: "var(--text)", fontSize: "16px", fontWeight: "500" }}>
                {profile.email || t("cmsProfile.none")}
              </div>
            </div>

            {/* Phone */}
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                {t("cmsProfile.field.phone")}
              </div>
              <div style={{ color: "var(--text)", fontSize: "16px", fontWeight: "500" }}>
                {profile.phoneNumber || t("cmsProfile.none")}
              </div>
            </div>

            {/* Gender */}
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                {t("cmsProfile.field.gender")}
              </div>
              <div style={{ color: "var(--text)", fontSize: "16px", fontWeight: "500" }}>
                {formatGender(profile.gender)}
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                {t("cmsProfile.field.dateOfBirth")}
              </div>
              <div style={{ color: "var(--text)", fontSize: "16px", fontWeight: "500" }}>
                {profile.dateOfBirth
                  ? new Date(profile.dateOfBirth).toLocaleDateString(localeTag)
                  : t("cmsProfile.none")}
              </div>
            </div>

            {/* Position */}
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                {t("cmsProfile.field.position")}
              </div>
              <div style={{ color: "var(--text)", fontSize: "16px", fontWeight: "500" }}>
                {profile.position || t("cmsProfile.none")}
              </div>
            </div>

            {/* User ID */}
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                {t("cmsProfile.field.userId")}
              </div>
              <div
                style={{
                  color: "var(--text)",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                }}
              >
                {profile.userId || t("cmsProfile.none")}
              </div>
            </div>
          </div>

          {/* Bio Section */}
          {profile.bio && (
            <div
              style={{
                marginTop: "24px",
                paddingTop: "24px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "8px" }}>
                {t("cmsProfile.field.bio")}
              </div>
              <div
                style={{
                  color: "var(--text)",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  padding: "12px",
                  background: "var(--surface-2)",
                  borderRadius: "8px",
                }}
              >
                {profile.bio}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={t("cmsProfile.editModalTitle")}
        maxWidth="600px"
      >
        <form
          onSubmit={handleUpdateProfile}
          style={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          {/* First Name */}
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
              {t("cmsProfile.field.firstName")}
            </label>
            <input
              type="text"
              value={editForm.firstName}
              onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
              }}
              placeholder={t("cmsProfile.placeholder.firstName")}
            />
          </div>

          {/* Last Name */}
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
              {t("cmsProfile.field.lastName")}
            </label>
            <input
              type="text"
              value={editForm.lastName}
              onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
              }}
              placeholder={t("cmsProfile.placeholder.lastName")}
            />
          </div>

          {/* Phone Number */}
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
              {t("cmsProfile.field.phone")}
            </label>
            <input
              type="tel"
              value={editForm.phoneNumber}
              onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
              }}
              placeholder={t("cmsProfile.placeholder.phone")}
            />
          </div>

          {/* Avatar Upload */}
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
              {t("cmsProfile.field.profilePicture")}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
              }}
            />
            {editForm.avatarFile && (
              <p style={{ fontSize: "12px", color: "var(--text-2)", marginTop: "8px" }}>
                {t("cmsProfile.selected")}: {editForm.avatarFile.name}
              </p>
            )}
          </div>

          {/* Submit Buttons */}
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
              onClick={() => setEditModalOpen(false)}
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
              {t("cancel")}
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
              {actionLoading ? t("saving") : t("cmsProfile.saveChanges")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Loading spinner keyframes */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;
