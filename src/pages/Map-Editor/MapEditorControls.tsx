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
  Lock,
  LayoutGrid,
  Package,
  X,
} from "lucide-react";
import type { MapData } from "../../shared/types/MapSchema";
import type { GameType } from "../../shared/types/GameType";
import { useLanguageStore } from "@/stores/language.store";
import { getT } from "@/lib/i18n/translations";
import { TilePalette } from "./TilePalette";
import {
  ObjectSpriteLoader,
  ObjectSpriteCache,
  type ObjectDefinition,
  type TieredObjectsGroup,
} from "../../modules/engine/assets";
import snakeObjectsRaw from "../../shared/assets/platformer/snake/object/objects.json";
import blocksConfig from "../../shared/block/blocks-config.json";
import { cmsMapsApi } from "../../services/api/cms/maps.api";
import { learnerMapsApi } from "../../services/api/learner/maps.api";
import { useLearnerAuthStore } from "../../stores/auth/learnerAuth.store";
import { useCmsAuthStore } from "../../stores/auth/cmsAuth.store";
import {
  buildMapUploadFile,
  validateLevelsForUpload,
  type MapUploadLevelInput,
} from "../../tools/map-editor/utils/buildMapUploadJson";
import {
  getSupportedUnlockCharacters,
  sanitizeUnlockCode,
} from "../../tools/map-editor/utils/unlockCode";
import type { EditorStore } from "../../tools/map-editor/store/editorStore";
import { LayerPanel } from "../../tools/map-editor/components/LayerPanel";
import { MapCatalogDraftPreviewOverlay } from "./MapCatalogDraftPreviewOverlay";
import { ROUTES } from "../../lib/constants/routes";
import type { RequiredBlockRule } from "../../shared/types/MapSchema";
import type { AssetTier, SubscriptionPlan } from "@/lib/auth/subscriptionPlan";

function parseDuplicateNewMapId(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === "string" && data.trim().length > 0) return data.trim();
  if (typeof data === "object" && data !== null && "id" in data) {
    const id = (data as { id: unknown }).id;
    if (typeof id === "string" && id.trim().length > 0) return id.trim();
  }
  return null;
}

const LOCKED_TOOLTIP = "Upgrade to Creator to use this asset";

const GALLERY_BATCH_MAX = 20;

type MapTag = {
  id: string;
  name: string;
};

/**
 * Convert MapData config type to GameType
 */
function mapTypeToGameType(mapType: "platform" | "topdown" | "snake"): GameType {
  return mapType === "topdown" ? "topdown" : "platformer";
}

type SnakeObjectsConfig = {
  objects?: Record<string, ObjectDefinition>;
};

interface MapEditorControlsProps {
  mapData: MapData;
  userPlan: SubscriptionPlan;
  activeLayer: "background" | "ground" | "foreground" | "collision";
  selectedTile: number | null;
  selectedObjectId: number | null; // Changed from string enum to numeric ID
  selectedTool: "paint" | "erase" | "fill" | "player" | "goal" | null;
  canUndo: boolean;
  canRedo: boolean;
  onTileSelect: (tileId: number | null) => void;
  onObjectSelect: (objectId: number | null) => void; // Changed to numeric ID
  onPortalColorChange?: (color: "blue" | "green" | "orange" | "purple") => void;
  onToolSelect: (tool: "paint" | "erase" | "fill" | "player" | "goal" | null) => void;
  onResize: (width: number, height: number, tileSize: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onTypeChange?: (type: "platform" | "topdown" | "snake") => void;
  onNameChange?: (name: string) => void;
  onDescriptionChange?: (description: string) => void;
  onDifficultyChange?: (difficulty: 1 | 2 | 3 | 4 | 5) => void;
  onTimeLimitChange?: (seconds: number) => void;
  onTimeStarThresholdChange?: (percent: number) => void;
  onEstimatedStepsChange?: (steps: number) => void;
  onWinConditionChange?: (winCondition: 1 | 2) => void;
  onLevelObjectiveChange?: (objective: string) => void;
  onRequiredFruitsChange?: (requiredFruits: number) => void;
  onPriceChange?: (price: number) => void;
  freeTrialAttemptLimit?: number;
  onFreeTrialAttemptLimitChange?: (value: number) => void;
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
  /** Multi-level: catalog title for API (map Title); optional single-level uses map name */
  mapCatalogTitle?: string;
  onMapCatalogTitleChange?: (title: string) => void;
  levelHints?: string[];
  onLevelHintsChange?: (hints: string[]) => void;
  buildUploadLevels?: () => MapUploadLevelInput[];
  getMapFormMeta?: () => {
    title: string;
    description: string;
    difficulty: number;
    price: number;
    freeTrialAttemptLimit?: number;
  };
  /** Number of MapDetail levels in the editor; used to clarify map-wide vs per-level UI (e.g. one thumbnail for whole map). */
  levelSlotCount?: number;
  /** For right panel Canvas tab: layer visibility + active layer (same as standalone Layer panel). */
  editorStore?: EditorStore;
  /** Wire header "Save" to the same flow as Level tab save (right panel only). */
  registerSaveLevelContent?: (save: () => Promise<void>) => void;
  onSavingLevelContentChange?: (busy: boolean) => void;
  /** Từ GET map detail — hiển thị phiên bản nội dung trong overlay catalog */
  loadedMapContentVersion?: number | null;
}

interface ObjectSelectionButtonProps {
  objectId: number;
  label: string;
  objectDef: ObjectDefinition;
  tier: AssetTier;
  locked: boolean;
  cache: ObjectSpriteCache;
  selectedObjectId: number | null;
  deselectHint: string;
  onObjectSelect: (id: number | null) => void;
}

function ObjectSelectionButton({
  objectId,
  label,
  objectDef,
  tier,
  locked,
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
      disabled={locked}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        padding: "12px",
        fontSize: "13px",
        fontWeight: "500",
        border: selectedObjectId === objectId ? "2px solid #4CAF50" : "2px solid var(--border)",
        borderRadius: "6px",
        backgroundColor:
          selectedObjectId === objectId
            ? "color-mix(in srgb, var(--success) 18%, var(--surface))"
            : "var(--surface)",
        cursor: locked ? "not-allowed" : "pointer",
        opacity: locked ? 0.56 : 1,
        filter: locked ? "grayscale(0.85)" : "none",
        transition: "all 0.2s",
        minWidth: "80px",
        boxShadow: selectedObjectId === objectId ? "0 2px 6px rgba(76,175,80,0.3)" : "none",
      }}
      onClick={() => {
        if (locked) return;
        onObjectSelect(selectedObjectId === objectId ? null : objectId);
      }}
      title={locked ? LOCKED_TOOLTIP : `${label} (${deselectHint})`}
    >
      <span
        style={{
          position: "absolute",
          left: "6px",
          top: "6px",
          padding: "2px 6px",
          fontSize: "10px",
          fontWeight: 700,
          borderRadius: "999px",
          background: "color-mix(in srgb, var(--surface-2) 70%, transparent)",
          color: "var(--text-2)",
          textTransform: "uppercase",
          letterSpacing: "0.03em",
        }}
      >
        {tier}
      </span>
      {locked && (
        <span
          style={{
            position: "absolute",
            right: "6px",
            top: "6px",
            width: "18px",
            height: "18px",
            borderRadius: "999px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15, 23, 42, 0.72)",
            color: "var(--surface)",
          }}
          aria-hidden
        >
          <Lock size={12} />
        </span>
      )}
      <div
        style={{
          width: "48px",
          height: "48px",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          overflow: "hidden",
          backgroundColor: "var(--surface-2)",
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
      <span style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-2)" }}>{label}</span>
    </button>
  );
}

export function MapEditorControls({
  mapData,
  userPlan,
  activeLayer,
  selectedTile,
  selectedObjectId,
  selectedTool,
  canUndo,
  canRedo,
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
  onTimeStarThresholdChange,
  onEstimatedStepsChange,
  onWinConditionChange,
  onLevelObjectiveChange,
  onRequiredFruitsChange,
  onPriceChange,
  freeTrialAttemptLimit,
  onFreeTrialAttemptLimitChange,
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
  mapCatalogTitle,
  onMapCatalogTitleChange,
  levelHints,
  onLevelHintsChange,
  buildUploadLevels,
  getMapFormMeta,
  levelSlotCount = 1,
  editorStore,
  registerSaveLevelContent,
  onSavingLevelContentChange,
  loadedMapContentVersion = null,
}: MapEditorControlsProps) {
  const navigate = useNavigate();
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [showMapInfoModal, setShowMapInfoModal] = useState(false);
  const [showCatalogDraftPreview, setShowCatalogDraftPreview] = useState(false);
  const [catalogSaveMode, setCatalogSaveMode] = useState<"overwrite" | "newListing">("overwrite");
  const [resizeWidth, setResizeWidth] = useState(mapData.config.width);
  const [resizeHeight, setResizeHeight] = useState(mapData.config.height);
  const [resizeTileSize, setResizeTileSize] = useState(mapData.config.tileSize);
  const [hints, setHints] = useState<string[]>(initialHints.length > 0 ? initialHints : [""]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(initialAvatarUrl);
  const [resolvedAvatarPreviewUrl, setResolvedAvatarPreviewUrl] = useState<string | null>(
    initialAvatarUrl,
  );
  const { locale } = useLanguageStore();
  const t = useMemo(() => getT(locale), [locale]);
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
    | "timeStarThreshold"
    | "estimatedSteps"
    | "winCondition"
    | "levelObjective"
    | "requiredFruits"
    | "price"
    | "tags"
    | "learnedTagsCsv"
    | "hints"
    | null
  >(null);
  const [hoveredInlineField, setHoveredInlineField] = useState<
    | "name"
    | "description"
    | "difficulty"
    | "timeLimit"
    | "timeStarThreshold"
    | "estimatedSteps"
    | "winCondition"
    | "levelObjective"
    | "requiredFruits"
    | "price"
    | "tags"
    | "learnedTagsCsv"
    | "hints"
    | null
  >(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [availableMapTags, setAvailableMapTags] = useState<MapTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedLearnedTagIds, setSelectedLearnedTagIds] = useState<string[]>([]);
  const [loadingMapTags, setLoadingMapTags] = useState(false);
  const [savingMapMeta, setSavingMapMeta] = useState(false);
  const [savingLevelContent, setSavingLevelContent] = useState(false);
  const [pendingGalleryFiles, setPendingGalleryFiles] = useState<File[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  type RightPanelTabId = "canvas" | "level" | "rules" | "objects" | "map";
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTabId>("canvas");
  /** Same tab again = collapse panel; other tab = switch and expand. */
  const [rightPanelTabExpanded, setRightPanelTabExpanded] = useState(true);
  const handleRightPanelTabClick = (tab: RightPanelTabId) => {
    if (rightPanelTab === tab) {
      setRightPanelTabExpanded((v) => !v);
    } else {
      setRightPanelTab(tab);
      setRightPanelTabExpanded(true);
    }
  };
  const [selectedPortalColor, setSelectedPortalColor] = useState<
    "blue" | "green" | "orange" | "purple"
  >("blue");
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
  const [objectDefinitionGroups, setObjectDefinitionGroups] = useState<TieredObjectsGroup[]>([]);
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
      setObjectDefinitionGroups([]);
      return;
    }

    let cancelled = false;

    // Reset immediately so UI shows loading state during transition
    setObjectSpritesLoaded(false);
    setObjectDefinitions(null);
    setObjectDefinitionGroups([]);

    async function loadObjects() {
      try {
        const tieredDefs: TieredObjectsGroup[] =
          mapData.config.type === "snake"
            ? [
                {
                  tier: "basic",
                  locked: false,
                  objects: (snakeObjectsRaw as SnakeObjectsConfig).objects ?? {},
                },
              ]
            : await new ObjectSpriteLoader(gameType).loadTieredObjectDefinitions("objects", userPlan);
        const mergedDefs = tieredDefs.reduce<Record<string, ObjectDefinition>>((acc, group) => {
          return { ...acc, ...group.objects };
        }, {});

        // Preload all sprite images BEFORE setting definitions
        const imagePathsSet = new Set<string>();
        for (const objDef of Object.values(mergedDefs)) {
          imagePathsSet.add(objDef.imagePath);
        }

        await Promise.all(Array.from(imagePathsSet).map((path) => objectCache.loadSprite(path)));

        // Only set definitions after all images are loaded
        if (cancelled) return;
        setObjectDefinitions(mergedDefs);
        setObjectDefinitionGroups(tieredDefs);
        setObjectSpritesLoaded(true);
        if (onObjectDefinitionsLoaded) {
          onObjectDefinitionsLoaded(mergedDefs);
        }
      } catch (err) {
        console.error("Failed to load object definitions:", err);
        if (!cancelled) {
          setObjectSpritesLoaded(true); // Still set true to avoid infinite loading
          setObjectDefinitions(null);
          setObjectDefinitionGroups([]);
        }
      }
    }

    loadObjects();

    return () => {
      cancelled = true;
    };
  }, [gameType, mapData.config.type, objectCache, onObjectDefinitionsLoaded, showLeftPanel, userPlan]);

  useEffect(() => {
    // Only the left panel loads selectable object definitions.
    // The right panel keeps this list empty, so it must not auto-clear selections.
    if (!showLeftPanel || selectedObjectId === null || !objectSpritesLoaded) {
      return;
    }

    const selectedVariants = objectDefinitionGroups.flatMap((group) => {
      const def = group.objects[selectedObjectId.toString()];
      if (!def) {
        return [];
      }
      return [{ locked: group.locked }];
    });

    if (selectedVariants.length === 0) {
      onObjectSelect(null);
      return;
    }

    const hasUnlockedVariant = selectedVariants.some((variant) => !variant.locked);
    if (!hasUnlockedVariant) {
      onObjectSelect(null);
    }
  }, [
    selectedObjectId,
    objectDefinitionGroups,
    onObjectSelect,
    showLeftPanel,
    objectSpritesLoaded,
  ]);

  useEffect(() => {
    const shouldLoadTags = (showRightPanel || showCatalogDraftPreview) && userType !== "unknown";

    if (!shouldLoadTags) {
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

    void loadMapTags();

    return () => {
      cancelled = true;
    };
  }, [showRightPanel, showCatalogDraftPreview, isLearner, userType]);

  useEffect(() => {
    if (!showCatalogDraftPreview) return;
    setCatalogSaveMode("overwrite");
  }, [showCatalogDraftPreview]);

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

  const toggleLearnedTagSelection = (tagId: string) => {
    setSelectedLearnedTagIds((prev) =>
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
    if (onLevelHintsChange && levelHints !== undefined) {
      return;
    }

    setHints(initialHints.length > 0 ? initialHints : [""]);
  }, [showMapInfoModal, initialHints, onLevelHintsChange, levelHints]);

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

  useEffect(() => {
    const raw = avatarPreviewUrl?.trim() ?? "";
    if (!raw) {
      setResolvedAvatarPreviewUrl(null);
      return;
    }

    if (raw.startsWith("blob:") || raw.startsWith("data:") || !/^https?:\/\//i.test(raw)) {
      setResolvedAvatarPreviewUrl(raw);
      return;
    }

    let cancelled = false;
    let blobUrl: string | null = null;

    setResolvedAvatarPreviewUrl(raw);

    const loadRemotePreview = async () => {
      try {
        const response = await fetch(raw, {
          mode: "cors",
          credentials: "omit",
          cache: "force-cache",
        });
        const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
        if (!response.ok || !contentType.startsWith("image/")) {
          throw new Error("Remote preview is not an image");
        }

        const imageBlob = await response.blob();
        blobUrl = URL.createObjectURL(imageBlob);
        if (!cancelled) {
          setResolvedAvatarPreviewUrl(blobUrl);
        }
      } catch {
        if (!cancelled) {
          // Fall back to original URL when fetch/blob conversion fails (e.g. CORS).
          setResolvedAvatarPreviewUrl(raw);
        }
      }
    };

    void loadRemotePreview();

    return () => {
      cancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [avatarPreviewUrl]);

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

  const hiddenLearnedKnowledgeTagNames = new Set(["beginner", "expert", "easy", "medium", "hard"]);

  const learnedKnowledgeTags = availableMapTags.filter(
    (tag) => !hiddenLearnedKnowledgeTagNames.has(tag.name.trim().toLowerCase()),
  );

  const selectedLearnedTagNames = learnedKnowledgeTags
    .filter((tag) => selectedLearnedTagIds.includes(tag.id))
    .map((tag) => tag.name);

  const difficultyLabel = `${mapData.config.difficulty}/5`;
  const timeStarThresholdPercent = Math.max(
    1,
    Math.min(100, Math.floor(mapData.config.timeStarThresholdPercent ?? 100)),
  );

  const handleResizeConfirm = () => {
    // Validate map size (10-30)
    const validWidth = Math.max(10, Math.min(30, resizeWidth));
    const validHeight = Math.max(10, Math.min(30, resizeHeight));

    if (validWidth !== resizeWidth || validHeight !== resizeHeight) {
      alert(
        tt(
          "mapEditorMapSizeAdjusting",
          "Map size must be between 10x10 and 30x30. Adjusting to {w}x{h}.",
        )
          .replace("{w}", String(validWidth))
          .replace("{h}", String(validHeight)),
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
      (rule) => normalizedAllowedBlocks.length === 0 || normalizedAllowedBlocks.includes(rule.type),
    );
    onRequiredBlocksChange(deduped);
  };

  const addRequiredBlock = () => {
    if (!onRequiredBlocksChange) return;

    const usedTypes = new Set(normalizedRequiredBlocks.map((rule) => rule.type));
    const candidate = blocksAvailableForGameplay.find((block) => !usedTypes.has(block.type));
    if (!candidate) return;

    onRequiredBlocksChange([...normalizedRequiredBlocks, { type: candidate.type, minCount: 1 }]);
  };

  const removeRequiredBlock = (index: number) => {
    if (!onRequiredBlocksChange) return;
    onRequiredBlocksChange(normalizedRequiredBlocks.filter((_, i) => i !== index));
  };

  const validateBlockRulesForMapData = (md: MapData): string[] => {
    const errors: string[] = [];
    const normAllowed = Array.from(new Set(md.blockConstraints.allowedBlocks ?? [])).filter(
      (type) => availableBlocks.some((block) => block.type === type),
    );
    const blocksForGameplay =
      normAllowed.length === 0
        ? availableBlocks
        : availableBlocks.filter((block) => normAllowed.includes(block.type));
    const normRequired = Array.from(
      new Map(
        md.blockConstraints.requiredBlocks
          .filter((rule) => blocksForGameplay.some((block) => block.type === rule.type))
          .map((rule) => [rule.type, { type: rule.type, minCount: Math.max(1, rule.minCount) }]),
      ).values(),
    );
    const allowedSet = new Set(normAllowed);
    const requiredTypes = normRequired.map((rule) => rule.type);
    const requiredSet = new Set(requiredTypes);

    if (allowedSet.size !== normAllowed.length) {
      errors.push(
        tt("mapEditorRuleDuplicateAllowed", "Allowed blocks contains duplicate block types."),
      );
    }

    if (requiredSet.size !== requiredTypes.length) {
      errors.push(
        tt("mapEditorRuleDuplicateRequired", "Required blocks contains duplicate block types."),
      );
    }

    if (normAllowed.length > 0) {
      const invalidRequired = normRequired.filter((rule) => !allowedSet.has(rule.type));
      if (invalidRequired.length > 0) {
        errors.push(
          tt(
            "mapEditorRuleRequiredFromAllowed",
            "Required blocks must be selected from Allowed Blocks.",
          ),
        );
      }
    }

    const blockLimit = md.blockConstraints.blockLimit;
    if (
      blockLimit !== null &&
      (typeof blockLimit !== "number" || !Number.isFinite(blockLimit) || blockLimit < 1)
    ) {
      errors.push(
        tt(
          "mapEditorRuleBlockLimitInvalid",
          "Block limit must be at least 1 or empty for unlimited.",
        ),
      );
    }

    return errors;
  };

  const toBlockLabel = (type: string) => blockTypeToLabel.get(type) ?? type;
  const allowedSummary =
    normalizedAllowedBlocks.length === 0
      ? tt("mapEditorAllBlocksAllowedSummary", "All blocks allowed")
      : normalizedAllowedBlocks.map((type) => toBlockLabel(type)).join(", ");
  const requiredSummary =
    normalizedRequiredBlocks.length === 0
      ? tt("mapEditorNoRequiredBlocksSummary", "No required blocks")
      : normalizedRequiredBlocks
          .map((rule) =>
            tt("mapEditorRequiredBlockUse", 'Use "{name}" at least {count} time(s)')
              .replace("{name}", toBlockLabel(rule.type))
              .replace("{count}", String(rule.minCount)),
          )
          .join("; ");
  const limitSummary =
    mapData.blockConstraints.blockLimit === null
      ? tt("mapEditorUnlimitedShort", "Unlimited")
      : tt("mapEditorBlocksCount", "{n} blocks").replace(
          "{n}",
          String(mapData.blockConstraints.blockLimit),
        );
  const hasAllowedRequiredConflict =
    normalizedAllowedBlocks.length > 0 &&
    normalizedRequiredBlocks.some((rule) => !normalizedAllowedBlocks.includes(rule.type));

  const displayHints =
    onLevelHintsChange && levelHints !== undefined
      ? levelHints.length > 0
        ? levelHints
        : [""]
      : hints;

  const setDisplayHints = (next: string[]) => {
    if (onLevelHintsChange) {
      onLevelHintsChange(next);
    } else {
      setHints(next);
    }
  };

  /** Map catalog title (API Map.Title). Per-level names live in the canvas editor only — MapDetail has no separate thumbnail. */
  const previewMapTitle =
    levelSlotCount > 1
      ? mapCatalogTitle?.trim() || tt("mapEditorUntitledMap", "Untitled Map")
      : mapCatalogTitle !== undefined && mapCatalogTitle.trim().length > 0
        ? mapCatalogTitle
        : mapData.config.name || tt("mapEditorUntitledMap", "Untitled Map");

  const thumbnailHintBelowImage =
    levelSlotCount > 1
      ? tt(
          "mapEditorThumbnailMarketplaceHint",
          "One thumbnail for the whole map (marketplace). Levels (MapDetail) do not have their own images.",
        )
      : tt("mapEditorUploadThumbnailHint", "Upload a thumbnail to showcase this map.");

  /** Chỉ Title, Description, Difficulty, Price, tags — PUT /api/learner/maps/{id}. CMS: gửi kèm file JSON (BE không có PUT metadata riêng). */
  const handleSaveMapMetadataFromModal = async () => {
    const meta = getMapFormMeta?.();
    const titleForApi =
      meta?.title?.trim() ?? mapCatalogTitle?.trim() ?? mapData.config.name?.trim();
    if (!titleForApi) {
      alert(tt("mapEditorPleaseSetMapName", "Please set a map name before saving"));
      return;
    }

    if (!editingMapId) {
      alert(
        tt(
          "mapEditorCreateMapFirstInstruction",
          'Create the map on the server first using "Save level content (MapDetail)" — then you can open map detail to save listing fields.',
        ),
      );
      return;
    }

    if (userType === "unknown") {
      alert(
        tt(
          "mapEditorLoginToSaveMaps",
          "You must be logged in as a learner or CMS user to save maps",
        ),
      );
      return;
    }

    if (
      !confirm(
        tt(
          "mapEditorConfirmSaveMapInfo",
          "Save map info (title, description, difficulty, price, tags)?",
        ),
      )
    )
      return;

    try {
      setSavingMapMeta(true);

      const formMeta = getMapFormMeta?.() ?? {
        title: mapData.config.name,
        description: mapData.config.description || "",
        difficulty: mapData.config.difficulty,
        price: mapData.config.price,
      };

      if (isLearner) {
        const res = await learnerMapsApi.updateMapMetadata(editingMapId, {
          title: formMeta.title,
          description: formMeta.description || "",
          difficulty: formMeta.difficulty,
          price: formMeta.price,
          ...(typeof formMeta.freeTrialAttemptLimit === "number"
            ? { freeTrialAttemptLimit: Math.max(0, Number(formMeta.freeTrialAttemptLimit)) }
            : {}),
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
          learnedTags: selectedLearnedTagIds.length > 0 ? selectedLearnedTagIds : undefined,
        });
        if (!res.data.isSuccess) {
          alert(
            tt("mapEditorSaveFailed", "Save failed: {message}").replace(
              "{message}",
              res.data.message || tt("mapEditorUnknownError", "Unknown error"),
            ),
          );
          return;
        }
        if (avatarFile) {
          const avatarResponse = await learnerMapsApi.uploadMapAvatar(editingMapId, avatarFile);
          if (!avatarResponse.data.isSuccess) {
            alert(
              tt(
                "mapEditorMapInfoSavedAvatarFailed",
                "Map info saved but avatar upload failed: {message}",
              ).replace(
                "{message}",
                avatarResponse.data.message || tt("mapEditorUnknownError", "Unknown error"),
              ),
            );
            return;
          }
        }
        if (pendingGalleryFiles.length > 0) {
          const galleryRes = await learnerMapsApi.uploadMapGallery(
            editingMapId,
            pendingGalleryFiles,
          );
          if (!galleryRes.data.isSuccess) {
            alert(
              tt("mapEditorGalleryUploadFailed", "Gallery upload failed: {message}").replace(
                "{message}",
                galleryRes.data.message || tt("mapEditorUnknownError", "Unknown error"),
              ),
            );
            return;
          }
        }
        alert(tt("mapEditorMapInfoSavedShort", "Map info saved."));
        setShowMapInfoModal(false);
        setAvatarFile(null);
        setPendingGalleryFiles([]);
        return;
      }

      const levelsPayload: MapUploadLevelInput[] = buildUploadLevels
        ? buildUploadLevels()
        : [
            {
              levelOrder: 0,
              mapData,
              hints: displayHints,
            },
          ];
      const file = buildMapUploadFile(levelsPayload, formMeta.title || "map");
      const payload = {
        Title: formMeta.title,
        Description: formMeta.description || "Map created with Map Editor",
        Difficulty: formMeta.difficulty,
        Price: formMeta.price,
        TagIdsCsv: selectedTagIds.length > 0 ? selectedTagIds.join(",") : undefined,
        LearnedTagsCsv:
          selectedLearnedTagIds.length > 0 ? selectedLearnedTagIds.join(",") : undefined,
        MapDetailFile: file,
        AvatarFile: avatarFile ?? undefined,
      };
      const response = await cmsMapsApi.updateMapFromJson(editingMapId, payload);
      if (response.data.isSuccess) {
        if (pendingGalleryFiles.length > 0) {
          const galleryRes = await cmsMapsApi.uploadMapGallery(editingMapId, pendingGalleryFiles);
          if (!galleryRes.data.isSuccess) {
            alert(
              tt("mapEditorGalleryUploadFailed", "Gallery upload failed: {message}").replace(
                "{message}",
                galleryRes.data.message || tt("mapEditorUnknownError", "Unknown error"),
              ),
            );
            return;
          }
        }
        alert(
          tt(
            "mapEditorMapSavedCmsWithJson",
            "Map info saved (CMS also refreshed level JSON from the editor).",
          ),
        );
        setShowMapInfoModal(false);
        setAvatarFile(null);
        setPendingGalleryFiles([]);
      } else {
        alert(
          tt("mapEditorSaveFailed", "Save failed: {message}").replace(
            "{message}",
            response.data.message || tt("mapEditorUnknownError", "Unknown error"),
          ),
        );
      }
    } catch (error) {
      console.error("Save map metadata error:", error);
      alert(
        tt("mapEditorFailedToSave", "Failed to save: {message}").replace(
          "{message}",
          error instanceof Error ? error.message : tt("mapEditorUnknownError", "Unknown error"),
        ),
      );
    } finally {
      setSavingMapMeta(false);
    }
  };

  /** Lưu nội dung MapDetail (levels + JSON) — POST/PUT upload-json; learner catalog có thể duplicate-as-new rồi PUT */
  const handleSaveLevelContent = async (opts?: {
    skipConfirm?: boolean;
    catalogSaveMode?: "overwrite" | "newListing";
    redirectAfterSave?: boolean;
  }) => {
    const meta = getMapFormMeta?.();
    const titleForApi =
      meta?.title?.trim() ?? mapCatalogTitle?.trim() ?? mapData.config.name?.trim();
    if (!titleForApi) {
      alert(tt("mapEditorPleaseSetMapName", "Please set a map name before saving"));
      return;
    }

    const hintSnapshot = displayHints;

    const levelsPayload: MapUploadLevelInput[] = buildUploadLevels
      ? buildUploadLevels()
      : [
          {
            levelOrder: 0,
            mapData,
            hints: hintSnapshot,
          },
        ];

    for (const lv of levelsPayload) {
      const ruleErrors = validateBlockRulesForMapData(lv.mapData);
      if (ruleErrors.length > 0) {
        alert(
          tt(
            "mapEditorLevelFixBlockRules",
            "Level {level}: fix block rules before saving:\n- {errors}",
          )
            .replace("{level}", String(lv.levelOrder + 1))
            .replace("{errors}", ruleErrors.join("\n- ")),
        );
        return;
      }
    }

    const levelIssues = validateLevelsForUpload(levelsPayload);
    if (levelIssues.length > 0) {
      const msg = levelIssues
        .map((issue) => `Level ${issue.levelOrder + 1}: ${issue.messages.join("; ")}`)
        .join("\n");
      alert(tt("mapEditorCannotSave", "Cannot save:\n{msg}").replace("{msg}", msg));
      return;
    }

    if (userType === "unknown") {
      alert(
        tt(
          "mapEditorLoginToSaveMaps",
          "You must be logged in as a learner or CMS user to save maps",
        ),
      );
      return;
    }

    if (
      !opts?.skipConfirm &&
      !confirm(tt("mapEditorSaveMapLevelToServer", "Save level content (MapDetail) to the server?"))
    )
      return;

    const isEditingExistingMap = Boolean(editingMapId && editorMode === "edit");
    if (
      isLearner &&
      opts?.catalogSaveMode === "newListing" &&
      isEditingExistingMap &&
      editingMapId
    ) {
      if (
        !confirm(
          tt(
            "mapEditorCatalogConfirmSaveAsNewListing",
            "Create a new map listing and keep the original unchanged? Your current level JSON will be saved to the new map (draft).",
          ),
        )
      )
        return;
    }

    const galleryBatch = [...pendingGalleryFiles];

    try {
      setSavingLevelContent(true);

      const formMeta = getMapFormMeta?.() ?? {
        title: mapData.config.name,
        description: mapData.config.description || "Map created with Map Editor",
        difficulty: mapData.config.difficulty,
        price: mapData.config.price,
      };

      const file = buildMapUploadFile(levelsPayload, formMeta.title || "map");

      const mapsApi = isLearner ? learnerMapsApi : cmsMapsApi;

      const payload = {
        Title: formMeta.title,
        Description: formMeta.description || "Map created with Map Editor",
        Difficulty: formMeta.difficulty,
        Price: formMeta.price,
        ...(typeof formMeta.freeTrialAttemptLimit === "number"
          ? { FreeTrialAttemptLimit: Math.max(0, Number(formMeta.freeTrialAttemptLimit)) }
          : {}),
        TagIdsCsv: selectedTagIds.length > 0 ? selectedTagIds.join(",") : undefined,
        LearnedTagsCsv:
          selectedLearnedTagIds.length > 0 ? selectedLearnedTagIds.join(",") : undefined,
        MapDetailFile: file,
        AvatarFile: avatarFile ?? undefined,
        ...(galleryBatch.length > 0 && !isEditingExistingMap ? { GalleryFiles: galleryBatch } : {}),
      };

      const updatePayload = {
        Title: payload.Title,
        Description: payload.Description,
        Difficulty: payload.Difficulty,
        Price: payload.Price,
        ...(typeof payload.FreeTrialAttemptLimit === "number"
          ? { FreeTrialAttemptLimit: payload.FreeTrialAttemptLimit }
          : {}),
        TagIdsCsv: payload.TagIdsCsv,
        LearnedTagsCsv: payload.LearnedTagsCsv,
        MapDetailFile: payload.MapDetailFile,
      };

      let targetMapIdForUpdate: string | null =
        isEditingExistingMap && editingMapId ? editingMapId : null;

      if (
        isEditingExistingMap &&
        isLearner &&
        opts?.catalogSaveMode === "newListing" &&
        editingMapId
      ) {
        const dupRes = await learnerMapsApi.duplicateMapAsNew(editingMapId, {
          title: formMeta.title,
          description: formMeta.description || "",
          difficulty: formMeta.difficulty,
          price: formMeta.price ?? 0,
          ...(typeof formMeta.freeTrialAttemptLimit === "number"
            ? { freeTrialAttemptLimit: Math.max(0, Number(formMeta.freeTrialAttemptLimit)) }
            : {}),
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
          learnedTags: selectedLearnedTagIds.length > 0 ? selectedLearnedTagIds : undefined,
          autoPublish: false,
        });
        if (!dupRes.data.isSuccess) {
          alert(
            tt("mapEditorSaveFailed", "Save failed: {message}").replace(
              "{message}",
              dupRes.data.message || tt("mapEditorUnknownError", "Unknown error"),
            ),
          );
          return;
        }
        const newId = parseDuplicateNewMapId(dupRes.data.data);
        if (!newId) {
          alert(
            tt(
              "mapEditorDuplicateMapNoId",
              "The server did not return a new map id. Try again or contact support.",
            ),
          );
          return;
        }
        targetMapIdForUpdate = newId;
      }

      const response = isEditingExistingMap
        ? await mapsApi.updateMapFromJson(targetMapIdForUpdate!, updatePayload)
        : await mapsApi.uploadMapFromJson(payload);

      if (response.data.isSuccess) {
        const effectiveMapId = !isEditingExistingMap
          ? response.data.data &&
            typeof response.data.data === "object" &&
            "id" in response.data.data
            ? String((response.data.data as { id: string }).id)
            : ""
          : targetMapIdForUpdate!;

        if (isLearner && effectiveMapId && avatarFile) {
          const avatarResponse = await learnerMapsApi.uploadMapAvatar(effectiveMapId, avatarFile);
          if (!avatarResponse.data.isSuccess) {
            alert(
              tt(
                "mapEditorMapUpdatedAvatarFailed",
                "Map updated but avatar upload failed: {message}",
              ).replace(
                "{message}",
                avatarResponse.data.message || tt("mapEditorUnknownError", "Unknown error"),
              ),
            );
            return;
          }
        }

        if (galleryBatch.length > 0 && effectiveMapId) {
          const gRes = await mapsApi.uploadMapGallery(effectiveMapId, galleryBatch);
          if (!gRes.data.isSuccess) {
            alert(
              tt("mapEditorGalleryUploadFailed", "Gallery upload failed: {message}").replace(
                "{message}",
                gRes.data.message || tt("mapEditorUnknownError", "Unknown error"),
              ),
            );
            return;
          }
        }

        const mapId =
          response.data.data && typeof response.data.data === "object" && "id" in response.data.data
            ? String((response.data.data as { id: string }).id)
            : "";
        const savedAsNewListing =
          isLearner && opts?.catalogSaveMode === "newListing" && isEditingExistingMap;
        alert(
          savedAsNewListing
            ? tt(
                "mapEditorLevelContentSavedAsNewListing",
                "Saved as a new map listing. The editor now uses the new map id; the original listing is unchanged.",
              )
            : isEditingExistingMap
              ? tt("mapEditorLevelContentSavedSuccess", "Level content saved successfully!")
              : tt("mapEditorMapSavedSuccessWithId", "Map saved successfully!{idPart}").replace(
                  "{idPart}",
                  mapId
                    ? tt("mapEditorMapSavedIdPart", " Map ID: {id}").replace("{id}", mapId)
                    : "",
                ),
        );
        setShowMapInfoModal(false);
        setAvatarFile(null);
        setPendingGalleryFiles([]);

        if (opts?.redirectAfterSave) {
          setShowCatalogDraftPreview(false);
          if (isLearner) {
            navigate(ROUTES.LEARNER_MAPS);
          } else {
            navigate(ROUTES.CMS_MAPS);
          }
        }
      } else {
        alert(
          tt("mapEditorSaveFailed", "Save failed: {message}").replace(
            "{message}",
            response.data.message || tt("mapEditorUnknownError", "Unknown error"),
          ),
        );
      }
    } catch (error) {
      console.error("Save error:", error);
      alert(
        tt("mapEditorFailedToSaveMap", "Failed to save map: {message}").replace(
          "{message}",
          error instanceof Error ? error.message : tt("mapEditorUnknownError", "Unknown error"),
        ),
      );
    } finally {
      setSavingLevelContent(false);
    }
  };

  const handleSaveLevelContentRef = useRef(handleSaveLevelContent);
  handleSaveLevelContentRef.current = handleSaveLevelContent;

  useEffect(() => {
    if (sectionMode !== "right" || !registerSaveLevelContent) return;
    registerSaveLevelContent(() => handleSaveLevelContentRef.current());
  }, [registerSaveLevelContent, sectionMode]);

  useEffect(() => {
    onSavingLevelContentChange?.(savingLevelContent);
  }, [savingLevelContent, onSavingLevelContentChange]);

  return (
    <div style={styles.container}>
      {showRightPanel && (
        <div style={styles.rightPanelShell}>
          <div
            style={styles.rightPanelTabBar}
            role="tablist"
            aria-label={tt("mapEditorRightPanelTabs", "Right panel sections")}
          >
            {(
              [
                {
                  id: "canvas" as const,
                  label: tt("mapEditorRightTabCanvas", "Canvas"),
                  icon: <LayoutGrid size={14} />,
                },
                {
                  id: "level" as const,
                  label: tt("mapEditorRightTabLevel", "Level"),
                  icon: <Pencil size={14} />,
                },
                {
                  id: "rules" as const,
                  label: tt("mapEditorRightTabBlocks", "Blocks"),
                  icon: <Shapes size={14} />,
                },
                {
                  id: "objects" as const,
                  label: tt("mapEditorRightTabObjects", "Objects"),
                  icon: <Package size={14} />,
                },
                {
                  id: "map" as const,
                  label: tt("mapEditorRightTabMap", "Map"),
                  icon: <Settings2 size={14} />,
                },
              ] as const
            ).map((tab, index, arr) => {
              const isSelected = rightPanelTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-expanded={isSelected && rightPanelTabExpanded}
                  style={{
                    ...styles.rightPanelTabButton,
                    ...(index < arr.length - 1 ? styles.rightPanelTabButtonDivider : {}),
                    ...(isSelected ? styles.rightPanelTabButtonActive : {}),
                    ...(isSelected && !rightPanelTabExpanded
                      ? styles.rightPanelTabButtonCollapsed
                      : {}),
                  }}
                  onClick={() => handleRightPanelTabClick(tab.id)}
                >
                  <span style={styles.rightPanelTabButtonInner}>
                    <span style={styles.rightPanelTabIconWrap} aria-hidden>
                      {tab.icon}
                    </span>
                    <span style={styles.rightPanelTabLabel}>{tab.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div
            style={{
              ...styles.rightPanelTabContent,
              ...(rightPanelTabExpanded ? {} : styles.rightPanelTabContentCollapsed),
            }}
            aria-hidden={!rightPanelTabExpanded}
          >
            {rightPanelTabExpanded && (
              <>
                {rightPanelTab === "canvas" && (
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
              <Layers size={16} /> {tt("mapEditorLayerVisibilityTitle", "Layer Visibility")}
            </h3>
            {editorStore ? (
              <LayerPanel store={editorStore} hideTitle embedded />
            ) : (
              <p style={styles.helpText}>
                {tt("mapEditorLayerVisibilityFallback", "Open the editor with a map to use layer visibility.")}
              </p>
            )}
          </div>
          </>
          )}
          {rightPanelTab === "level" && (
          <>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <Pencil size={16} /> {tt("mapEditorLevelMapDetailTitle", "Level (MapDetail)")}
            </h3>
            <p style={styles.helpText}>
              {tt(
                "mapEditorLevelMapDetailHelp",
                'Per-level settings (time limit, win rule, hints…). Save with "Save level content", not "Map info".',
              )}
            </p>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tt("mapEditorMapTypeMap", "Map Type")}</label>
              <select
                value={mapData.config.type}
                onChange={(e) => onTypeChange?.(e.target.value as "platform" | "topdown" | "snake")}
                style={styles.select}
              >
                <option value="platform">{tt("mapEditorGameTypePlatform", "Platform")}</option>
                <option value="topdown">{tt("mapEditorGameTypeTopDown", "Top-down")}</option>
                <option value="snake">{tt("mapEditorGameTypeSnake", "Snake")}</option>
              </select>
            </div>
            <div style={styles.mapInfoCard}>
              <div style={styles.mapInfoRow}>
                <span>{tt("mapEditorSize", "Size")}</span>
                <strong>
                  {mapData.config.width} × {mapData.config.height} {tt("mapEditorTiles", "tiles")}
                </strong>
              </div>
              <div style={styles.mapInfoRow}>
                <span>{tt("mapEditorTileSize", "Tile Size")}</span>
                <strong>{mapData.config.tileSize}px</strong>
              </div>
            </div>
            <div style={{ ...styles.actionButtons, flexDirection: "column", alignItems: "stretch", marginBottom: 16 }}>
              <button type="button" style={styles.actionButton} onClick={() => setShowResizeDialog(true)}>
                <Maximize2 size={14} /> {tt("mapEditorResizeMap", "Resize Map")}
              </button>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tt("mapEditorLevelObjective", "Level Objective")}</label>
              <textarea
                rows={2}
                value={mapData.config.levelObjective ?? ""}
                onChange={(e) => onLevelObjectiveChange?.(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tt("mapEditorTimeLimitSeconds", "Time Limit (seconds)")}</label>
              <input
                type="number"
                min={30}
                max={3600}
                value={mapData.config.timeLimitSeconds}
                onChange={(e) => onTimeLimitChange?.(Number(e.target.value))}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tt("mapEditorTimeStarThreshold", "Time Star Threshold (%)")}</label>
              <input
                type="number"
                min={1}
                max={100}
                value={timeStarThresholdPercent}
                onChange={(e) =>
                  onTimeStarThresholdChange?.(
                    Math.max(1, Math.min(100, Number.parseInt(e.target.value, 10) || 100)),
                  )
                }
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tt("mapEditorEstimatedSteps", "Estimated Steps")}</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={mapData.config.estimatedSteps}
                onChange={(e) => onEstimatedStepsChange?.(Math.max(1, Number.parseInt(e.target.value) || 1))}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tt("mapEditorWinCondition", "Win Condition")}</label>
              <select
                value={mapData.config.winCondition}
                onChange={(e) => onWinConditionChange?.(Number(e.target.value) as 1 | 2)}
                style={styles.select}
              >
                <option value={1}>{tt("mapEditorReachGoal", "Reach Goal")}</option>
                <option value={2}>{tt("mapEditorCollectFruits", "Collect Fruits")}</option>
              </select>
            </div>
            {mapData.config.winCondition === 2 && (
              <div style={styles.formGroup}>
                <label style={styles.label}>{tt("mapEditorRequiredFruits", "Required Fruits")}</label>
                <input
                  type="number"
                  min={0}
                  value={mapData.config.requiredFruits ?? 0}
                  onChange={(e) =>
                    onRequiredFruitsChange?.(Math.max(0, Number.parseInt(e.target.value) || 0))
                  }
                  style={styles.input}
                />
              </div>
            )}
            <div style={styles.formGroup}>
              <label style={styles.label}>{tt("mapEditorHints", "Hints")}</label>
              {displayHints.map((hint, index) => (
                <input
                  key={`sidebar-hint-${index}`}
                  type="text"
                  value={hint}
                  onChange={(e) => {
                    const next = [...displayHints];
                    next[index] = e.target.value;
                    setDisplayHints(next);
                  }}
                  placeholder={tt("mapEditorHintNumber", "Hint {n}").replace("{n}", String(index + 1))}
                  style={{ ...styles.input, marginBottom: 6 }}
                />
              ))}
              {displayHints.length < 3 && (
                <button
                  type="button"
                  style={{ ...styles.confirmButton, padding: "6px 10px", marginTop: 4 }}
                  onClick={() => setDisplayHints([...displayHints, ""])}
                >
                  + {tt("mapEditorAddHint", "Add Hint")}
                </button>
              )}
            </div>
            <button
              type="button"
              style={{
                ...styles.actionButton,
                width: "100%",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--success) 85%, white 10%), color-mix(in srgb, var(--success) 72%, black 10%))",
                color: "#fff",
                borderColor: "color-mix(in srgb, var(--success) 65%, var(--border))",
              }}
              onClick={() => void handleSaveLevelContent()}
              disabled={userType === "unknown" || savingLevelContent}
            >
              <Save size={14} />{" "}
              {savingLevelContent
                ? tt("mapEditorSaving", "Saving...")
                : tt("mapEditorSaveLevelContent", "Save level content")}
            </button>
          </div>
          </>
          )}
          {rightPanelTab === "rules" && (
                  <>
                    <div style={styles.section}>
                      <h3 style={styles.sectionTitle}>
                        {tt("mapEditorBlockRules", "Block Rules")}
                      </h3>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>
                          {tt("mapEditorBlockLimitLabel", "Block Limit:")}
                        </label>
                        <p style={styles.helpText}>
                          {tt("mapEditorBlockLimitHint", "Set the block limit for the player")}
                        </p>
                        <input
                          type="number"
                          min="1"
                          value={mapData.blockConstraints.blockLimit ?? ""}
                          onChange={(e) => handleBlockLimitInput(e.target.value)}
                          placeholder="30"
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>
                          {tt("mapEditorAllowedBlocksLabel", "Allowed Blocks:")}
                        </label>
                        <p style={styles.helpText}>
                          {tt("mapEditorAllowedBlocksHint1", "Leave empty to allow all blocks")}
                        </p>
                        <p style={styles.helpText}>
                          {tt(
                            "mapEditorAllowedBlocksHint2",
                            "Only selected blocks will be available to the player",
                          )}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {normalizedAllowedBlocks.length === 0 && (
                            <div style={styles.placeholderText}>
                              {tt(
                                "mapEditorAllowedBlocksEmpty",
                                "No selection. All blocks are allowed.",
                              )}
                            </div>
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
                                  .filter(
                                    (block) =>
                                      block.type === type ||
                                      !normalizedAllowedBlocks.includes(block.type),
                                  )
                                  .map((block) => (
                                    <option
                                      key={`panel-allowed-option-${block.type}`}
                                      value={block.type}
                                    >
                                      {toBlockLabel(block.type)}
                                    </option>
                                  ))}
                              </select>
                              <button
                                onClick={() => removeAllowedBlock(index)}
                                style={{
                                  padding: "6px 8px",
                                  background: "var(--danger)",
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
                                ? "var(--surface-2)"
                                : "var(--success)",
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
                        <label style={styles.label}>
                          {tt("mapEditorRequiredBlocksLabel", "Required Blocks:")}
                        </label>
                        <p style={styles.helpText}>
                          {tt(
                            "mapEditorRequiredBlocksHint",
                            "Players must use these blocks at least N times",
                          )}
                        </p>
                        {hasAllowedRequiredConflict && (
                          <p style={styles.ruleWarningText}>
                            {tt(
                              "mapEditorRuleRequiredFromAllowedWarning",
                              "Some required blocks are outside Allowed Blocks and must be fixed before saving.",
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
                                onChange={(e) =>
                                  updateRequiredBlock(index, { type: e.target.value })
                                }
                                style={styles.select}
                                disabled={blocksAvailableForGameplay.length === 0}
                              >
                                {blocksAvailableForGameplay
                                  .filter(
                                    (block) =>
                                      block.type === rule.type ||
                                      !normalizedRequiredBlocks.some((r) => r.type === block.type),
                                  )
                                  .map((block) => (
                                    <option
                                      key={`panel-required-option-${block.type}`}
                                      value={block.type}
                                    >
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
                                  background: "var(--danger)",
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
                                ? "var(--surface-2)"
                                : "var(--success)",
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
                            {tt(
                              "mapEditorNoBlocksForRules",
                              "No blocks are currently available for requirement rules.",
                            )}
                          </p>
                        )}
                      </div>

                      <div style={styles.ruleSummaryPanel}>
                        <p style={styles.ruleSummaryTitle}>
                          {tt("mapEditorRuleSummary", "Rule Summary:")}
                        </p>
                        <p style={styles.ruleSummaryItem}>
                          - {tt("mapEditorAllowedShort", "Allowed")}: {allowedSummary}
                        </p>
                        <p style={styles.ruleSummaryItem}>
                          - {tt("mapEditorRequiredShort", "Required")}: {requiredSummary}
                        </p>
                        <p style={styles.ruleSummaryItem}>
                          - {tt("mapEditorLimitShort", "Limit")}: {limitSummary}
                        </p>
                      </div>
                    </div>
                  </>
                )}
                {rightPanelTab === "objects" && (
                  <>
                    <div style={styles.section}>
                      <h3 style={styles.sectionTitle}>
                        {tt("mapEditorObjectMetadata", "Object Metadata")}
                      </h3>
                      <p style={styles.helpText}>
                        {tt(
                          "mapEditorObjectMetadataHint",
                          "Configure metadata for placed doors and boxes.",
                        )}
                      </p>

                      {configurableObjects.length === 0 && (
                        <p style={styles.placeholderText}>
                          {tt(
                            "mapEditorObjectPlaceDoorOrBox",
                            "Place a door or box object to configure metadata.",
                          )}
                        </p>
                      )}

                      {configurableObjects.map(({ item, index }) => {
                        if (item.type === "door") {
                          const door = getDoorMetadata(item.metadata);
                          return (
                            <div key={`door-meta-${index}`} style={styles.objectMetadataCard}>
                              <p style={styles.objectMetadataTitle}>
                                {tt("mapEditorDoorAt", "Door at")} ({item.x}, {item.y})
                              </p>
                              <label style={styles.checkboxLabel}>
                                <input
                                  type="checkbox"
                                  checked={door.isOpen}
                                  onChange={(e) =>
                                    updateDoorMetadata(index, item.metadata, {
                                      isOpen: e.target.checked,
                                    })
                                  }
                                />
                                {tt("mapEditorOpenByDefault", "Open by default")}
                              </label>
                              <label style={styles.checkboxLabel}>
                                <input
                                  type="checkbox"
                                  checked={door.isLocked}
                                  onChange={(e) =>
                                    updateDoorMetadata(index, item.metadata, {
                                      isLocked: e.target.checked,
                                    })
                                  }
                                />
                                {tt("mapEditorLocked", "Locked")}
                              </label>
                              <label style={styles.label}>
                                {tt("mapEditorUnlockCode", "Unlock code")}
                              </label>
                              <input
                                type="text"
                                value={door.unlockCode}
                                onChange={(e) =>
                                  updateDoorMetadata(index, item.metadata, {
                                    unlockCode: e.target.value,
                                  })
                                }
                                placeholder={tt("mapEditorUnlockPlaceholder", "e.g. AB1")}
                                style={styles.input}
                              />
                              <p style={styles.helpText}>
                                {tt("mapEditorSupportedCharacters", "Supported characters")}:{" "}
                                {supportedUnlockCharactersLabel}
                              </p>
                            </div>
                          );
                        }

                        const hardness = getBoxHardness(item.type, item.metadata);
                        return (
                          <div key={`box-meta-${index}`} style={styles.objectMetadataCard}>
                            <p style={styles.objectMetadataTitle}>
                              {item.type} at ({item.x}, {item.y})
                            </p>
                            <label style={styles.label}>
                              {tt("mapEditorHardness", "Hardness")}
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={hardness}
                              onChange={(e) =>
                                updateBoxMetadata(
                                  index,
                                  item.metadata,
                                  Number(e.target.value) || hardness,
                                )
                              }
                              style={styles.input}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                {rightPanelTab === "map" && (
                  <>
                    <div style={styles.section}>
                      <h3 style={styles.sectionTitle}>
                        <Settings2 size={16} /> {tt("mapEditorMapSettings", "Map Settings")}
                      </h3>
                      <div
                        style={{
                          ...styles.actionButtons,
                          flexDirection: "column",
                          alignItems: "stretch",
                        }}
                      >
                        <div style={{ display: "grid", gap: 6 }}>
                          <label style={styles.label}>
                            {tt("mapEditorFreeTrialAttempts", "Free trial attempts")}
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={Math.max(0, Number(freeTrialAttemptLimit ?? 0))}
                            onChange={(e) =>
                              onFreeTrialAttemptLimitChange?.(
                                Math.max(0, Number(e.target.value) || 0),
                              )
                            }
                            style={styles.input}
                          />
                        </div>
                        <button
                          style={{ ...styles.actionButton, ...styles.saveButton }}
                          onClick={() => {
                            if (userType !== "unknown") {
                              setShowCatalogDraftPreview(true);
                              return;
                            }
                            setShowMapInfoModal(true);
                          }}
                          disabled={userType === "unknown"}
                          title={
                            userType === "unknown"
                              ? tt("mapEditorLoginToSaveMapsTitle", "Please login to save maps")
                              : tt(
                                  "mapEditorMapInfoButtonTitleLearner",
                                  "Open store listing editor (title, description, difficulty, price, tags, images).",
                                )
                          }
                        >
                          <Save size={14} /> {tt("mapEditorMapInfoButton", "Map info")}
                        </button>
                      </div>
                      <p style={{ ...styles.helpText, marginTop: 8 }}>
                        {tt(
                          "mapEditorMapSettingsSaveLevelHint",
                          'To save layout and MapDetail (JSON), open the Level tab and use "Save level content".',
                        )}
                      </p>
                      {userType !== "unknown" && (
                        <p style={{ ...styles.helpText, marginTop: 6 }}>
                          {tt(
                            "mapEditorMapTabCatalogHintLearner",
                            'Use "Map info" to open your map detail page and edit how it appears in the store.',
                          )}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
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
                  title={tt("mapEditorPaintTiles", "Paint tiles")}
                >
                  <Brush size={14} /> {tt("mapEditorPaint", "Paint")}
                </button>
                <button
                  style={{
                    ...styles.button,
                    ...(selectedTool === "erase" ? styles.buttonActive : {}),
                  }}
                  onClick={() => onToolSelect(selectedTool === "erase" ? null : "erase")}
                  title={tt("mapEditorEraseTiles", "Erase tiles")}
                >
                  <Eraser size={14} /> {tt("mapEditorErase", "Erase")}
                </button>
                <button
                  style={{
                    ...styles.button,
                    ...(selectedTool === "fill" ? styles.buttonActive : {}),
                  }}
                  onClick={() => onToolSelect(selectedTool === "fill" ? null : "fill")}
                  title={tt("mapEditorFillArea", "Fill area")}
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
              <p style={styles.helpText}>
                {tt(
                  "mapEditorCollisionWalkableHint",
                  "Draw solid tiles or erase them to make walkable spaces.",
                )}
              </p>
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <h3 style={{ ...styles.sectionTitle, margin: 0 }}>
                  {tt("mapEditorTileSelection", "Tile Selection")}
                </h3>

                <select
                  value={selectedTileGroup}
                  onChange={(e) => setSelectedTileGroup(e.target.value)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                  }}
                >
                  <option value="all">{tt("mapEditorAllGroups", "All Groups")}</option>
                  {availableTileGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>

              <TilePalette
                selectedTile={selectedTile}
                onTileSelect={onTileSelect}
                mapData={mapData}
                userPlan={userPlan}
                currentLang={locale}
                filterGroup={selectedTileGroup}
                onGroupsLoaded={setAvailableTileGroups}
              />
            </div>
          )}

          {activeLayer === "background" && objectSpritesLoaded && objectDefinitions && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>{tt("mapEditorObjects", "Objects")}</h3>
              {objectDefinitionGroups.map((group) => (
                <div key={`object-tier-${group.tier}`} style={{ marginBottom: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={styles.tierLabel}>{group.tier.toUpperCase()}</span>
                    {group.locked && (
                      <span style={styles.lockedTierHint}>
                        <Lock size={12} /> {LOCKED_TOOLTIP}
                      </span>
                    )}
                  </div>

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
                    {Object.entries(group.objects).map(([idStr, objDef]) => {
                      const objectId = parseInt(idStr, 10);

                      const data = objDef as ObjectDefinition;
                      const langKey = locale.toUpperCase() as "EN" | "VI";
                      const nameKey = `name_${langKey}` as keyof ObjectDefinition;
                      const displayName = String(data[nameKey] ?? data.name ?? idStr);

                      return (
                        <ObjectSelectionButton
                          key={`${group.tier}-${idStr}`}
                          objectId={objectId}
                          label={displayName}
                          objectDef={data}
                          tier={group.tier}
                          locked={group.locked}
                          cache={objectCache}
                          selectedObjectId={selectedObjectId}
                          deselectHint={tt("mapEditorDeselectHint", "Click again to deselect")}
                          onObjectSelect={onObjectSelect}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedObjectId === 15 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>{tt("mapEditorPortalColor", "Portal Color")}</h3>
              <p style={styles.helpText}>
                {tt("mapEditorPortalColorHint", "Select a color for the portal (max 2 per color)")}
              </p>
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
                          selectedPortalColor === color
                            ? colorMap[color] + "30"
                            : "var(--surface-2)",
                        border:
                          selectedPortalColor === color
                            ? `2px solid ${colorMap[color]}`
                            : "2px solid var(--border)",
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
                          ? tt("mapEditorPortalSelectColor", "Select {color} portal").replace(
                              "{color}",
                              color,
                            )
                          : tt(
                              "mapEditorPortalCannotPlaceMore",
                              "Cannot place more {color} portals (already 2)",
                            ).replace("{color}", color)
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
                      <span
                        style={{ fontSize: "13px", fontWeight: "500", textTransform: "capitalize" }}
                      >
                        {color}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-2)" }}>{count}/2</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Portal Recolor Mode */}
          {selectedObjectId === 15 &&
            mapData.objects.items?.some(
              (obj) => obj.type === "portal" && obj.x !== undefined && obj.y !== undefined,
            ) && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  {tt("mapEditorRecolorPortal", "Recolor Portal")}
                </h3>
                <p style={styles.helpText}>
                  {tt("mapEditorRecolorPortalHint", "Click a placed portal to change its color")}
                </p>
              </div>
            )}
        </>
      )}

      {/* Resize Dialog */}
      {showResizeDialog && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>{tt("mapEditorResizeMapTitle", "Resize Map")}</h3>
            <p style={styles.warningText}>
              {tt("mapEditorResizeClearsData", "⚠️ This will clear all map data")}
            </p>
            <p style={styles.helpText}>
              {tt("mapEditorResizeSizeRange", "Map size must be between 10x10 and 30x30")}
            </p>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                {tt("mapEditorResizeWidthTiles", "Width (tiles):")}
              </label>
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
              <label style={styles.label}>
                {tt("mapEditorResizeHeightTiles", "Height (tiles):")}
              </label>
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
              <label style={styles.label}>
                {tt("mapEditorResizeTileSizePx", "Tile Size (px):")}
              </label>
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
                {tt("mapEditorConfirm", "Confirm")}
              </button>
              <button style={styles.cancelButton} onClick={() => setShowResizeDialog(false)}>
                {tt("mapEditorCancel", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Info Modal (CMS only; learners use full-page catalog on map detail) */}
      {showMapInfoModal && !isLearner && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, ...styles.marketModalContent }}>
            <h3 style={styles.modalTitle}>{tt("mapEditorModalMapDetailsTitle", "Map Details")}</h3>
            <p style={{ ...styles.helpText, marginTop: -8, marginBottom: 18 }}>
              {tt(
                "mapEditorModalMapDetailsBlurb",
                "Map catalog info only (title, description, difficulty, price, tags). Level / MapDetail fields are in the right panel.",
              )}
            </p>

            <div style={styles.detailLayout}>
              <div style={styles.previewFrame}>
                {resolvedAvatarPreviewUrl ? (
                  <img
                    src={resolvedAvatarPreviewUrl}
                    alt={tt("mapEditorThumbnailWholeMapAlt", "Map thumbnail (whole map)")}
                    style={styles.previewImage}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div style={styles.previewPlaceholder} />
                )}

                <div style={styles.previewGradient} />

                <div style={styles.previewOverlayContent}>
                  <div>
                    <div style={styles.previewPlaceholderTitle}>{previewMapTitle}</div>
                    <div style={styles.previewPlaceholderText}>{thumbnailHintBelowImage}</div>
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

              {avatarFile && (
                <p style={styles.helpText}>
                  {tt("mapEditorSelected", "Selected")}: {avatarFile.name}
                </p>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  {tt("mapEditorGallerySection", "Gallery (images / videos)")}
                </label>
                <p style={styles.helpText}>
                  {tt(
                    "mapEditorGalleryHint",
                    "Map-level gallery (store listing), not per level. Use Save map info to upload. Pending files are also sent when you Save level content / toolbar Save.",
                  )}
                </p>
                <p style={styles.helpText}>
                  {tt("mapEditorGalleryMaxFiles", "Up to {n} files per batch.").replace(
                    "{n}",
                    String(GALLERY_BATCH_MAX),
                  )}
                </p>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const list = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (!list.length) return;
                    setPendingGalleryFiles((prev) =>
                      [...prev, ...list].slice(0, GALLERY_BATCH_MAX),
                    );
                  }}
                />
                <button
                  type="button"
                  style={{ ...styles.confirmButton, padding: "8px 12px", marginTop: 4 }}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <ImagePlus size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                  {tt("mapEditorGalleryAddFiles", "Add files")}
                </button>
                {pendingGalleryFiles.length > 0 && (
                  <ul
                    style={{
                      listStyle: "none",
                      margin: "8px 0 0",
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {pendingGalleryFiles.map((f, idx) => (
                      <li
                        key={`${f.name}-${f.size}-${idx}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          fontSize: 12,
                          padding: "6px 8px",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--surface-2)",
                        }}
                      >
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {f.name}
                        </span>
                        <button
                          type="button"
                          aria-label={tt("mapEditorGalleryRemove", "Remove")}
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            padding: 4,
                            color: "var(--text-2)",
                          }}
                          onClick={() =>
                            setPendingGalleryFiles((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          <X size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={styles.detailContentGrid}>
                <div style={styles.detailPanel}>
                  <div
                    style={{
                      ...styles.inlineField,
                      ...(activeInlineField === "difficulty" ? styles.inlineFieldActive : {}),
                    }}
                    onMouseEnter={() => setHoveredInlineField("difficulty")}
                    onMouseLeave={() => setHoveredInlineField(null)}
                    onClick={() => setActiveInlineField("difficulty")}
                  >
                    <div style={styles.inlineFieldLabel}>
                      {tt("mapEditorDifficulty", "Difficulty")}
                    </div>
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
                    {(hoveredInlineField === "difficulty" ||
                      activeInlineField === "difficulty") && (
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
                        {mapData.config.price > 0
                          ? `${mapData.config.price} OC`
                          : tt("mapEditorFree", "Free")}
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
                    <div style={styles.inlineFieldLabel}>
                      {levelSlotCount > 1
                        ? tt("mapEditorMapNameCatalog", "Map name (catalog)")
                        : tt("mapEditorMapName", "Map Name")}
                    </div>
                    {activeInlineField === "name" ? (
                      <input
                        autoFocus
                        value={
                          mapCatalogTitle !== undefined && onMapCatalogTitleChange
                            ? mapCatalogTitle
                            : mapData.config.name
                        }
                        onChange={(e) => {
                          if (onMapCatalogTitleChange) {
                            onMapCatalogTitleChange(e.target.value);
                          } else {
                            onNameChange?.(e.target.value);
                          }
                        }}
                        onBlur={() => setActiveInlineField(null)}
                        style={styles.inlineInput}
                      />
                    ) : (
                      <div style={styles.inlineFieldValue}>{previewMapTitle}</div>
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
                    <div style={styles.inlineFieldLabel}>
                      {tt("mapEditorDescription", "Description")}
                    </div>
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
                          tt(
                            "mapEditorDescriptionHint",
                            "Add a description to help players understand the challenge.",
                          )}
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
                          <p style={styles.helpText}>
                            {tt("mapEditorLoadingTags", "Loading tags...")}
                          </p>
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
                            <span
                              key={name}
                              style={{ ...styles.tagChip, ...styles.tagChipSelected }}
                            >
                              {name}
                            </span>
                          ))
                        ) : (
                          <span style={styles.inlineFieldValueMuted}>
                            {tt("mapEditorNoTagsSelected", "No tags selected")}
                          </span>
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
                      ...(activeInlineField === "learnedTagsCsv" ? styles.inlineFieldActive : {}),
                    }}
                    onMouseEnter={() => setHoveredInlineField("learnedTagsCsv")}
                    onMouseLeave={() => setHoveredInlineField(null)}
                    onClick={() => setActiveInlineField("learnedTagsCsv")}
                  >
                    <div style={styles.inlineFieldLabel}>
                      {tt("mapEditorLearnedKnowledge", "Learned knowledge")}
                    </div>
                    {activeInlineField === "learnedTagsCsv" ? (
                      <div>
                        {loadingMapTags ? (
                          <p style={styles.helpText}>
                            {tt("mapEditorLoadingTags", "Loading tags...")}
                          </p>
                        ) : (
                          <div style={styles.tagWrap}>
                            {learnedKnowledgeTags.map((tag) => {
                              const selected = selectedLearnedTagIds.includes(tag.id);
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleLearnedTagSelection(tag.id);
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
                        {selectedLearnedTagNames.length > 0 ? (
                          selectedLearnedTagNames.map((name) => (
                            <span
                              key={`learned-${name}`}
                              style={{ ...styles.tagChip, ...styles.tagChipSelected }}
                            >
                              {name}
                            </span>
                          ))
                        ) : (
                          <span style={styles.inlineFieldValueMuted}>
                            {tt("mapEditorNoLearnedTagsCsv", "No learned knowledge set")}
                          </span>
                        )}
                      </div>
                    )}
                    {(hoveredInlineField === "learnedTagsCsv" ||
                      activeInlineField === "learnedTagsCsv") && (
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
                  ...(savingMapMeta ? { opacity: 0.6, cursor: "not-allowed" } : {}),
                }}
                onClick={handleSaveMapMetadataFromModal}
                disabled={savingMapMeta}
              >
                {savingMapMeta
                  ? tt("mapEditorSaving", "Saving...")
                  : tt("mapEditorSaveMapInfo", "Save map info")}
              </button>
              <button
                style={styles.cancelButton}
                onClick={() => {
                  setShowMapInfoModal(false);
                  setAvatarFile(null);
                  setActiveInlineField(null);
                }}
                disabled={savingMapMeta}
              >
                {tt("mapEditorCancel", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRightPanel && userType !== "unknown" && (
        <MapCatalogDraftPreviewOverlay
          open={showCatalogDraftPreview}
          onClose={() => setShowCatalogDraftPreview(false)}
          persistedMapId={editingMapId ?? null}
          titleValue={levelSlotCount > 1 ? (mapCatalogTitle ?? "") : (mapData.config.name ?? "")}
          onTitleChange={(v) => {
            if (levelSlotCount > 1) {
              onMapCatalogTitleChange?.(v);
            } else {
              onNameChange?.(v);
            }
          }}
          description={mapData.config.description ?? ""}
          onDescriptionChange={(v) => onDescriptionChange?.(v)}
          difficulty={
            Math.min(5, Math.max(1, Math.floor(mapData.config.difficulty))) as 1 | 2 | 3 | 4 | 5
          }
          onDifficultyChange={(d) => onDifficultyChange?.(d)}
          price={mapData.config.price ?? 0}
          onPriceChange={(p) => onPriceChange?.(p)}
          freeTrialAttemptLimit={Math.max(0, Number(freeTrialAttemptLimit ?? 0))}
          onFreeTrialAttemptLimitChange={(v) => onFreeTrialAttemptLimitChange?.(v)}
          loadingMapTags={loadingMapTags}
          availableMapTags={availableMapTags}
          learnedKnowledgeTags={learnedKnowledgeTags}
          selectedTagIds={selectedTagIds}
          selectedLearnedTagIds={selectedLearnedTagIds}
          onToggleTag={toggleTagSelection}
          onToggleLearnedTag={toggleLearnedTagSelection}
          avatarPreviewUrl={resolvedAvatarPreviewUrl}
          avatarFile={avatarFile}
          onAvatarFileChange={setAvatarFile}
          galleryFiles={pendingGalleryFiles}
          onGalleryFilesAdd={(next) => setPendingGalleryFiles(next)}
          onGalleryFileRemove={(i) =>
            setPendingGalleryFiles((prev) => prev.filter((_, j) => j !== i))
          }
          galleryMaxFiles={GALLERY_BATCH_MAX}
          onSaveToServer={() =>
            void handleSaveLevelContent({
              skipConfirm: true,
              catalogSaveMode: catalogSaveMode,
              redirectAfterSave: true,
            })
          }
          catalogListingSaveMode={catalogSaveMode}
          onCatalogListingSaveModeChange={setCatalogSaveMode}
          mapContentVersion={loadedMapContentVersion}
          saving={savingLevelContent}
        />
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
  rightPanelShell: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    width: "100%",
    minHeight: 0,
  },
  rightPanelTabBar: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    width: "100%",
    marginBottom: 10,
    border: "1px solid var(--border)",
    borderRadius: 10,
    overflow: "hidden",
    background: "var(--surface-2)",
    boxSizing: "border-box",
  },
  rightPanelTabButton: {
    display: "flex",
    alignItems: "stretch",
    justifyContent: "stretch",
    minWidth: 0,
    minHeight: 56,
    padding: 0,
    margin: 0,
    fontSize: 11,
    fontWeight: 600,
    border: "none",
    borderRadius: 0,
    background: "var(--surface-2)",
    cursor: "pointer",
    color: "var(--text-2)",
    lineHeight: 1.2,
    WebkitTapHighlightColor: "transparent",
  },
  rightPanelTabButtonDivider: {
    borderRight: "1px solid var(--border)",
  },
  rightPanelTabButtonInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    width: "100%",
    minWidth: 0,
    padding: "8px 4px",
    boxSizing: "border-box",
  },
  rightPanelTabIconWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    lineHeight: 1,
  },
  rightPanelTabLabel: {
    display: "block",
    width: "100%",
    minWidth: 0,
    textAlign: "center",
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "break-word",
    hyphens: "auto",
    lineHeight: 1.25,
    fontSize: 10,
    letterSpacing: "0.01em",
  },
  rightPanelTabButtonActive: {
    background: "var(--primary)",
    color: "#fff",
  },
  /** Active tab but panel content is collapsed (click tab again to expand). */
  rightPanelTabButtonCollapsed: {
    opacity: 0.88,
    background: "var(--primary-hover)",
    boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--surface) 55%, transparent)",
  },
  rightPanelTabContent: {
    overflowY: "auto",
    maxHeight: "min(72vh, 780px)",
    paddingRight: 4,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  rightPanelTabContentCollapsed: {
    maxHeight: 0,
    overflow: "hidden",
    paddingTop: 0,
    paddingBottom: 0,
    margin: 0,
    gap: 0,
  },
  section: {
    padding: "14px",
    borderRadius: "14px",
    background: "linear-gradient(180deg, var(--surface), var(--surface-2))",
    border: "1px solid var(--border)",
    boxShadow: "0 8px 20px color-mix(in srgb, var(--bg) 32%, transparent)",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    margin: "0 0 12px 0",
    color: "var(--text)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    letterSpacing: "0.2px",
  },
  helpText: {
    fontSize: "12px",
    color: "var(--text-2)",
    marginBottom: "10px",
  },
  placeholderText: {
    fontSize: "12px",
    color: "var(--text-2)",
    padding: "8px 10px",
    border: "1px dashed var(--border)",
    borderRadius: "8px",
    background: "var(--surface-2)",
  },
  ruleWarningText: {
    fontSize: "12px",
    color: "var(--warning)",
    marginBottom: "8px",
  },
  ruleSummaryPanel: {
    marginTop: "12px",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
  },
  ruleSummaryTitle: {
    margin: "0 0 6px 0",
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--text)",
  },
  ruleSummaryItem: {
    margin: "0 0 4px 0",
    fontSize: "12px",
    color: "var(--text-2)",
  },
  tierLabel: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    border: "1px solid var(--border)",
    padding: "3px 8px",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    color: "var(--text-2)",
    background: "var(--surface-2)",
  },
  lockedTierHint: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    color: "var(--text-2)",
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
    border: "1px solid var(--border)",
    borderRadius: "10px",
    backgroundColor: "var(--surface)",
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
    backgroundColor: "var(--primary-hover)",
    color: "white",
    borderColor: "var(--primary-hover)",
    boxShadow: "0 6px 14px color-mix(in srgb, var(--primary) 35%, transparent)",
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
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text-2)",
    borderRadius: "999px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  categoryChipActive: {
    border: "1px solid var(--focus)",
    background: "color-mix(in srgb, var(--primary) 18%, var(--surface))",
    color: "var(--primary)",
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
    border: "1px solid var(--border)",
    borderRadius: "10px",
    background: "var(--surface-2)",
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
    color: "var(--text)",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color: "var(--text-2)",
  },
  infoText: {
    margin: 0,
    fontSize: "14px",
    color: "var(--text-2)",
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
    border: "1px solid var(--border)",
    borderRadius: "10px",
    backgroundColor: "var(--surface)",
    color: "var(--text)",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  saveButton: {
    backgroundColor: "var(--primary)",
    color: "#fff",
    border: "1px solid var(--primary)",
    boxShadow: "0 8px 16px color-mix(in srgb, var(--primary) 32%, transparent)",
  },
  importLabel: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    border: "2px solid var(--primary)",
    borderRadius: "6px",
    backgroundColor: "var(--surface)",
    color: "var(--primary)",
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
    backgroundColor: "var(--surface)",
    padding: "30px",
    borderRadius: "14px",
    boxShadow: "0 18px 38px rgba(0,0,0,0.25)",
    minWidth: "400px",
  },
  marketModalContent: {
    width: "min(980px, 92vw)",
    maxHeight: "88vh",
    overflowY: "auto",
    border: "1px solid var(--border)",
    background:
      "radial-gradient(circle at top right, rgba(37, 99, 235, 0.12), transparent 35%), linear-gradient(180deg, var(--surface), var(--surface-2))",
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
    border: "1px solid var(--border)",
    width: "100%",
    aspectRatio: "16 / 9",
    background: "linear-gradient(135deg, var(--bg), color-mix(in srgb, var(--bg) 80%, var(--surface)))",
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
      "radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--primary) 55%, transparent), transparent 35%), linear-gradient(140deg, var(--bg), color-mix(in srgb, var(--bg) 80%, var(--surface)))",
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
    color: "#cbd5e1",
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
    border: "1px solid var(--border)",
    borderRadius: "12px",
    background: "var(--surface-2)",
    padding: "10px 12px",
    display: "grid",
    gap: "8px",
  },
  mapInfoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "13px",
    color: "var(--text-2)",
  },
  detailPanel: {
    display: "grid",
    gap: "12px",
  },
  inlineField: {
    position: "relative",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    background: "var(--surface)",
    padding: "12px",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
    cursor: "pointer",
  },
  inlineFieldActive: {
    border: "1px solid var(--focus)",
    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.15)",
    transform: "translateY(-1px)",
  },
  inlineFieldLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--text-2)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "6px",
  },
  inlineFieldValue: {
    fontSize: "17px",
    fontWeight: 700,
    color: "var(--text)",
    lineHeight: 1.3,
  },
  inlineFieldValueMuted: {
    fontSize: "14px",
    color: "var(--text-2)",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },
  inlineFieldHint: {
    marginTop: "8px",
    fontSize: "12px",
    color: "var(--text-2)",
    lineHeight: 1.4,
  },
  inlineInput: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "15px",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    color: "var(--text)",
    boxSizing: "border-box",
    outline: "none",
  },
  inlineTextarea: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    color: "var(--text)",
    boxSizing: "border-box",
    resize: "vertical",
    lineHeight: 1.5,
    outline: "none",
  },
  inlineEditIcon: {
    position: "absolute",
    top: "10px",
    right: "10px",
    color: "var(--primary)",
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
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text-2)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  tagChipSelected: {
    border: "1px solid var(--primary)",
    background: "color-mix(in srgb, var(--primary) 18%, var(--surface))",
    color: "var(--primary)",
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "600",
    margin: "0 0 20px 0",
    color: "var(--text)",
  },
  warningText: {
    color: "var(--warning)",
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
    color: "var(--text-2)",
  },
  input: {
    width: "100%",
    padding: "8px 12px",
    fontSize: "14px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    boxSizing: "border-box",
    color: "var(--text)",
  },
  select: {
    width: "100%",
    padding: "8px 12px",
    fontSize: "14px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    boxSizing: "border-box",
    color: "var(--text)",
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
    backgroundColor: "var(--primary)",
    color: "white",
    cursor: "pointer",
  },
  cancelButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    border: "2px solid var(--border)",
    borderRadius: "6px",
    backgroundColor: "var(--surface)",
    color: "var(--text-2)",
    cursor: "pointer",
  },
};

