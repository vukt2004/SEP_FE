// src/portals/learner/pages/PackagesPage.tsx
import { useEffect, useState } from "react";
import { learnerPackagesApi } from "@/services/api/learner/packages.api";
import type { Package } from "@/types/api/learner/packages";
import "@/shared/styles/tokens.css";
import "@/shared/styles/packages.css";

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadPackages(currentPage);
  }, [currentPage]);

  const loadPackages = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await learnerPackagesApi.getAll(page, 20);

      if (response.data.isSuccess && response.data.data) {
        setPackages(response.data.data.items);
        setTotalPages(response.data.data.totalPages);
      } else {
        setError(response.data.message || "Failed to load packages");
      }
    } catch (err) {
      setError("An error occurred while loading packages");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPackageDetail = async (id: string) => {
    try {
      const response = await learnerPackagesApi.getById(id);
      if (response.data.isSuccess && response.data.data) {
        setSelectedPackage(response.data.data);
      }
    } catch (err) {
      console.error("Failed to load package detail:", err);
    }
  };

  const handlePurchase = (pkg: Package) => {
    // TODO: Implement purchase logic
    alert(`Purchase package: ${pkg.name} for ${formatPrice(pkg.price)} VND`);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("vi-VN");
  };

  const formatDuration = (days: number) => {
    if (days === 1) return "1 day";
    if (days < 30) return `${days} days`;
    if (days === 30) return "1 month";
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (remainingDays === 0) return `${months} month${months > 1 ? "s" : ""}`;
    return `${months} month${months > 1 ? "s" : ""} ${remainingDays} day${remainingDays > 1 ? "s" : ""}`;
  };

  if (loading) {
    return (
      <div className="packages-page">
        <div className="container">
          <div className="packages-loading">Loading packages...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="packages-page">
        <div className="container">
          <div className="packages-error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="packages-page">
      <div className="container">
        <div className="packages-header">
          <h1 className="packages-title">Available Packages</h1>
          <p className="packages-subtitle">Choose the perfect package for your learning journey</p>
        </div>

        <div className="packages-grid">
          {packages.map((pkg) => (
            <div key={pkg.id} className="card package-card">
              <div className="package-header">
                <h3 className="package-name">{pkg.name}</h3>
                <span className={`package-status ${pkg.isActive ? "active" : "inactive"}`}>
                  {pkg.isActive ? "Available" : "Unavailable"}
                </span>
              </div>

              <div className="package-price">
                <span className="price-amount">{formatPrice(pkg.price)}</span>
                <span className="price-currency">VND</span>
              </div>

              <div className="package-details">
                <div className="package-detail-item">
                  <svg
                    className="detail-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M10 5V10L13 13M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Duration: {formatDuration(pkg.durationDays)}</span>
                </div>

                <div className="package-detail-item">
                  <svg
                    className="detail-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Limit: {pkg.limit} courses</span>
                </div>
              </div>

              {pkg.featuresSpec && (
                <div className="package-features">
                  <p>{pkg.featuresSpec}</p>
                </div>
              )}

              <div className="package-actions">
                <button className="btn btnSecondary" onClick={() => loadPackageDetail(pkg.id)}>
                  View Details
                </button>
                <button
                  className="btn btnPrimary"
                  onClick={() => handlePurchase(pkg)}
                  disabled={!pkg.isActive}
                >
                  Purchase
                </button>
              </div>
            </div>
          ))}
        </div>

        {packages.length === 0 && !loading && (
          <div className="packages-empty">
            <p>No packages available at the moment.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="packages-pagination">
            <button
              className="btn btnSecondary"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn btnSecondary"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {selectedPackage && (
        <div className="modal-overlay" onClick={() => setSelectedPackage(null)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedPackage.name}</h2>
              <button className="modal-close" onClick={() => setSelectedPackage(null)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Price:</span>
                <span className="detail-value">{formatPrice(selectedPackage.price)} VND</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Duration:</span>
                <span className="detail-value">{formatDuration(selectedPackage.durationDays)}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Course Limit:</span>
                <span className="detail-value">{selectedPackage.limit} courses</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span
                  className={`detail-value ${selectedPackage.isActive ? "status-active" : "status-inactive"}`}
                >
                  {selectedPackage.isActive ? "Available" : "Unavailable"}
                </span>
              </div>

              {selectedPackage.featuresSpec && (
                <div className="detail-row">
                  <span className="detail-label">Features:</span>
                  <p className="detail-value">{selectedPackage.featuresSpec}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btnSecondary" onClick={() => setSelectedPackage(null)}>
                Close
              </button>
              <button
                className="btn btnPrimary"
                onClick={() => {
                  handlePurchase(selectedPackage);
                  setSelectedPackage(null);
                }}
                disabled={!selectedPackage.isActive}
              >
                Purchase Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
