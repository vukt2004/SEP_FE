import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brush,
  Eraser,
  PaintBucket,
  History,
  Layers,
  Settings2,
  Save,
  Maximize2,
  Shapes,
  Pencil,
  ImagePlus,
} from "lucide-react";
import type { MapData } from "../../shared/types/MapSchema";
import type { GameType } from "../../shared/types/GameType";
import { useLanguageStore } from "@/stores/language.store";
import { getT } from "@/lib/i18n/translations";
import { TilePalette} from "./TilePalette";
import {
  ObjectSpriteLoader,
  ObjectSpriteCache,
  type ObjectDefinition,
} from "../../modules/engine/assets";
import blocksConfig from "../../shared/block/blocks-config.json";
import { cmsMapsApi } from "../../services/api/cms/maps.api";
import { learnerMapsApi } from "../../services/api/learner/maps.api";
import { useLearnerAuthStore } from "../../stores/auth/learnerAuth.store";
import { useCmsAuthStore } from "../../stores/auth/cmsAuth.store";
import { exportMapToGameFormat } from "../../tools/map-editor/utils/exportMapToGameFormat";
import {
  getSupportedUnlockCharacters,
  sanitizeUnlockCode,
} from "../../tools/map-editor/utils/unlockCode";
import { ROUTES } from "../../lib/constants/routes";
import type { RequiredBlockRule } from "../../shared/types/MapSchema";

type MapTag = {
  id: string;
  name: string;
};

/**
 * Convert MapData config type to GameType
 */
function mapTypeToGameType(mapType: "platform" | "topdown"): GameType {
  return mapType === "platform" ? "platformer" : "topdown";
}

interface MapEditorControlsProps {
  mapData: MapData;
  activeLayer: "background" | "ground" | "foreground" | "collision";
  selectedTile: number | null;
  selectedObjectId: number | null; // Changed from string enum to numeric ID
  selectedTool: "paint" | "erase" | "fill" | "player" | "goal" | null;
  canUndo: boolean;
  canRedo: boolean;
  onLayerChange: (layer: "background" | "ground" | "foreground" | "collision") => void;
  onTileSelect: (tileId: number | null) => void;
  onObjectSelect: (objectId: number | null) => void; // Changed to numeric ID
  onPortalColorChange?: (color: "blue" | "green" | "orange" | "purple") => void;
  onToolSelect: (tool: "paint" | "erase" | "fill" | "player" | "goal" | null) => void;
  onResize: (width: number, height: number, tileSize: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onTypeChange?: (type: "platform" | "topdown") => void;
  onNameChange?: (name: string) => void;
  onDescriptionChange?: (description: string) => void;
  onDifficultyChange?: (difficulty: 1 | 2 | 3 | 4 | 5) => void;
  onTimeLimitChange?: (seconds: number) => void;
  onEstimatedStepsChange?: (steps: number) => void;
  onWinConditionChange?: (winCondition: 1 | 2) => void;
  onLevelObjectiveChange?: (objective: string) => void;
  onRequiredFruitsChange?: (requiredFruits: number) => void;
  onPriceChange?: (price: number) => void;
  onBlockLimitChange?: (blockLimit: number | null) => void;
  onAllowedBlocksChange?: (allowedBlocks: string[]) => void;
  onRequiredBlocksChange?: (requiredBlocks: RequiredBlockRule[]) => void;
  onObjectDefinitionsLoaded?: (defs: Record<string, ObjectDefinition>) => void;
  onObjectMetadataChange?: (index: number, metadata: Record<string, unknown>) => void;
  sectionMode?: "left" | "right";
  editingMapId?: string;
  editorMode?: "edit" | "view";
  initialSelectedTagNames?: string[];
  initialAvatarUrl?: string | null;
  initialHints?: string[];
}

interface ObjectSelectionButtonProps {
  objectId: number;
  label: string;
  objectDef: ObjectDefinition;
  cache: ObjectSpriteCache;
  selectedObjectId: number | null;
  isSelected: boolean;
  deselectHint: string;
  onObjectSelect: (id: number|null) => void;
}

function ObjectSelectionButton({
  objectId,
  label,
  objectDef,
  cache,
  selectedObjectId,
  deselectHint,
  onObjectSelect,
}: ObjectSelectionButtonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const spriteSheet = cache.getSprite(objectDef.imagePath);
    if (!spriteSheet) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Extract the specific frame from the sprite sheet
    const cols = objectDef.columns ?? Infinity;
    const frameX = (objectDef.frameIndex % cols) * objectDef.frameWidth;
    const frameY = Math.floor(objectDef.frameIndex / cols) * objectDef.frameHeight;

    // Draw centered and scaled to fit canvas
    const scale = Math.min(
      canvas.width / objectDef.frameWidth,
      canvas.height / objectDef.frameHeight,
    );
    const scaledWidth = objectDef.frameWidth * scale;
    const scaledHeight = objectDef.frameHeight * scale;
    const offsetX = (canvas.width - scaledWidth) / 2;
    const offsetY = (canvas.height - scaledHeight) / 2;

    ctx.drawImage(
      spriteSheet,
      frameX,
      frameY,
      objectDef.frameWidth,
      objectDef.frameHeight,
      offsetX,
      offsetY,
      scaledWidth,
      scaledHeight,
    );
  }, [objectDef, cache]);

  return (
    <button
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        padding: "12px",
        fontSize: "13px",
        fontWeight: "500",
        border: selectedObjectId === objectId ? "2px solid #4CAF50" : "2px solid #ddd",
        borderRadius: "6px",
        backgroundColor: selectedObjectId === objectId ? "#e8f5e9" : "white",
        cursor: "pointer",
        transition: "all 0.2s",
        minWidth: "80px",
        boxShadow: selectedObjectId === objectId ? "0 2px 6px rgba(76,175,80,0.3)" : "none",
      }}
      onClick={() => onObjectSelect(selectedObjectId === objectId ? null : objectId)}
      title={`${label} (${deselectHint})`}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          border: "1px solid #e0e0e0",
          borderRadius: "4px",
          overflow: "hidden",
          backgroundColor: "#f9f9f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <canvas
          ref={canvasRef}
          width={48}
          height={48}
          style={{ display: "block", imageRendering: "pixelated" }}
        />
      </div>
      <span style={{ fontSize: "11px", fontWeight: "500", color: "#555" }}>{label}</span>
    </button>
  );
}

export function MapEditorControls({
  mapData,
  activeLayer,
  selectedTile,
  selectedObjectId,
  selectedTool,
  canUndo,
  canRedo,
  onLayerChange,
  onTileSelect,
  onObjectSelect,
  onPortalColorChange,
  onToolSelect,
  onResize,
  onUndo,
  onRedo,
  onTypeChange,
  onNameChange,
  onDescriptionChange,
  onDifficultyChange,
  onTimeLimitChange,
  onEstimatedStepsChange,
  onWinConditionChange,
  onLevelObjectiveChange,
  onRequiredFruitsChange,
  onPriceChange,
  onBlockLimitChange,
  onAllowedBlocksChange,
  onRequiredBlocksChange,
  onObjectDefinitionsLoaded,
  onObjectMetadataChange,
  sectionMode = "right",
  editingMapId,
  editorMode,
  initialSelectedTagNames = [],
  initialAvatarUrl = null,
  initialHints = [],
}: MapEditorControlsProps) {
  const navigate = useNavigate();
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [showMapInfoModal, setShowMapInfoModal] = useState(false);
  const [resizeWidth, setResizeWidth] = useState(mapData.config.width);
  const [resizeHeight, setResizeHeight] = useState(mapData.config.height);
  const [resizeTileSize, setResizeTileSize] = useState(mapData.config.tileSize);
  const [hints, setHints] = useState<string[]>(initialHints.length > 0 ? initialHints : [""]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(initialAvatarUrl);
  const { locale } = useLanguageStore();
  const t = useMemo(() => getT(locale), [locale]);
  const isVi = locale === "vi";
  const tr = (en: string, vi: string) => (isVi ? vi : en);
  const tt = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const [availableTileGroups, setAvailableTileGroups] = useState<string[]>([]);
  const [selectedTileGroup, setSelectedTileGroup] = useState("all");
  const [activeInlineField, setActiveInlineField] = useState<
    | "name"
    | "description"
    | "difficulty"
    | "timeLimit"
    | "estimatedSteps"
    | "winCondition"
    | "levelObjective"
    | "requiredFruits"
    | "price"
    | "tags"
    | "hints"
    | null
  >(null);
  const [hoveredInlineField, setHoveredInlineField] = useState<
    | "name"
    | "description"
    | "difficulty"
    | "timeLimit"
    | "estimatedSteps"
    | "winCondition"
    | "levelObjective"
    | "requiredFruits"
    | "price"
    | "tags"
    | "hints"
    | null
  >(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [availableMapTags, setAvailableMapTags] = useState<MapTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loadingMapTags, setLoadingMapTags] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPortalColor, setSelectedPortalColor] = useState<"blue" | "green" | "orange" | "purple">("blue");
  const [portalColorCounts, setPortalColorCounts] = useState<Record<string, number>>({
    blue: 0,
    green: 0,
    orange: 0,
    purple: 0,
  });

  const isBoxType = (type: string): boolean =>
    type === "box" || type === "box1" || type === "box2" || type === "box3";

  const configurableObjects = mapData.objects.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type === "door" || isBoxType(item.type));

  const supportedUnlockCharactersLabel = useMemo(() => {
    const chars = getSupportedUnlockCharacters(mapData.config.type);
    return chars.join(" ");
  }, [mapData.config.type]);

  const getDoorMetadata = (metadata: Record<string, unknown> | undefined) => {
    const isOpen = typeof metadata?.isOpen === "boolean" ? metadata.isOpen : false;
    const isLocked = typeof metadata?.isLocked === "boolean" ? metadata.isLocked : false;
    const unlockCodeRaw = typeof metadata?.unlockCode === "string" ? metadata.unlockCode : "";
    const unlockCode = sanitizeUnlockCode(unlockCodeRaw, mapData.config.type);
    return { isOpen, isLocked, unlockCode };
  };

  const getBoxHardness = (type: string, metadata: Record<string, unknown> | undefined): number => {
    if (typeof metadata?.hardness === "number" && Number.isFinite(metadata.hardness)) {
      return Math.max(1, Math.floor(metadata.hardness));
    }
    if (type === "box1") return 1;
    if (type === "box2") return 2;
    if (type === "box3" || type === "box") return 3;
    return 1;
  };

  const updateDoorMetadata = (
    index: number,
    currentMetadata: Record<string, unknown> | undefined,
    changes: Partial<{ isOpen: boolean; isLocked: boolean; unlockCode: string }>,
  ) => {
    if (!onObjectMetadataChange) return;
    const current = getDoorMetadata(currentMetadata);
    const next = {
      ...current,
      ...changes,
      unlockCode:
        changes.unlockCode !== undefined
          ? sanitizeUnlockCode(changes.unlockCode, mapData.config.type)
          : current.unlockCode,
    };
    onObjectMetadataChange(index, {
      ...(currentMetadata ?? {}),
      ...next,
    });
  };

  const updateBoxMetadata = (
    index: number,
    currentMetadata: Record<string, unknown> | undefined,
    hardness: number,
  ) => {
    if (!onObjectMetadataChange) return;
    onObjectMetadataChange(index, {
      ...(currentMetadata ?? {}),
      hardness: Math.max(1, Math.floor(hardness)),
    });
  };

  const gameType = mapTypeToGameType(mapData.config.type);
  const [objectCache] = useState(() => new ObjectSpriteCache());

  // Detect user type for API selection
  const learnerAuth = useLearnerAuthStore();
  const cmsAuth = useCmsAuthStore();
  const isLearner = learnerAuth.isAuthenticated;
  const isCms = cmsAuth.isAuthenticated;
  const userType = isLearner ? "learner" : isCms ? "cms" : "unknown";
  const [objectDefinitions, setObjectDefinitions] = useState<Record<
    string,
    ObjectDefinition
  > | null>(null);
  const availableBlocks = blocksConfig.blocks;
  const blockTypeToLabel = new Map(
    availableBlocks.map((block) => {
      const key = `block.${block.type}`;
      const translated = t(key);
      return [block.type, translated === key ? block.label : translated] as const;
    }),
  );
  const normalizedAllowedBlocks = Array.from(
    new Set(mapData.blockConstraints.allowedBlocks ?? []),
  ).filter((type) => availableBlocks.some((block) => block.type === type));
  const blocksAvailableForGameplay =
    normalizedAllowedBlocks.length === 0
      ? availableBlocks
      : availableBlocks.filter((block) => normalizedAllowedBlocks.includes(block.type));
  const normalizedRequiredBlocks = Array.from(
    new Map(
      mapData.blockConstraints.requiredBlocks
        .filter((rule) => blocksAvailableForGameplay.some((block) => block.type === rule.type))
        .map((rule) => [rule.type, { type: rule.type, minCount: Math.max(1, rule.minCount) }]),
    ).values(),
  );
  const [objectSpritesLoaded, setObjectSpritesLoaded] = useState(false);
  const showLeftPanel = sectionMode === "left";
  const showRightPanel = sectionMode === "right";

  // Load object sprites on mount or when game type changes
  useEffect(() => {
    if (!showLeftPanel) {
      setObjectSpritesLoaded(false);
      setObjectDefinitions(null);
      return;
    }

    let cancelled = false;

    // Reset immediately so UI shows loading state during transition
    setObjectSpritesLoaded(false);
    setObjectDefinitions(null);

    async function loadObjects() {
      try {
        // Create loader with current game type
        const objectLoader = new ObjectSpriteLoader(gameType);
        const defs = await objectLoader.loadObjectDefinitions("objects");

        // Preload all sprite images BEFORE setting definitions
        const imagePathsSet = new Set<string>();
        for (const objDef of Object.values(defs)) {
          imagePathsSet.add(objDef.imagePath);
        }

        await Promise.all(Array.from(imagePathsSet).map((path) => objectCache.loadSprite(path)));

        // Only set definitions after all images are loaded
        if (cancelled) return;
        setObjectDefinitions(defs);
        setObjectSpritesLoaded(true);
        if (onObjectDefinitionsLoaded) {
          onObjectDefinitionsLoaded(defs);
        }
      } catch (err) {
        console.error("Failed to load object definitions:", err);
        if (!cancelled) {
          setObjectSpritesLoaded(true); // Still set true to avoid infinite loading
          setObjectDefinitions(null);
        }
      }
    }

    loadObjects();

    return () => {
      cancelled = true;
    };
  }, [gameType, objectCache, onObjectDefinitionsLoaded, showLeftPanel]);

  useEffect(() => {
    if (!showRightPanel || userType === "unknown") {
      return;
    }

    let cancelled = false;

    const loadMapTags = async () => {
      try {
        setLoadingMapTags(true);
        const response = isLearner
          ? await learnerMapsApi.getMapTags()
          : await cmsMapsApi.getMapTags();
        if (!cancelled && response.data.isSuccess && Array.isArray(response.data.data)) {
          setAvailableMapTags(response.data.data);
        }
      } catch (error) {
        console.error("Failed to load map tags:", error);
      } finally {
        if (!cancelled) {
          setLoadingMapTags(false);
        }
      }
    };

    loadMapTags();

    return () => {
      cancelled = true;
    };
  }, [showRightPanel, isLearner, userType]);

  useEffect(() => {
    if (!availableMapTags.length) {
      return;
    }

    const selectedNameSet = new Set(initialSelectedTagNames.map((name) => name.toLowerCase()));
    const initialTagIds = availableMapTags
      .filter((tag) => selectedNameSet.has(tag.name.toLowerCase()))
      .map((tag) => tag.id);

    setSelectedTagIds(initialTagIds);
  }, [availableMapTags, initialSelectedTagNames]);

  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  useEffect(() => {
    setAvatarPreviewUrl(initialAvatarUrl ?? null);
  }, [initialAvatarUrl, showMapInfoModal]);

  useEffect(() => {
    if (!showMapInfoModal) {
      return;
    }

    setHints(initialHints.length > 0 ? initialHints : [""]);
  }, [showMapInfoModal, initialHints]);

  useEffect(() => {
    if (!avatarFile) {
      return;
    }

    const nextUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [avatarFile]);

  // Update portal color counts when mapData changes
  useEffect(() => {
    const counts: Record<string, number> = {
      blue: 0,
      green: 0,
      orange: 0,
      purple: 0,
    };

    mapData.objects.items?.forEach((item) => {
      if (item.type === "portal") {
        const color = (item.metadata?.color as string) || "blue";
        if (color in counts) {
          counts[color]++;
        }
      }
    });

    setPortalColorCounts(counts);
  }, [mapData.objects.items]);

  const selectedTagNames = availableMapTags
    .filter((tag) => selectedTagIds.includes(tag.id))
    .map((tag) => tag.name);

  const difficultyLabel = `${mapData.config.difficulty}/5`;

  const winConditionLabel =
    mapData.config.winCondition === 2
      ? tr("Collect Fruits", "Thu thap trai cay")
      : tr("Reach Goal", "Den dich");

  const handleResizeConfirm = () => {
    // Validate map size (10-30)
    const validWidth = Math.max(10, Math.min(30, resizeWidth));
    const validHeight = Math.max(10, Math.min(30, resizeHeight));

    if (validWidth !== resizeWidth || validHeight !== resizeHeight) {
      alert(
        tr(
          `Map size must be between 10x10 and 30x30. Adjusting to ${validWidth}x${validHeight}.`,
          `Kich thuoc ban do phai trong khoang 10x10 den 30x30. Tu dong dieu chinh ve ${validWidth}x${validHeight}.`,
        ),
      );
    }

    onResize(validWidth, validHeight, resizeTileSize);
    setShowResizeDialog(false);
  };

  const handleBlockLimitInput = (value: string) => {
    if (!onBlockLimitChange) return;

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      onBlockLimitChange(null);
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return;
    }

    onBlockLimitChange(Math.max(1, Math.floor(parsed)));
  };

  const updateAllowedBlock = (index: number, nextType: string) => {
    if (!onAllowedBlocksChange) return;

    const next = [...normalizedAllowedBlocks];
    next[index] = nextType;
    const dedupedAllowed = Array.from(new Set(next));
    onAllowedBlocksChange(dedupedAllowed);

    if (onRequiredBlocksChange) {
      const sanitizedRequired = normalizedRequiredBlocks.filter((rule) =>
        dedupedAllowed.length === 0 ? true : dedupedAllowed.includes(rule.type),
      );
      onRequiredBlocksChange(sanitizedRequired);
    }
  };

  const addAllowedBlock = () => {
    if (!onAllowedBlocksChange) return;

    const usedTypes = new Set(normalizedAllowedBlocks);
    const candidate = availableBlocks.find((block) => !usedTypes.has(block.type));
    if (!candidate) return;

    onAllowedBlocksChange([...normalizedAllowedBlocks, candidate.type]);
  };

  const removeAllowedBlock = (index: number) => {
    if (!onAllowedBlocksChange) return;

    const nextAllowed = normalizedAllowedBlocks.filter((_, i) => i !== index);
    onAllowedBlocksChange(nextAllowed);

    if (!onRequiredBlocksChange) return;
    const sanitizedRequired = normalizedRequiredBlocks.filter((rule) =>
      nextAllowed.length === 0 ? true : nextAllowed.includes(rule.type),
    );
    onRequiredBlocksChange(sanitizedRequired);
  };

  const updateRequiredBlock = (
    index: number,
    patch: Partial<{ type: string; minCount: number }>,
  ) => {
    if (!onRequiredBlocksChange) return;

    const next = normalizedRequiredBlocks.map((rule, ruleIndex) =>
      ruleIndex === index ? { ...rule, ...patch } : rule,
    );
    const deduped = Array.from(new Map(next.map((rule) => [rule.type, rule])).values()).filter(
      (rule) =>
        normalizedAllowedBlocks.length === 0 || normalizedAllowedBlocks.includes(rule.type),
    );
    onRequiredBlocksChange(deduped);
  };

  const addRequiredBlock = () => {
    if (!onRequiredBlocksChange) return;

    const usedTypes = new Set(normalizedRequiredBlocks.map((rule) => rule.type));
    const candidate = blocksAvailableForGameplay.find((block) => !usedTypes.has(block.type));
    if (!candidate) return;

    onRequiredBlocksChange([
      ...normalizedRequiredBlocks,
      { type: candidate.type, minCount: 1 },
    ]);
  };

  const removeRequiredBlock = (index: number) => {
    if (!onRequiredBlocksChange) return;
    onRequiredBlocksChange(normalizedRequiredBlocks.filter((_, i) => i !== index));
  };

  const validateBlockRules = (): string[] => {
    const errors: string[] = [];
    const allowedSet = new Set(normalizedAllowedBlocks);
    const requiredTypes = normalizedRequiredBlocks.map((rule) => rule.type);
    const requiredSet = new Set(requiredTypes);

    if (allowedSet.size !== normalizedAllowedBlocks.length) {
      errors.push(tr("Allowed blocks contains duplicate block types.", "Khối được phép có kiểu khối bị trùng."));
    }

    if (requiredSet.size !== requiredTypes.length) {
      errors.push(tr("Required blocks contains duplicate block types.", "Khối bắt buộc có kiểu khối bị trùng."));
    }

    if (normalizedAllowedBlocks.length > 0) {
      const invalidRequired = normalizedRequiredBlocks.filter(
        (rule) => !allowedSet.has(rule.type),
      );
      if (invalidRequired.length > 0) {
        errors.push(tr("Required blocks must be selected from Allowed Blocks.", "Khối bắt buộc phải được chọn từ danh sách Khối được phép."));
      }
    }

    const blockLimit = mapData.blockConstraints.blockLimit;
    if (
      blockLimit !== null &&
      (typeof blockLimit !== "number" || !Number.isFinite(blockLimit) || blockLimit < 1)
    ) {
      errors.push(tr("Block limit must be at least 1 or empty for unlimited.", "Giới hạn khối phải >= 1 hoặc để trống để không giới hạn."));
    }

    return errors;
  };

  const toBlockLabel = (type: string) => blockTypeToLabel.get(type) ?? type;
  const allowedSummary =
    normalizedAllowedBlocks.length === 0
      ? tr("All blocks allowed", "Tat ca khối deu duoc phep")
      : normalizedAllowedBlocks.map((type) => toBlockLabel(type)).join(", ");
  const requiredSummary =
    normalizedRequiredBlocks.length === 0
      ? tr("No required blocks", "Khong co khối bat buoc")
      : normalizedRequiredBlocks
          .map((rule) =>
            tr(
              `Use "${toBlockLabel(rule.type)}" at least ${rule.minCount} time${rule.minCount > 1 ? "s" : ""}`,
              `Dung "${toBlockLabel(rule.type)}" it nhat ${rule.minCount} lan`,
            ),
          )
          .join("; ");
  const limitSummary =
    mapData.blockConstraints.blockLimit === null
      ? tr("Unlimited", "Khong gioi han")
      : tr(`${mapData.blockConstraints.blockLimit} blocks`, `${mapData.blockConstraints.blockLimit} khoi`);
  const hasAllowedRequiredConflict =
    normalizedAllowedBlocks.length > 0 &&
    normalizedRequiredBlocks.some((rule) => !normalizedAllowedBlocks.includes(rule.type));

  const handleSaveMapFromModal = async () => {
    const mapName = mapData.config.name?.trim();
    if (!mapName) {
      alert(tr("Please set a map name before saving", "Vui long dat ten ban do truoc khi luu"));
      return;
    }

    const hasPlayer = mapData.objects.items.some((item) => item.type === "player");
    const hasGoal = mapData.objects.items.some((item) => item.type === "goal");
    if (!hasPlayer || !hasGoal) {
      alert(tr("Please place both a Player start and a Goal before saving the map.", "Vui long dat ca vi tri bat dau cua Nguoi choi va Dich truoc khi luu ban do."));
      return;
    }

    if (
      mapData.config.winCondition === 2 &&
      mapData.config.requiredFruits !== undefined &&
      mapData.config.requiredFruits > 0
    ) {
      const totalFruits = mapData.objects.items.filter((obj) => obj.type === "fruit").length;
      if (mapData.config.requiredFruits > totalFruits) {
        alert(
          tr(
            `Required fruits (${mapData.config.requiredFruits}) cannot exceed the total number of fruits on the map (${totalFruits}).`,
            `So trai cay yeu cau (${mapData.config.requiredFruits}) khong duoc vuot qua tong so trai cay tren ban do (${totalFruits}).`,
          ),
        );
        return;
      }
    }

    if (userType === "unknown") {
      alert(tr("You must be logged in as a learner or CMS user to save maps", "Ban can dang nhap voi tai khoan learner hoac CMS de luu ban do"));
      return;
    }

    const ruleErrors = validateBlockRules();
    if (ruleErrors.length > 0) {
      alert(
        tr(
          `Please fix block rules before saving:\n- ${ruleErrors.join("\n- ")}`,
          `Vui long sua quy tac khoi truoc khi luu:\n- ${ruleErrors.join("\n- ")}`,
        ),
      );
      return;
    }

    if (!confirm(tr("Do you want to save the map?", "Ban co muon luu ban do khong?"))) return;

    try {
      setUploading(true);

      const normalizedHints = hints
        .map((h) => h.trim())
        .filter((h) => h.length > 0)
        .slice(0, 3)
        .map((content, index) => {
          const orderNo = index + 1;

          return {
            // Keep both naming styles to support strict backend JSON binders.
            orderNo,
            content,
            OrderNo: orderNo,
            Content: content,
          };
        });
      const hintsJson = normalizedHints.length > 0 ? JSON.stringify(normalizedHints) : undefined;

      const gameLevelFormat = exportMapToGameFormat(mapData);
      const json = JSON.stringify(gameLevelFormat, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const file = new File([blob], `${gameLevelFormat.id}.json`, { type: "application/json" });

      const mapType: "Topdown" | "Platform" =
        mapData.config.type === "platform" ? "Platform" : "Topdown";

      const mapsApi = isLearner ? learnerMapsApi : cmsMapsApi;
      const isEditingExistingMap = Boolean(editingMapId && editorMode === "edit");

      const payload = {
        Title: mapData.config.name,
        Description: mapData.config.description || "Map created with Map Editor",
        Type: mapType,
        Difficulty: mapData.config.difficulty,
        TimeLimitMs: mapData.config.timeLimitSeconds * 1000,
        WinCondition: mapData.config.winCondition,
        Price: mapData.config.price,
        HintsJson: hintsJson,
        TagIdsCsv: selectedTagIds.length > 0 ? selectedTagIds.join(",") : undefined,
        MapDetailFile: file,
        AvatarFile: avatarFile ?? undefined,
      };

      const updatePayload = {
        Title: payload.Title,
        Description: payload.Description,
        Type: payload.Type,
        Difficulty: payload.Difficulty,
        TimeLimitMs: payload.TimeLimitMs,
        WinCondition: payload.WinCondition,
        Price: payload.Price,
        HintsJson: payload.HintsJson,
        TagIdsCsv: payload.TagIdsCsv,
        MapDetailFile: payload.MapDetailFile,
      };

      const response = isEditingExistingMap
        ? await mapsApi.updateMapFromJson(editingMapId!, updatePayload)
        : await mapsApi.uploadMapFromJson(payload);

      if (response.data.isSuccess) {
        if (isEditingExistingMap && isLearner && editingMapId && avatarFile) {
          const avatarResponse = await learnerMapsApi.uploadMapAvatar(editingMapId, avatarFile);
          if (!avatarResponse.data.isSuccess) {
            alert(
              tr(
                `Map updated but avatar upload failed: ${avatarResponse.data.message || "Unknown error"}`,
                `Cap nhat ban do thanh cong nhung tai avatar that bai: ${avatarResponse.data.message || "Loi khong xac dinh"}`,
              ),
            );
            return;
          }
        }

        const mapId =
          response.data.data && typeof response.data.data === "object" && "id" in response.data.data
            ? String(response.data.data.id)
            : "";
        alert(
          isEditingExistingMap
            ? tr("Map updated successfully!", "Cap nhat ban do thanh cong!")
            : tr(
                `Map saved successfully!${mapId ? ` Map ID: ${mapId}` : ""}`,
                `Luu ban do thanh cong!${mapId ? ` Ma ban do: ${mapId}` : ""}`,
              ),
        );
        setShowMapInfoModal(false);
        setAvatarFile(null);

        if (isLearner) {
          navigate(ROUTES.LEARNER_MAPS);
        } else {
          navigate(-1);
        }
      } else {
        alert(
          tr(
            `Save failed: ${response.data.message || "Unknown error"}`,
            `Luu that bai: ${response.data.message || "Loi khong xac dinh"}`,
          ),
        );
      }
    } catch (error) {
      console.error("Save error:", error);
      alert(
        tr(
          `Failed to save map: ${error instanceof Error ? error.message : "Unknown error"}`,
          `Khong the luu ban do: ${error instanceof Error ? error.message : "Loi khong xac dinh"}`,
        ),
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      {showRightPanel && (
        <>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <History size={16} /> {tt("mapEditorHistory", "History")}
            </h3>
            <div style={styles.buttonGroup}>
              <button
                style={{
                  ...styles.button,
                  ...(canUndo ? {} : styles.buttonDisabled),
                }}
                onClick={onUndo}
                disabled={!canUndo}
              >
                ↶ {tt("mapEditorUndo", "Undo")}
              </button>
              <button
                style={{
                  ...styles.button,
                  ...(canRedo ? {} : styles.buttonDisabled),
                }}
                onClick={onRedo}
                disabled={!canRedo}
              >
                ↷ {tt("mapEditorRedo", "Redo")}
              </button>
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <Layers size={16} /> {tt("mapEditorActiveLayer", "Active Layer")}
            </h3>
            <div style={styles.buttonGroup}>
              <button
                style={{
                  ...styles.button,
                  ...(activeLayer === "background" ? styles.buttonActive : {}),
                }}
                onClick={() => onLayerChange("background")}
              >
                {tt("mapEditorLayerBackground", "Background")}
              </button>
              <button
                style={{
                  ...styles.button,
                  ...(activeLayer === "ground" ? styles.buttonActive : {}),
                }}
                onClick={() => onLayerChange("ground")}
              >
                {tt("mapEditorLayerGround", "Ground")}
              </button>
              <button
                style={{
                  ...styles.button,
                  ...(activeLayer === "foreground" ? styles.buttonActive : {}),
                }}
                onClick={() => onLayerChange("foreground")}
              >
                {tt("mapEditorLayerForeground", "Foreground")}
              </button>
              <button
                style={{
                  ...styles.button,
                  ...(activeLayer === "collision" ? styles.buttonActive : {}),
                }}
                onClick={() => onLayerChange("collision")}
              >
                {tt("mapEditorLayerCollision", "Collision")}
              </button>
            </div>
            {activeLayer === "collision" && (
              <p style={styles.helpText}>
                {tr(
                  "Collision layer: paint blocks movement, erase makes paths passable.",
                  "Lop va cham: to de chan di chuyen, xoa de cho phep di qua.",
                )}
              </p>
            )}
            {activeLayer === "foreground" && (
              <p style={styles.helpText}>{tr("Foreground renders above objects and player.", "Tien canh hien thi tren vat the va nguoi choi.")}</p>
            )}
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>{tt("mapEditorBlockRules", "Block Rules")}</h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>{tt("mapEditorBlockLimitLabel", "Block Limit:")}</label>
              <p style={styles.helpText}>{tt("mapEditorBlockLimitHint", "Leave empty for unlimited blocks")}</p>
              <input
                type="number"
                min="1"
                value={mapData.blockConstraints.blockLimit ?? ""}
                onChange={(e) => handleBlockLimitInput(e.target.value)}
                placeholder={tt("mapEditorUnlimited", "Unlimited")}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{tt("mapEditorAllowedBlocksLabel", "Allowed Blocks:")}</label>
              <p style={styles.helpText}>{tt("mapEditorAllowedBlocksHint1", "Leave empty to allow all blocks")}</p>
              <p style={styles.helpText}>{tt("mapEditorAllowedBlocksHint2", "Only selected blocks will be available to the player")}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {normalizedAllowedBlocks.length === 0 && (
                  <div style={styles.placeholderText}>{tt("mapEditorAllowedBlocksEmpty", "No selection. All blocks are allowed.")}</div>
                )}
                {normalizedAllowedBlocks.map((type, index) => (
                  <div
                    key={`panel-allowed-row-${type}-${index}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: "6px",
                      alignItems: "center",
                    }}
                  >
                    <select
                      value={type}
                      onChange={(e) => updateAllowedBlock(index, e.target.value)}
                      style={styles.select}
                    >
                      {availableBlocks
                        .filter((block) => block.type === type || !normalizedAllowedBlocks.includes(block.type))
                        .map((block) => (
                        <option key={`panel-allowed-option-${block.type}`} value={block.type}>
                          {toBlockLabel(block.type)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeAllowedBlock(index)}
                      style={{
                        padding: "6px 8px",
                        background: "#ff6b6b",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "11px",
                      }}
                    >
                      {tt("mapEditorRemove", "Remove")}
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addAllowedBlock}
                disabled={normalizedAllowedBlocks.length >= availableBlocks.length}
                style={{
                  marginTop: "8px",
                  padding: "8px 10px",
                  background:
                    normalizedAllowedBlocks.length >= availableBlocks.length
                      ? "#cfd8dc"
                      : "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    normalizedAllowedBlocks.length >= availableBlocks.length
                      ? "not-allowed"
                      : "pointer",
                  fontSize: "12px",
                }}
              >
                + {tt("mapEditorAddAllowedBlock", "Add Allowed Block")}
              </button>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{tt("mapEditorRequiredBlocksLabel", "Required Blocks:")}</label>
              <p style={styles.helpText}>{tt("mapEditorRequiredBlocksHint", "Players must use these blocks at least N times")}</p>
              {hasAllowedRequiredConflict && (
                <p style={styles.ruleWarningText}>
                  {tr(
                    "Some required blocks are outside Allowed Blocks and must be fixed before saving.",
                    "Mot so khoi bat buoc nam ngoai danh sach Khoi duoc phep va can sua truoc khi luu.",
                  )}
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {normalizedRequiredBlocks.map((rule, index) => (
                  <div
                    key={`panel-required-${rule.type}-${index}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 80px auto",
                      gap: "6px",
                      alignItems: "center",
                    }}
                  >
                    <select
                      value={rule.type}
                      onChange={(e) => updateRequiredBlock(index, { type: e.target.value })}
                      style={styles.select}
                      disabled={blocksAvailableForGameplay.length === 0}
                    >
                      {blocksAvailableForGameplay
                        .filter((block) => block.type === rule.type || !normalizedRequiredBlocks.some((r) => r.type === block.type))
                        .map((block) => (
                        <option key={`panel-required-option-${block.type}`} value={block.type}>
                          {toBlockLabel(block.type)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={rule.minCount}
                      onChange={(e) =>
                        updateRequiredBlock(index, {
                          minCount: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      style={styles.input}
                    />
                    <button
                      onClick={() => removeRequiredBlock(index)}
                      style={{
                        padding: "6px 8px",
                        background: "#ff6b6b",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "11px",
                      }}
                    >
                      {tt("mapEditorRemove", "Remove")}
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addRequiredBlock}
                disabled={
                  blocksAvailableForGameplay.length === 0 ||
                  normalizedRequiredBlocks.length >= blocksAvailableForGameplay.length
                }
                style={{
                  marginTop: "8px",
                  padding: "8px 10px",
                  background:
                    blocksAvailableForGameplay.length === 0 ||
                    normalizedRequiredBlocks.length >= blocksAvailableForGameplay.length
                      ? "#cfd8dc"
                      : "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    blocksAvailableForGameplay.length === 0 ||
                    normalizedRequiredBlocks.length >= blocksAvailableForGameplay.length
                      ? "not-allowed"
                      : "pointer",
                  fontSize: "12px",
                }}
              >
                + {tt("mapEditorAddRequiredBlock", "Add Required Block")}
              </button>
              {blocksAvailableForGameplay.length === 0 && (
                <p style={styles.ruleWarningText}>
                  {tr("No blocks are currently available for requirement rules.", "Hien tai khong co khoi nao kha dung cho quy tac bat buoc.")}
                </p>
              )}
            </div>

            <div style={styles.ruleSummaryPanel}>
              <p style={styles.ruleSummaryTitle}>{tt("mapEditorRuleSummary", "Rule Summary:")}</p>
              <p style={styles.ruleSummaryItem}>- {tt("mapEditorAllowedShort", "Allowed")}: {allowedSummary}</p>
              <p style={styles.ruleSummaryItem}>- {tt("mapEditorRequiredShort", "Required")}: {requiredSummary}</p>
              <p style={styles.ruleSummaryItem}>- {tt("mapEditorLimitShort", "Limit")}: {limitSummary}</p>
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>{tt("mapEditorObjectMetadata", "Object Metadata")}</h3>
            <p style={styles.helpText}>{tt("mapEditorObjectMetadataHint", "Configure metadata for placed doors and boxes.")}</p>

            {configurableObjects.length === 0 && (
              <p style={styles.placeholderText}>{tr("Place a door or box object to configure metadata.", "Dat mot cua hoac hop de cau hinh metadata.")}</p>
            )}

            {configurableObjects.map(({ item, index }) => {
              if (item.type === "door") {
                const door = getDoorMetadata(item.metadata);
                return (
                  <div key={`door-meta-${index}`} style={styles.objectMetadataCard}>
                    <p style={styles.objectMetadataTitle}>{tr("Door at", "Cua tai")} ({item.x}, {item.y})</p>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={door.isOpen}
                        onChange={(e) =>
                          updateDoorMetadata(index, item.metadata, { isOpen: e.target.checked })
                        }
                      />
                      {tr("Open by default", "Mo mac dinh")}
                    </label>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={door.isLocked}
                        onChange={(e) =>
                          updateDoorMetadata(index, item.metadata, { isLocked: e.target.checked })
                        }
                      />
                      {tr("Locked", "Khoa")}
                    </label>
                    <label style={styles.label}>{tr("Unlock Code", "Ma mo khoa")}</label>
                    <input
                      type="text"
                      value={door.unlockCode}
                      onChange={(e) =>
                        updateDoorMetadata(index, item.metadata, { unlockCode: e.target.value })
                      }
                      placeholder={tr("e.g. AB1", "vi du: AB1")}
                      style={styles.input}
                    />
                    <p style={styles.helpText}>{tr("Supported characters", "Ky tu ho tro")}: {supportedUnlockCharactersLabel}</p>
                  </div>
                );
              }

              const hardness = getBoxHardness(item.type, item.metadata);
              return (
                <div key={`box-meta-${index}`} style={styles.objectMetadataCard}>
                  <p style={styles.objectMetadataTitle}>
                    {item.type} at ({item.x}, {item.y})
                  </p>
                  <label style={styles.label}>{tr("Hardness", "Do cung")}</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={hardness}
                    onChange={(e) =>
                      updateBoxMetadata(index, item.metadata, Number(e.target.value) || hardness)
                    }
                    style={styles.input}
                  />
                </div>
              );
            })}
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <Settings2 size={16} /> {tt("mapEditorMapSettings", "Map Settings")}
            </h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tt("mapEditorMapType", "Map Type")}</label>
              <select
                value={mapData.config.type}
                onChange={(e) => onTypeChange?.(e.target.value as "platform" | "topdown")}
                style={styles.select}
              >
                <option value="platform">{tr("Platform", "Platform")}</option>
                <option value="topdown">{tr("Top Down", "Top Down")}</option>
              </select>
            </div>
            <div style={styles.actionButtons}>
              <button style={styles.actionButton} onClick={() => setShowResizeDialog(true)}>
                <Maximize2 size={14} /> {tt("mapEditorResizeMap", "Resize Map")}
              </button>
              <button
                style={{ ...styles.actionButton, ...styles.saveButton }}
                onClick={() => setShowMapInfoModal(true)}
                disabled={userType === "unknown"}
                title={
                  userType === "unknown"
                    ? tr("Please login to save maps", "Vui long dang nhap de luu ban do")
                    : tr("Save map to server", "Luu ban do len may chu")
                }
              >
                <Save size={14} /> {tt("mapEditorSaveMap", "Save Map")}
              </button>
            </div>
          </div>
        </>
      )}

      {showLeftPanel && (
        <>
          {(activeLayer === "background" ||
            activeLayer === "ground" ||
            activeLayer === "foreground") && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <Shapes size={16} /> {tt("mapEditorTileTools", "Tile Tools")}
              </h3>
              <div style={styles.buttonGroup}>
                <button
                  style={{
                    ...styles.button,
                    ...(selectedTool === "paint" ? styles.buttonActive : {}),
                  }}
                  onClick={() => onToolSelect(selectedTool === "paint" ? null : "paint")}
                  title={tr("Paint tiles", "To o gach")}
                >
                  <Brush size={14} /> {tt("mapEditorPaint", "Paint")}
                </button>
                <button
                  style={{
                    ...styles.button,
                    ...(selectedTool === "erase" ? styles.buttonActive : {}),
                  }}
                  onClick={() => onToolSelect(selectedTool === "erase" ? null : "erase")}
                  title={tr("Erase tiles", "Xoa o gach")}
                >
                  <Eraser size={14} /> {tt("mapEditorErase", "Erase")}
                </button>
                <button
                  style={{
                    ...styles.button,
                    ...(selectedTool === "fill" ? styles.buttonActive : {}),
                  }}
                  onClick={() => onToolSelect(selectedTool === "fill" ? null : "fill")}
                  title={tr("Fill area", "To day khu vuc")}
                >
                  <PaintBucket size={14} /> {tt("mapEditorFill", "Fill")}
                </button>
              </div>
            </div>
          )}

          {activeLayer === "collision" && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <Shapes size={16} /> {tt("mapEditorCollisionTools", "Collision Tools")}
              </h3>
              <p style={styles.helpText}>{tr("Draw solid tiles or erase them to make walkable spaces.", "Ve o chan duong hoac xoa de tao duong di.")}</p>
              <div style={styles.buttonGroup}>
                <button
                  style={{
                    ...styles.button,
                    ...(selectedTool === "paint" ? styles.buttonActive : {}),
                  }}
                  onClick={() => onToolSelect(selectedTool === "paint" ? null : "paint")}
                >
                  <Brush size={14} /> {tt("mapEditorPaintSolid", "Paint Solid")}
                </button>
                <button
                  style={{
                    ...styles.button,
                    ...(selectedTool === "erase" ? styles.buttonActive : {}),
                  }}
                  onClick={() => onToolSelect(selectedTool === "erase" ? null : "erase")}
                >
                  <Eraser size={14} /> {tt("mapEditorErase", "Erase")}
                </button>
                <button
                  style={{
                    ...styles.button,
                    ...(selectedTool === "fill" ? styles.buttonActive : {}),
                  }}
                  onClick={() => onToolSelect(selectedTool === "fill" ? null : "fill")}
                >
                  <PaintBucket size={14} /> {tt("mapEditorFill", "Fill")}
                </button>
              </div>
            </div>
          )}

          {(activeLayer === "background" ||
            activeLayer === "ground" ||
            activeLayer === "foreground") && (
            <div style={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ ...styles.sectionTitle, margin: 0 }}>
                  {tt("mapEditorTileSelection", "Tile Selection")}
                </h3>
                
                <select 
                  value={selectedTileGroup} 
                  onChange={(e) => setSelectedTileGroup(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    border: '1px solid #ddd'
                  }}
                >
                  <option value="all">{tt("mapEditorAllGroups", "All Groups")}</option>
                  {availableTileGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>

              <TilePalette
                selectedTile={selectedTile}
                onTileSelect={onTileSelect}
                mapData={mapData}
                currentLang={locale} 
                filterGroup={selectedTileGroup}
                onGroupsLoaded={setAvailableTileGroups}
              />
            </div>
          )}

          {activeLayer === "background" && objectSpritesLoaded && objectDefinitions && (
          <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                {tt("mapEditorObjects", "Objects")}
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))",
                  gap: "8px",
                  maxHeight: "300px",
                  overflowY: "auto",
                  padding: "4px",
                }}
              >
                {Object.entries(objectDefinitions).map(([idStr, objDef]) => {
                  const objectId = parseInt(idStr, 10);
                  
                  const data = objDef as ObjectDefinition;
                  const langKey = locale.toUpperCase() as "EN" | "VI";
                  const nameKey = `name_${langKey}` as keyof ObjectDefinition;
                  const displayName = String(data[nameKey]);

                  return (
                    <ObjectSelectionButton
                      key={idStr}
                      objectId={objectId}
                      label={displayName}
                      objectDef={data} // Truyền dữ liệu Object chuẩn
                      cache={objectCache} 
                      selectedObjectId={selectedObjectId}
                      isSelected={selectedObjectId === objectId}
                      deselectHint={tr("click again to deselect", "bam lai de bo chon")}
                      onObjectSelect={onObjectSelect}
                    />
                  );
                })}
              </div>
          </div>
          )}

          {selectedObjectId === 15 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>{tt("mapEditorPortalColor", "Portal Color")}</h3>
              <p style={styles.helpText}>{tt("mapEditorPortalColorHint", "Select a color for the portal (max 2 per color)")}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                {(["blue", "green", "orange", "purple"] as const).map((color) => {
                  const colorMap: Record<string, string> = {
                    blue: "#2196F3",
                    green: "#4CAF50",
                    orange: "#FF9800",
                    purple: "#9C27B0",
                  };
                  const count = portalColorCounts[color] || 0;
                  const canPlace = count < 2;

                  return (
                    <button
                      key={color}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px",
                        borderRadius: "6px",
                        backgroundColor:
                          selectedPortalColor === color ? colorMap[color] + "30" : "#f5f5f5",
                        border:
                          selectedPortalColor === color
                            ? `2px solid ${colorMap[color]}`
                            : "2px solid #ddd",
                        cursor: canPlace ? "pointer" : "not-allowed",
                        opacity: canPlace ? 1 : 0.5,
                        transition: "all 0.2s",
                      }}
                      onClick={() => {
                        if (canPlace) {
                          setSelectedPortalColor(color);
                          onPortalColorChange?.(color);
                        }
                      }}
                      disabled={!canPlace}
                      title={
                        canPlace
                          ? tr(`Select ${color} portal`, `Chon cong ${color}`)
                          : tr(`Cannot place more ${color} portals (already 2)`, `Khong the dat them cong ${color} (da du 2)`)
                      }
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          backgroundColor: colorMap[color],
                          borderRadius: "4px",
                        }}
                      />
                      <span style={{ fontSize: "13px", fontWeight: "500", textTransform: "capitalize" }}>
                        {color}
                      </span>
                      <span style={{ fontSize: "11px", color: "#666" }}>
                        {count}/2
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Portal Recolor Mode */}
          {selectedObjectId === 15 && mapData.objects.items?.some(
            (obj) => obj.type === "portal" && obj.x !== undefined && obj.y !== undefined
          ) && ( 
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>{tr("Recolor Portal", "Doi mau cong")}</h3>
              <p style={styles.helpText}>{tr("Click a placed portal to change its color", "Bam vao cong da dat de doi mau")}</p>
            </div>
          )}
        </>
      )}

      {/* Resize Dialog */}
      {showResizeDialog && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>{tr("Resize Map", "Doi kich thuoc ban do")}</h3>
            <p style={styles.warningText}>{tr("⚠️ This will clear all map data", "⚠️ Thao tac nay se xoa toan bo du lieu ban do")}</p>
            <p style={styles.helpText}>{tr("Map size must be between 10x10 and 30x30", "Kich thuoc ban do phai trong khoang 10x10 den 30x30")}</p>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tr("Width (tiles):", "Chieu rong (o):")}</label>
              <input
                type="number"
                min="10"
                max="30"
                value={resizeWidth}
                onChange={(e) => setResizeWidth(Number(e.target.value))}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tr("Height (tiles):", "Chieu cao (o):")}</label>
              <input
                type="number"
                min="10"
                max="30"
                value={resizeHeight}
                onChange={(e) => setResizeHeight(Number(e.target.value))}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tr("Tile Size (px):", "Kich thuoc o (px):")}</label>
              <input
                type="number"
                min="8"
                max="64"
                value={resizeTileSize}
                onChange={(e) => setResizeTileSize(Number(e.target.value))}
                style={styles.input}
              />
            </div>
            <div style={styles.modalButtons}>
              <button style={styles.confirmButton} onClick={handleResizeConfirm}>
                {tr("Confirm", "Xac nhan")}
              </button>
              <button style={styles.cancelButton} onClick={() => setShowResizeDialog(false)}>
                {tr("Cancel", "Huy")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Info Modal */}
      {showMapInfoModal && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, ...styles.marketModalContent }}>
            <h3 style={styles.modalTitle}>{tt("mapEditorMapDetailsTitle", "Map Details")}</h3>
            <p style={{ ...styles.helpText, marginTop: -8, marginBottom: 18 }}>
              {tt("mapEditorMapDetailsSubtitle", "Click a field to edit inline. Changes are previewed instantly.")}
            </p>

            <div style={styles.detailLayout}>
              <div style={styles.previewFrame}>
                {avatarPreviewUrl ? (
                  <img src={avatarPreviewUrl} alt={tt("mapEditorMapThumbnail", "Map thumbnail")} style={styles.previewImage} />
                ) : (
                  <div style={styles.previewPlaceholder} />
                )}

                <div style={styles.previewGradient} />

                <div style={styles.previewOverlayContent}>
                  <div>
                    <div style={styles.previewPlaceholderTitle}>
                      {mapData.config.name || tt("mapEditorUntitledMap", "Untitled Map")}
                    </div>
                    <div style={styles.previewPlaceholderText}>
                      {tt("mapEditorUploadThumbnailHint", "Upload a thumbnail to showcase this map.")}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    style={styles.previewOverlayButton}
                  >
                    <ImagePlus size={14} /> {tt("mapEditorChangeImage", "Change Image")}
                  </button>
                </div>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.currentTarget.files?.[0] ?? null)}
                  style={styles.fileInput}
                />
              </div>

              {avatarFile && <p style={styles.helpText}>{tt("mapEditorSelected", "Selected")}: {avatarFile.name}</p>}

              <div style={styles.detailContentGrid}>
                <div style={styles.detailPanel}>
                  <div style={styles.mapInfoCard}>
                    <div style={styles.mapInfoRow}>
                      <span>{tt("mapEditorType", "Type")}</span>
                      <strong>{mapData.config.type}</strong>
                    </div>
                    <div style={styles.mapInfoRow}>
                      <span>{tt("mapEditorSize", "Size")}</span>
                      <strong>
                        {mapData.config.width} x {mapData.config.height} {tt("mapEditorTiles", "tiles")}
                      </strong>
                    </div>
                    <div style={styles.mapInfoRow}>
                      <span>{tt("mapEditorTileSize", "Tile Size")}</span>
                      <strong>{mapData.config.tileSize}px</strong>
                    </div>
                  </div>

                  <div
                    style={{
                      ...styles.inlineField,
                      ...(activeInlineField === "levelObjective" ? styles.inlineFieldActive : {}),
                    }}
                    onMouseEnter={() => setHoveredInlineField("levelObjective")}
                    onMouseLeave={() => setHoveredInlineField(null)}
                    onClick={() => setActiveInlineField("levelObjective")}
                  >
                    <div style={styles.inlineFieldLabel}>{tt("mapEditorLevelObjective", "Level Objective")}</div>
                    {activeInlineField === "levelObjective" ? (
                      <textarea
                        autoFocus
                        rows={3}
                        value={mapData.config.levelObjective ?? ""}
                        onChange={(e) => onLevelObjectiveChange?.(e.target.value)}
                        onBlur={() => setActiveInlineField(null)}
                        style={styles.inlineTextarea}
                      />
                    ) : (
                      <div style={styles.inlineFieldValueMuted}>
                        {(mapData.config.levelObjective ?? "").trim() ||
                          tt("mapEditorLevelObjectiveHint", "Write the main objective for this level.")}
                      </div>
                    )}
                    {(hoveredInlineField === "levelObjective" ||
                      activeInlineField === "levelObjective") && (
                      <Pencil size={14} style={styles.inlineEditIcon} />
                    )}
                  </div>

                  <div
                    style={{
                      ...styles.inlineField,
                      ...(activeInlineField === "difficulty" ? styles.inlineFieldActive : {}),
                    }}
                    onMouseEnter={() => setHoveredInlineField("difficulty")}
                    onMouseLeave={() => setHoveredInlineField(null)}
                    onClick={() => setActiveInlineField("difficulty")}
                  >
                    <div style={styles.inlineFieldLabel}>{tt("mapEditorDifficulty", "Difficulty")}</div>
                    {activeInlineField === "difficulty" ? (
                      <select
                        autoFocus
                        value={mapData.config.difficulty}
                        onChange={(e) =>
                          onDifficultyChange?.(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)
                        }
                        onBlur={() => setActiveInlineField(null)}
                        style={styles.inlineInput}
                      >
                        <option value={1}>1/5</option>
                        <option value={2}>2/5</option>
                        <option value={3}>3/5</option>
                        <option value={4}>4/5</option>
                        <option value={5}>5/5</option>
                      </select>
                    ) : (
                      <div style={styles.inlineFieldValue}>{difficultyLabel}</div>
                    )}
                    {(hoveredInlineField === "difficulty" || activeInlineField === "difficulty") && (
                      <Pencil size={14} style={styles.inlineEditIcon} />
                    )}
                  </div>

                  <div
                    style={{
                      ...styles.inlineField,
                      ...(activeInlineField === "timeLimit" ? styles.inlineFieldActive : {}),
                    }}
                    onMouseEnter={() => setHoveredInlineField("timeLimit")}
                    onMouseLeave={() => setHoveredInlineField(null)}
                    onClick={() => setActiveInlineField("timeLimit")}
                  >
                    <div style={styles.inlineFieldLabel}>{tt("mapEditorTimeLimit", "Time Limit")}</div>
                    {activeInlineField === "timeLimit" ? (
                      <input
                        autoFocus
                        type="number"
                        min={30}
                        max={3600}
                        value={mapData.config.timeLimitSeconds}
                        onChange={(e) => onTimeLimitChange?.(Number(e.target.value))}
                        onBlur={() => setActiveInlineField(null)}
                        style={styles.inlineInput}
                      />
                    ) : (
                      <div style={styles.inlineFieldValue}>{mapData.config.timeLimitSeconds}s</div>
                    )}
                    {(hoveredInlineField === "timeLimit" || activeInlineField === "timeLimit") && (
                      <Pencil size={14} style={styles.inlineEditIcon} />
                    )}
                  </div>

                  <div
                    style={{
                      ...styles.inlineField,
                      ...(activeInlineField === "estimatedSteps" ? styles.inlineFieldActive : {}),
                    }}
                    onMouseEnter={() => setHoveredInlineField("estimatedSteps")}
                    onMouseLeave={() => setHoveredInlineField(null)}
                    onClick={() => setActiveInlineField("estimatedSteps")}
                  >
                    <div style={styles.inlineFieldLabel}>{tt("mapEditorEstimatedSteps", "Estimated Steps")}</div>
                    {activeInlineField === "estimatedSteps" ? (
                      <input
                        autoFocus
                        type="number"
                        min={1}
                        max={1000}
                        value={mapData.config.estimatedSteps}
                        onChange={(e) =>
                          onEstimatedStepsChange?.(Math.max(1, Number.parseInt(e.target.value) || 1))
                        }
                        onBlur={() => setActiveInlineField(null)}
                        style={styles.inlineInput}
                      />
                    ) : (
                      <div style={styles.inlineFieldValue}>{mapData.config.estimatedSteps} {tt("mapEditorSteps", "steps")}</div>
                    )}
                    {(hoveredInlineField === "estimatedSteps" ||
                      activeInlineField === "estimatedSteps") && (
                      <Pencil size={14} style={styles.inlineEditIcon} />
                    )}
                  </div>

                  <div
                    style={{
                      ...styles.inlineField,
                      ...(activeInlineField === "price" ? styles.inlineFieldActive : {}),
                    }}
                    onMouseEnter={() => setHoveredInlineField("price")}
                    onMouseLeave={() => setHoveredInlineField(null)}
                    onClick={() => setActiveInlineField("price")}
                  >
                    <div style={styles.inlineFieldLabel}>{tt("mapEditorPrice", "Price")}</div>
                    {activeInlineField === "price" ? (
                      <input
                        autoFocus
                        type="number"
                        min={0}
                        value={mapData.config.price}
                        onChange={(e) => onPriceChange?.(Number(e.target.value))}
                        onBlur={() => setActiveInlineField(null)}
                        style={styles.inlineInput}
                      />
                    ) : (
                      <div style={styles.inlineFieldValue}>
                        {mapData.config.price > 0 ? `${mapData.config.price} OC` : tt("mapEditorFree", "Free")}
                      </div>
                    )}
                    {(hoveredInlineField === "price" || activeInlineField === "price") && (
                      <Pencil size={14} style={styles.inlineEditIcon} />
                    )}
                  </div>
                </div>

              <div style={styles.detailPanel}>
                <div
                  style={{
                    ...styles.inlineField,
                    ...(activeInlineField === "name" ? styles.inlineFieldActive : {}),
                  }}
                  onMouseEnter={() => setHoveredInlineField("name")}
                  onMouseLeave={() => setHoveredInlineField(null)}
                  onClick={() => setActiveInlineField("name")}
                >
                  <div style={styles.inlineFieldLabel}>{tt("mapEditorMapName", "Map Name")}</div>
                  {activeInlineField === "name" ? (
                    <input
                      autoFocus
                      value={mapData.config.name}
                      onChange={(e) => onNameChange?.(e.target.value)}
                      onBlur={() => setActiveInlineField(null)}
                      style={styles.inlineInput}
                    />
                  ) : (
                    <div style={styles.inlineFieldValue}>
                      {mapData.config.name || tt("mapEditorUntitledMap", "Untitled Map")}
                    </div>
                  )}
                  {(hoveredInlineField === "name" || activeInlineField === "name") && (
                    <Pencil size={14} style={styles.inlineEditIcon} />
                  )}
                </div>

                <div
                  style={{
                    ...styles.inlineField,
                    ...(activeInlineField === "description" ? styles.inlineFieldActive : {}),
                  }}
                  onMouseEnter={() => setHoveredInlineField("description")}
                  onMouseLeave={() => setHoveredInlineField(null)}
                  onClick={() => setActiveInlineField("description")}
                >
                  <div style={styles.inlineFieldLabel}>{tt("mapEditorDescription", "Description")}</div>
                  {activeInlineField === "description" ? (
                    <textarea
                      autoFocus
                      rows={5}
                      value={mapData.config.description}
                      onChange={(e) => onDescriptionChange?.(e.target.value)}
                      onBlur={() => setActiveInlineField(null)}
                      style={styles.inlineTextarea}
                    />
                  ) : (
                    <div style={styles.inlineFieldValueMuted}>
                      {mapData.config.description ||
                        tt("mapEditorDescriptionHint", "Add a description to help players understand the challenge.")}
                    </div>
                  )}
                  {(hoveredInlineField === "description" ||
                    activeInlineField === "description") && (
                    <Pencil size={14} style={styles.inlineEditIcon} />
                  )}
                </div>

                <div
                  style={{
                    ...styles.inlineField,
                    ...(activeInlineField === "winCondition" ? styles.inlineFieldActive : {}),
                  }}
                  onMouseEnter={() => setHoveredInlineField("winCondition")}
                  onMouseLeave={() => setHoveredInlineField(null)}
                  onClick={() => setActiveInlineField("winCondition")}
                >
                  <div style={styles.inlineFieldLabel}>{tt("mapEditorWinCondition", "Win Condition")}</div>
                  {activeInlineField === "winCondition" ? (
                    <select
                      autoFocus
                      value={mapData.config.winCondition}
                      onChange={(e) => onWinConditionChange?.(Number(e.target.value) as 1 | 2)}
                      onBlur={() => setActiveInlineField(null)}
                      style={styles.inlineInput}
                    >
                      <option value={1}>{tt("mapEditorReachGoal", "Reach Goal")}</option>
                      <option value={2}>{tt("mapEditorCollectFruits", "Collect Fruits")}</option>
                    </select>
                  ) : (
                    <div style={styles.inlineFieldValue}>{winConditionLabel}</div>
                  )}
                  {(hoveredInlineField === "winCondition" ||
                    activeInlineField === "winCondition") && (
                    <Pencil size={14} style={styles.inlineEditIcon} />
                  )}
                </div>

                {mapData.config.winCondition === 2 && (
                  <div
                    style={{
                      ...styles.inlineField,
                      ...(activeInlineField === "requiredFruits" ? styles.inlineFieldActive : {}),
                    }}
                    onMouseEnter={() => setHoveredInlineField("requiredFruits")}
                    onMouseLeave={() => setHoveredInlineField(null)}
                    onClick={() => setActiveInlineField("requiredFruits")}
                  >
                    <div style={styles.inlineFieldLabel}>{tt("mapEditorRequiredFruits", "Required Fruits")}</div>
                    {activeInlineField === "requiredFruits" ? (
                      <input
                        autoFocus
                        type="number"
                        min={0}
                        value={mapData.config.requiredFruits ?? 0}
                        onChange={(e) =>
                          onRequiredFruitsChange?.(
                            Math.max(0, Number.parseInt(e.target.value) || 0),
                          )
                        }
                        onBlur={() => setActiveInlineField(null)}
                        style={styles.inlineInput}
                      />
                    ) : (
                      <div style={styles.inlineFieldValue}>
                        {(mapData.config.requiredFruits ?? 0) === 0
                          ? tt("mapEditorAllFruits", "All fruits")
                          : tr(`${mapData.config.requiredFruits} fruits`, `${mapData.config.requiredFruits} trai cay`)}
                      </div>
                    )}
                    {(hoveredInlineField === "requiredFruits" ||
                      activeInlineField === "requiredFruits") && (
                      <Pencil size={14} style={styles.inlineEditIcon} />
                    )}
                  </div>
                )}

                <div
                  style={{
                    ...styles.inlineField,
                    ...(activeInlineField === "tags" ? styles.inlineFieldActive : {}),
                  }}
                  onMouseEnter={() => setHoveredInlineField("tags")}
                  onMouseLeave={() => setHoveredInlineField(null)}
                  onClick={() => setActiveInlineField("tags")}
                >
                  <div style={styles.inlineFieldLabel}>{tt("mapEditorTags", "Tags")}</div>
                  {activeInlineField === "tags" ? (
                    <div>
                      {loadingMapTags ? (
                        <p style={styles.helpText}>{tt("mapEditorLoadingTags", "Loading tags...")}</p>
                      ) : (
                        <div style={styles.tagWrap}>
                          {availableMapTags.map((tag) => {
                            const selected = selectedTagIds.includes(tag.id);
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTagSelection(tag.id);
                                }}
                                style={{
                                  ...styles.tagChip,
                                  ...(selected ? styles.tagChipSelected : {}),
                                }}
                              >
                                {tag.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <button
                        type="button"
                        style={{ ...styles.cancelButton, marginTop: 10, padding: "6px 12px" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveInlineField(null);
                        }}
                      >
                        {tt("mapEditorDone", "Done")}
                      </button>
                    </div>
                  ) : (
                    <div style={styles.tagWrap}>
                      {selectedTagNames.length > 0 ? (
                        selectedTagNames.map((name) => (
                          <span key={name} style={{ ...styles.tagChip, ...styles.tagChipSelected }}>
                            {name}
                          </span>
                        ))
                      ) : (
                        <span style={styles.inlineFieldValueMuted}>{tt("mapEditorNoTagsSelected", "No tags selected")}</span>
                      )}
                    </div>
                  )}
                  {(hoveredInlineField === "tags" || activeInlineField === "tags") && (
                    <Pencil size={14} style={styles.inlineEditIcon} />
                  )}
                </div>

                <div
                  style={{
                    ...styles.inlineField,
                    ...(activeInlineField === "hints" ? styles.inlineFieldActive : {}),
                  }}
                  onMouseEnter={() => setHoveredInlineField("hints")}
                  onMouseLeave={() => setHoveredInlineField(null)}
                  onClick={() => setActiveInlineField("hints")}
                >
                  <div style={styles.inlineFieldLabel}>{tt("mapEditorHints", "Hints")}</div>
                  {activeInlineField === "hints" ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      {hints.map((hint, index) => (
                        <div
                          key={`hint-${index}`}
                          style={{ display: "flex", gap: 8, marginBottom: 8 }}
                        >
                          <input
                            type="text"
                            value={hint}
                            onChange={(e) => {
                              const next = [...hints];
                              next[index] = e.target.value;
                              setHints(next);
                            }}
                            placeholder={tr(`Hint ${index + 1}`, `Goi y ${index + 1}`)}
                            style={{ ...styles.inlineInput, flex: 1 }}
                          />
                          {hints.length > 1 && (
                            <button
                              type="button"
                              style={{ ...styles.cancelButton, padding: "6px 10px" }}
                              onClick={() => setHints(hints.filter((_, i) => i !== index))}
                            >
                              {tt("mapEditorRemove", "Remove")}
                            </button>
                          )}
                        </div>
                      ))}
                      {hints.length < 3 && (
                        <button
                          type="button"
                          style={{ ...styles.confirmButton, padding: "6px 10px", marginTop: 2 }}
                          onClick={() => setHints([...hints, ""])}
                        >
                          + {tt("mapEditorAddHint", "Add Hint")}
                        </button>
                      )}
                      <button
                        type="button"
                        style={{ ...styles.cancelButton, marginTop: 10, padding: "6px 12px" }}
                        onClick={() => setActiveInlineField(null)}
                      >
                        {tt("mapEditorDone", "Done")}
                      </button>
                    </div>
                  ) : (
                    <div style={styles.tagWrap}>
                      {hints.filter((h) => h.trim().length > 0).length > 0 ? (
                        hints
                          .filter((h) => h.trim().length > 0)
                          .map((hint, index) => (
                            <span
                              key={`hint-chip-${index}`}
                              style={{ ...styles.tagChip, borderStyle: "dashed" }}
                            >
                              {hint}
                            </span>
                          ))
                      ) : (
                        <span style={styles.inlineFieldValueMuted}>{tt("mapEditorNoHintsAdded", "No hints added")}</span>
                      )}
                    </div>
                  )}
                  {(hoveredInlineField === "hints" || activeInlineField === "hints") && (
                    <Pencil size={14} style={styles.inlineEditIcon} />
                  )}
                </div>
              </div>
            </div>
            </div>

            <div style={styles.modalButtons}>
              <button
                style={{
                  ...styles.confirmButton,
                  ...(uploading ? { opacity: 0.6, cursor: "not-allowed" } : {}),
                }}
                onClick={handleSaveMapFromModal}
                disabled={uploading}
              >
                {uploading ? tt("mapEditorSaving", "Saving...") : tt("mapEditorSaveChanges", "Save Changes")}
              </button>
              <button
                style={styles.cancelButton}
                onClick={() => {
                  setShowMapInfoModal(false);
                  setAvatarFile(null);
                  setActiveInlineField(null);
                }}
                disabled={uploading}
              >
                {tt("mapEditorCancel", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  section: {
    padding: "14px",
    borderRadius: "14px",
    background: "linear-gradient(180deg, #ffffff, #f8fafc)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    margin: "0 0 12px 0",
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    letterSpacing: "0.2px",
  },
  helpText: {
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "10px",
  },
  placeholderText: {
    fontSize: "12px",
    color: "#64748b",
    padding: "8px 10px",
    border: "1px dashed #cbd5e1",
    borderRadius: "8px",
    background: "#f8fafc",
  },
  ruleWarningText: {
    fontSize: "12px",
    color: "#b45309",
    marginBottom: "8px",
  },
  ruleSummaryPanel: {
    marginTop: "12px",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #dbe3ef",
    background: "#f8fafc",
  },
  ruleSummaryTitle: {
    margin: "0 0 6px 0",
    fontSize: "12px",
    fontWeight: 700,
    color: "#0f172a",
  },
  ruleSummaryItem: {
    margin: "0 0 4px 0",
    fontSize: "12px",
    color: "#334155",
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  button: {
    padding: "9px 12px",
    fontSize: "13px",
    fontWeight: "500",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    flex: "1 1 120px",
    minWidth: "0",
    whiteSpace: "nowrap",
  },
  buttonActive: {
    backgroundColor: "#1d4ed8",
    color: "white",
    borderColor: "#1d4ed8",
    boxShadow: "0 6px 14px rgba(29, 78, 216, 0.25)",
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  categoryRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  categoryChip: {
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#334155",
    borderRadius: "999px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  categoryChipActive: {
    border: "1px solid #93c5fd",
    background: "#dbeafe",
    color: "#1e40af",
  },
  objectToolGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(76px, 1fr))",
    gap: "8px",
    maxHeight: "280px",
    overflowY: "auto",
    padding: "4px",
  },
  objectMetadataCard: {
    border: "1px solid #dbe3ef",
    borderRadius: "10px",
    background: "#f8fafc",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "10px",
  },
  objectMetadataTitle: {
    margin: 0,
    fontSize: "12px",
    fontWeight: 700,
    color: "#1e293b",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color: "#334155",
  },
  infoText: {
    margin: 0,
    fontSize: "14px",
    color: "#555",
  },
  actionButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  actionButton: {
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: "500",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    backgroundColor: "white",
    color: "#1e293b",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  saveButton: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "1px solid #2563eb",
    boxShadow: "0 8px 16px rgba(37, 99, 235, 0.22)",
  },
  importLabel: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    border: "2px solid #0066ff",
    borderRadius: "6px",
    backgroundColor: "white",
    color: "#0066ff",
    cursor: "pointer",
    display: "inline-block",
  },
  fileInput: {
    display: "none",
  },
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "white",
    padding: "30px",
    borderRadius: "14px",
    boxShadow: "0 18px 38px rgba(0,0,0,0.25)",
    minWidth: "400px",
  },
  marketModalContent: {
    width: "min(980px, 92vw)",
    maxHeight: "88vh",
    overflowY: "auto",
    border: "1px solid #dbe3ef",
    background:
      "radial-gradient(circle at top right, rgba(37, 99, 235, 0.12), transparent 35%), linear-gradient(180deg, #ffffff, #f8fafc)",
  },
  detailLayout: {
    display: "grid",
    gap: "16px",
  },
  detailContentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "18px",
    alignItems: "start",
  },
  previewFrame: {
    position: "relative",
    borderRadius: "14px",
    overflow: "hidden",
    border: "1px solid #cbd5e1",
    width: "100%",
    aspectRatio: "16 / 9",
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  previewPlaceholder: {
    width: "100%",
    height: "100%",
    background:
      "radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.4), transparent 35%), linear-gradient(140deg, #0f172a, #1e293b)",
  },
  previewGradient: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, rgba(15,23,42,0.12) 20%, rgba(15,23,42,0.72) 100%)",
    pointerEvents: "none",
    zIndex: 1,
  },
  previewOverlayContent: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "12px",
    padding: "18px",
    zIndex: 2,
  },
  previewPlaceholderTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#f8fafc",
  },
  previewPlaceholderText: {
    fontSize: "12px",
    opacity: 0.92,
    color: "#e2e8f0",
    marginTop: "4px",
  },
  previewOverlayButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    border: "1px solid rgba(255,255,255,0.4)",
    borderRadius: "999px",
    background: "rgba(15, 23, 42, 0.68)",
    color: "#fff",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
    transition: "transform 0.2s ease, background 0.2s ease",
  },
  mapInfoCard: {
    border: "1px solid #dbe3ef",
    borderRadius: "12px",
    background: "#f8fafc",
    padding: "10px 12px",
    display: "grid",
    gap: "8px",
  },
  mapInfoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "13px",
    color: "#334155",
  },
  detailPanel: {
    display: "grid",
    gap: "12px",
  },
  inlineField: {
    position: "relative",
    border: "1px solid #dbe3ef",
    borderRadius: "12px",
    background: "#ffffff",
    padding: "12px",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
    cursor: "pointer",
  },
  inlineFieldActive: {
    border: "1px solid #93c5fd",
    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.15)",
    transform: "translateY(-1px)",
  },
  inlineFieldLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "6px",
  },
  inlineFieldValue: {
    fontSize: "17px",
    fontWeight: 700,
    color: "#0f172a",
    lineHeight: 1.3,
  },
  inlineFieldValueMuted: {
    fontSize: "14px",
    color: "#475569",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },
  inlineInput: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "15px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    color: "#0f172a",
    boxSizing: "border-box",
    outline: "none",
  },
  inlineTextarea: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    color: "#0f172a",
    boxSizing: "border-box",
    resize: "vertical",
    lineHeight: 1.5,
    outline: "none",
  },
  inlineEditIcon: {
    position: "absolute",
    top: "10px",
    right: "10px",
    color: "#3b82f6",
    opacity: 0.8,
  },
  tagWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  tagChip: {
    padding: "6px 10px",
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  tagChipSelected: {
    border: "1px solid #2563eb",
    background: "#dbeafe",
    color: "#1e40af",
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "600",
    margin: "0 0 20px 0",
    color: "#333",
  },
  warningText: {
    color: "#ff6b00",
    fontSize: "14px",
    marginBottom: "20px",
  },
  formGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "500",
    marginBottom: "6px",
    color: "#555",
  },
  input: {
    width: "100%",
    padding: "8px 12px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    boxSizing: "border-box",
    color: "black",
  },
  select: {
    width: "100%",
    padding: "8px 12px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    boxSizing: "border-box",
    color: "black",
  },
  modalButtons: {
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
    marginTop: "20px",
  },
  confirmButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#0066ff",
    color: "white",
    cursor: "pointer",
  },
  cancelButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    border: "2px solid #ddd",
    borderRadius: "6px",
    backgroundColor: "white",
    color: "#555",
    cursor: "pointer",
  },
};
