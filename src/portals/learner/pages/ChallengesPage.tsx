// src/portals/learner/pages/ChallengesPage.tsx
import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
import { learnerChallengesApi } from "@/services/api/learner/challenges.api";
import type { Challenge } from "@/types/api/learner/challenges";
import "@/shared/styles/tokens.css";
import "@/shared/styles/challenges.css";

export default function ChallengesPage() {
  // const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);

  useEffect(() => {
    loadChallenges(currentPage);
  }, [currentPage]);

  const loadChallenges = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await learnerChallengesApi.getAll(page, 20);

      if (response.data.isSuccess && response.data.data) {
        setChallenges(response.data.data.items);
        setTotalPages(response.data.data.totalPages);
      } else {
        setError(response.data.message || "Failed to load challenges");
      }
    } catch (err) {
      setError("An error occurred while loading challenges");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChallenge = (challenge: Challenge) => {
    // TODO: Navigate to game with selected challenge
    console.log("Selected challenge:", challenge);
    // navigate(`/game?challengeId=${challenge.id}`);
  };

  const getDifficultyLabel = (difficulty: number) => {
    switch (difficulty) {
      case 0:
        return "Easy";
      case 1:
        return "Medium";
      case 2:
        return "Hard";
      default:
        return "Unknown";
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 0:
        return "difficulty-easy";
      case 1:
        return "difficulty-medium";
      case 2:
        return "difficulty-hard";
      default:
        return "";
    }
  };

  const formatTimeLimit = (timeLimitMs: number) => {
    if (timeLimitMs === 0) return "No limit";
    const minutes = Math.floor(timeLimitMs / 60000);
    const seconds = Math.floor((timeLimitMs % 60000) / 1000);
    if (minutes === 0) return `${seconds}s`;
    if (seconds === 0) return `${minutes}m`;
    return `${minutes}m ${seconds}s`;
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return `${price.toLocaleString("vi-VN")} VND`;
  };

  const filteredChallenges =
    selectedDifficulty !== null
      ? challenges.filter((c) => c.difficulty === selectedDifficulty)
      : challenges;

  if (loading) {
    return (
      <div className="challenges-page">
        <div className="container">
          <div className="challenges-loading">Loading challenges...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="challenges-page">
        <div className="container">
          <div className="challenges-error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="challenges-page">
      <div className="container">
        <div className="challenges-header">
          <h1 className="challenges-title">Challenges Map Menu</h1>
          <p className="challenges-subtitle">Choose your challenge and start coding!</p>
        </div>

        <div className="challenges-filters">
          <button
            className={`filter-btn ${selectedDifficulty === null ? "active" : ""}`}
            onClick={() => setSelectedDifficulty(null)}
          >
            All
          </button>
          <button
            className={`filter-btn ${selectedDifficulty === 0 ? "active" : ""}`}
            onClick={() => setSelectedDifficulty(0)}
          >
            Easy
          </button>
          <button
            className={`filter-btn ${selectedDifficulty === 1 ? "active" : ""}`}
            onClick={() => setSelectedDifficulty(1)}
          >
            Medium
          </button>
          <button
            className={`filter-btn ${selectedDifficulty === 2 ? "active" : ""}`}
            onClick={() => setSelectedDifficulty(2)}
          >
            Hard
          </button>
        </div>

        <div className="challenges-grid">
          {filteredChallenges.map((challenge) => (
            <div key={challenge.id} className="card challenge-card">
              <div className="challenge-header">
                <h3 className="challenge-title">{challenge.title}</h3>
                <span
                  className={`challenge-difficulty ${getDifficultyColor(challenge.difficulty)}`}
                >
                  {getDifficultyLabel(challenge.difficulty)}
                </span>
              </div>

              <p className="challenge-description">{challenge.description}</p>

              <div className="challenge-meta">
                <div className="meta-item">
                  <svg className="meta-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M10 5V10L13 13M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{formatTimeLimit(challenge.timeLimitMs)}</span>
                </div>

                <div className="meta-item">
                  <svg className="meta-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{formatPrice(challenge.price)}</span>
                </div>
              </div>

              {challenge.tagNames && challenge.tagNames.length > 0 && (
                <div className="challenge-tags">
                  {challenge.tagNames.map((tag, idx) => (
                    <span key={idx} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {challenge.conceptNames && challenge.conceptNames.length > 0 && (
                <div className="challenge-concepts">
                  <span className="concepts-label">Concepts:</span>
                  <div className="concepts-list">
                    {challenge.conceptNames.map((concept, idx) => (
                      <span key={idx} className="concept">
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="challenge-actions">
                <button
                  className="btn btnPrimary"
                  onClick={() => handleSelectChallenge(challenge)}
                  disabled={!challenge.isPublished}
                >
                  {challenge.isPublished ? "Start Challenge" : "Coming Soon"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredChallenges.length === 0 && !loading && (
          <div className="challenges-empty">
            <p>No challenges found for the selected difficulty.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="challenges-pagination">
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
    </div>
  );
}
