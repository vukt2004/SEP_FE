import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cmsMapsApi } from "../../services/api/cms/maps.api";
import type { LevelMapItem } from "../../types/api/cms/maps";

export default function GameMenu() {
  const [levels, setLevels] = useState<LevelMapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadLevels = async () => {
      try {
        setIsLoading(true);
        // Fetch level maps from API
        const response = await cmsMapsApi.getLevelMaps({
          pageNumber: 1,
          pageSize: 100, // Get all levels
        });

        // API returns pagination data directly in response.data
        if (response.data.isSuccess && response.data.items) {
          setLevels(response.data.items);
        } else {
          throw new Error(response.data.message || "Failed to load levels");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        console.error("Failed to load levels:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadLevels();
  }, []);

  const handleLevelSelect = (level: LevelMapItem) => {
    // Navigate to appropriate game view based on level type
    const route = level.type === "platform" ? "/platform" : "/game";
    // Use the level ID directly
    navigate(route, { state: { levelId: level.id } });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "1":
        return "bg-green-500";
      case "2":
        return "bg-yellow-500";
      case "3":
        return "bg-orange-500";
      case "4":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case "1":
        return "Easy";
      case "2":
        return "Medium";
      case "3":
        return "Hard";
      case "4":
        return "Expert";
      default:
        return "Unknown";
    }
  };

  const getTypeIcon = (type: string) => {
    return type === "platform" ? "🎮" : "🎯";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="text-white text-2xl">Loading levels...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="text-red-400 text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Game Levels</h1>
          <p className="text-blue-200 text-lg">Choose a level to start playing</p>
        </div>

        {/* Level Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {levels.map((level) => (
            <div
              key={level.id}
              onClick={() => handleLevelSelect(level)}
              className="bg-white rounded-lg shadow-xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              {/* Level Type Icon */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-center">
                <div className="text-6xl mb-2">{getTypeIcon(level.type)}</div>
                <div className="text-white text-sm uppercase tracking-wider">{level.type}</div>
              </div>

              {/* Level Info */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{level.name}</h3>

                {/* Difficulty Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${getDifficultyColor(
                      level.difficulty,
                    )}`}
                  >
                    {getDifficultyLabel(level.difficulty)}
                  </span>
                </div>

                {/* Level ID */}
                <div className="text-sm text-gray-500 mb-4">
                  Level ID: <span className="font-mono">{level.id}</span>
                </div>

                {/* Play Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLevelSelect(level);
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Play Now
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Back Button */}
        <div className="text-center mt-12">
          <button
            onClick={() => navigate("/")}
            className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
