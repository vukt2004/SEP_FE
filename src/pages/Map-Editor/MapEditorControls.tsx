import { useState, useEffect, useMemo, useRef, type SetStateAction } from "react";
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
  ChevronLeft,
  ChevronRight,
  Plus,
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
const MAX_FREE_TRIAL_ATTEMPTS = 10;
const MAX_MAP_PRICE = 10000;

type BlockConfigEntry = (typeof blocksConfig.blocks)[number];

const BLOCK_CATEGORY_ORDER = [
  "movement",
  "control",
  "logic",
  "procedure",
  "variables",
  "math",
  "array",
  "queue",
  "stack",
  "other",
];

const BLOCK_CATEGORY_ACCENTS: Record<string, string> = {
  movement: "#5a67d8",
  control: "#14b8a6",
  logic: "#f59e0b",
  procedure: "#8b5cf6",
  variables: "#fb7185",
  math: "#0ea5e9",
  array: "#22c55e",
  queue: "#f97316",
  stack: "#a855f7",
  other: "#64748b",
};

const LEARNED_TAGS_BY_CATEGORY: Record<string, string[]> = {
  movement: [
    "Algorithm Basics",
    "Computational Thinking",
    "Problem Solving",
    "Pathfinding",
    "Obstacle Avoidance",
  ],
  control: ["Loops", "Conditionals", "Algorithm Design"],
  logic: ["Logical Thinking", "Conditionals", "Problem Solving"],
  procedure: ["Functions", "Algorithm Design"],
  variables: ["Variables"],
  math: ["Operators", "Algorithm Basics"],
  array: ["Arrays"],
  queue: ["Algorithm Design", "Problem Solving"],
  stack: ["Algorithm Design", "Problem Solving"],
  other: ["Computational Thinking"],
};

const LEARNED_TAGS_BY_BLOCK_TYPE: Record<string, string[]> = {
  repeat: ["Loops"],
  custom_while: ["Loops"],
  custom_do_while: ["Loops"],
  repeat_until: ["Loops"],
  custom_if: ["Conditionals"],
  define_procedure: ["Functions"],
  call_procedure: ["Functions"],
  move_to_cell: ["Pathfinding"],
  jump: ["Obstacle Avoidance"],
  open_door: ["Objects"],
  close_door: ["Objects"],
  unlock_door: ["Objects"],
};

const arraysEqual = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const mandatoryBlockTypesForMapType = (
  mapType: MapData["config"]["type"],
  availableTypeSet: Set<string>,
): string[] => {
  const base = ["move_forward", "turn_left", "turn_right"];
  if (mapType === "platform") {
    base.push("jump");
  }
  return base.filter((type) => availableTypeSet.has(type));
};

const selectedBlockTypesForLearnedKnowledge = (
  levelMap: MapData,
  availableTypeSet: Set<string>,
): string[] => {
  const mandatory = mandatoryBlockTypesForMapType(levelMap.config.type, availableTypeSet);
  const normalizedAllowed = Array.from(new Set(levelMap.blockConstraints.allowedBlocks ?? [])).filter(
    (type) => availableTypeSet.has(type),
  );
  const normalizedRequired = Array.from(
    new Set((levelMap.blockConstraints.requiredBlocks ?? []).map((rule) => rule.type)),
  ).filter((type) => availableTypeSet.has(type));

  if (normalizedAllowed.length > 0) {
    return Array.from(new Set([...normalizedAllowed, ...mandatory]));
  }

  return Array.from(new Set([...normalizedRequired, ...mandatory]));
};

const inferLearnedTagNamesFromBlocks = (
  blockTypes: string[],
  blockCategoryByType: Map<string, string>,
): string[] => {
  const learned = new Set<string>();

  for (const type of blockTypes) {
    const specific = LEARNED_TAGS_BY_BLOCK_TYPE[type] ?? [];
    for (const tag of specific) {
      learned.add(tag);
    }

    const category = blockCategoryByType.get(type) ?? "other";
    const fromCategory = LEARNED_TAGS_BY_CATEGORY[category] ?? LEARNED_TAGS_BY_CATEGORY.other;
    for (const tag of fromCategory) {
      learned.add(tag);
    }

    if (/(loop|repeat|while)/i.test(type)) learned.add("Loops");
    if (/(if|condition)/i.test(type)) learned.add("Conditionals");
    if (/(procedure|function)/i.test(type)) learned.add("Functions");
    if (/(variable)/i.test(type)) learned.add("Variables");
    if (/(array)/i.test(type)) learned.add("Arrays");
    if (/(operator|math)/i.test(type)) learned.add("Operators");
    if (/(path|cell)/i.test(type)) learned.add("Pathfinding");
    if (/(jump|obstacle)/i.test(type)) learned.add("Obstacle Avoidance");
    if (/(collect|fruit|resource)/i.test(type)) learned.add("Resource Collection");
    if (/(optimi)/i.test(type)) learned.add("Optimization");
    if (/(pattern)/i.test(type)) learned.add("Pattern Recognition");
    if (/(pointer)/i.test(type)) learned.add("Pointers");
    if (/(object|door|box)/i.test(type)) learned.add("Objects");
    if (/(recursion)/i.test(type)) learned.add("Recursion");
  }

  return Array.from(learned);
};

const clampFreeTrialAttemptLimit = (value: number): number => {
  const safe = Number.isFinite(value) ? value : 0;
  return Math.min(MAX_FREE_TRIAL_ATTEMPTS, Math.max(0, Math.floor(safe)));
};

const clampMapPrice = (value: number): number => {
  const safe = Number.isFinite(value) ? value : 0;
  return Math.min(MAX_MAP_PRICE, Math.max(0, Math.floor(safe)));
};

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
  initialSelectedLearnedTagNames?: string[];
  onSelectedTagNamesChange?: (names: string[]) => void;
  onSelectedLearnedTagNamesChange?: (names: string[]) => void;
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
  /** Active level index in parent wizard; used for quick-switch dropdown in Level tab. */
  currentLevelIndex?: number;
  onCurrentLevelIndexChange?: (index: number) => void;
  /** For right panel Canvas tab: layer visibility + active layer (same as standalone Layer panel). */
  editorStore?: EditorStore;
  /** Wire header "Save" to the same flow as Level tab save (right panel only). */
  registerSaveLevelContent?: (save: () => Promise<void>) => void;
  onSavingLevelContentChange?: (busy: boolean) => void;
  /** Từ GET map detail — hiển thị phiên bản nội dung trong overlay catalog */
  loadedMapContentVersion?: number | null;
  /** Restrict visible tabs in right panel when embedding in wizard flows. */
  allowedRightTabs?: RightPanelTabId[];
  /** Optional default tab for right panel. */
  initialRightTab?: RightPanelTabId;
  /** Hide right panel tab bar when only one focused step is needed. */
  hideRightPanelTabBar?: boolean;
  /** Render full catalog/map-info editor inline in map tab instead of opening popup/overlay. */
  showCatalogEditorInlineInMapTab?: boolean;
  /** Optional controlled avatar file to persist draft media outside this component. */
  avatarDraftFile?: File | null;
  onAvatarDraftFileChange?: (file: File | null) => void;
  /** Optional controlled gallery draft files to persist across step navigation. */
  galleryDraftFiles?: File[];
  onGalleryDraftFilesChange?: (files: File[]) => void;
  /** Step 6 review gate: only allow submit-for-review when all criteria pass. */
  canSubmitForReview?: boolean;
  /** Human-readable missing criteria shown when submit is blocked. */
  submitForReviewRequirements?: string[];
}

export type RightPanelTabId = "canvas" | "level" | "rules" | "objects" | "map";

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
  onPriceChange,
  freeTrialAttemptLimit,
  onFreeTrialAttemptLimitChange,
  onAllowedBlocksChange,
  onRequiredBlocksChange,
  onObjectDefinitionsLoaded,
  onObjectMetadataChange,
  sectionMode = "right",
  editingMapId,
  editorMode,
  initialSelectedTagNames = [],
  initialSelectedLearnedTagNames = [],
  onSelectedTagNamesChange,
  onSelectedLearnedTagNamesChange,
  initialAvatarUrl = null,
  initialHints = [],
  mapCatalogTitle,
  onMapCatalogTitleChange,
  levelHints,
  onLevelHintsChange,
  buildUploadLevels,
  getMapFormMeta,
  levelSlotCount = 1,
  currentLevelIndex,
  onCurrentLevelIndexChange,
  editorStore,
  registerSaveLevelContent,
  onSavingLevelContentChange,
  loadedMapContentVersion = null,
  allowedRightTabs,
  initialRightTab,
  hideRightPanelTabBar = false,
  showCatalogEditorInlineInMapTab = false,
  avatarDraftFile,
  onAvatarDraftFileChange,
  galleryDraftFiles,
  onGalleryDraftFilesChange,
  canSubmitForReview = true,
  submitForReviewRequirements = [],
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
  const [internalAvatarFile, setInternalAvatarFile] = useState<File | null>(null);
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
  const tagSelectionTouchedRef = useRef(false);
  const [loadingMapTags, setLoadingMapTags] = useState(false);
  const [savingMapMeta, setSavingMapMeta] = useState(false);
  const [savingLevelContent, setSavingLevelContent] = useState(false);
  const [internalPendingGalleryFiles, setInternalPendingGalleryFiles] = useState<File[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const galleryStripRef = useRef<HTMLDivElement>(null);
  const [pendingGalleryPreviewUrls, setPendingGalleryPreviewUrls] = useState<string[]>([]);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTabId>(() => initialRightTab ?? "canvas");
  /** Same tab again = collapse panel; other tab = switch and expand. */
  const [rightPanelTabExpanded, setRightPanelTabExpanded] = useState(true);
  const avatarFile =
    avatarDraftFile !== undefined
      ? avatarDraftFile
      : internalAvatarFile;
  const setAvatarFile = (next: File | null) => {
    if (avatarDraftFile !== undefined && onAvatarDraftFileChange) {
      onAvatarDraftFileChange(next);
      return;
    }
    setInternalAvatarFile(next);
  };
  const pendingGalleryFiles =
    galleryDraftFiles !== undefined
      ? galleryDraftFiles
      : internalPendingGalleryFiles;
  const setPendingGalleryFiles = (next: SetStateAction<File[]>) => {
    if (galleryDraftFiles !== undefined && onGalleryDraftFilesChange) {
      const resolved = typeof next === "function" ? next(galleryDraftFiles) : next;
      onGalleryDraftFilesChange(resolved);
      return;
    }
    setInternalPendingGalleryFiles(next);
  };

  const appendGalleryFiles = (files: File[]) => {
    if (!files.length) return;
    setPendingGalleryFiles((prev) => [...prev, ...files].slice(0, GALLERY_BATCH_MAX));
  };

  const scrollGalleryStrip = (direction: -1 | 1) => {
    galleryStripRef.current?.scrollBy({ left: direction * 220, behavior: "smooth" });
  };
  const normalizedFreeTrialAttemptLimit = clampFreeTrialAttemptLimit(
    Number(freeTrialAttemptLimit ?? 0),
  );
  const handleFreeTrialAttemptLimitInputChange = (raw: number) => {
    onFreeTrialAttemptLimitChange?.(clampFreeTrialAttemptLimit(raw));
  };
  const handlePriceInputChange = (raw: number) => {
    onPriceChange?.(clampMapPrice(raw));
  };
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
  const availableBlockTypes = useMemo(() => availableBlocks.map((block) => block.type), [
    availableBlocks,
  ]);
  const normalizedAllowedBlocks = Array.from(
    new Set(mapData.blockConstraints.allowedBlocks ?? []),
  ).filter((type) => availableBlocks.some((block) => block.type === type));
  const hasExplicitAllowedSelection = normalizedAllowedBlocks.length > 0;
  const mandatoryAllowedBlockTypes = useMemo(() => {
    const baseTypes = ["move_forward", "turn_left", "turn_right"];
    if (mapData.config.type === "platform") {
      baseTypes.push("jump");
    }

    return Array.from(new Set(baseTypes)).filter((type) => availableBlockTypes.includes(type));
  }, [availableBlockTypes, mapData.config.type]);
  const mandatoryAllowedBlockSet = useMemo(
    () => new Set(mandatoryAllowedBlockTypes),
    [mandatoryAllowedBlockTypes],
  );
  const effectiveAllowedBlockTypes = hasExplicitAllowedSelection
    ? Array.from(new Set([...normalizedAllowedBlocks, ...mandatoryAllowedBlockTypes]))
    : availableBlockTypes;
  const effectiveAllowedBlockSet = useMemo(
    () => new Set(effectiveAllowedBlockTypes),
    [effectiveAllowedBlockTypes],
  );
  const blocksAvailableForGameplay =
    effectiveAllowedBlockTypes.length === 0
      ? []
      : availableBlocks.filter((block) => effectiveAllowedBlockSet.has(block.type));
  const normalizedRequiredBlocks = Array.from(
    new Map(
      mapData.blockConstraints.requiredBlocks
        .filter((rule) => blocksAvailableForGameplay.some((block) => block.type === rule.type))
        .map((rule) => [rule.type, { type: rule.type, minCount: Math.max(1, rule.minCount) }]),
    ).values(),
  );
  const groupedAvailableBlocks = useMemo(() => {
    const grouped = new Map<string, BlockConfigEntry[]>();

    for (const block of availableBlocks) {
      const rawCategory = typeof block.category === "string" ? block.category.trim() : "";
      const category = rawCategory.length > 0 ? rawCategory : "other";
      const bucket = grouped.get(category);
      if (bucket) {
        bucket.push(block);
      } else {
        grouped.set(category, [block]);
      }
    }

    const orderedCategories = [...grouped.keys()].sort((a, b) => {
      const aIndex = BLOCK_CATEGORY_ORDER.indexOf(a);
      const bIndex = BLOCK_CATEGORY_ORDER.indexOf(b);
      const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      if (safeA !== safeB) return safeA - safeB;
      return a.localeCompare(b);
    });

    return orderedCategories.map((category) => ({
      category,
      blocks: grouped.get(category) ?? [],
    }));
  }, [availableBlocks]);
  const [objectSpritesLoaded, setObjectSpritesLoaded] = useState(false);
  const showLeftPanel = sectionMode === "left";
  const showRightPanel = sectionMode === "right";
  const rightTabItems = useMemo(
    () => [
      {
        id: "canvas" as const,
        label: tt("mapEditorRightTabCanvas", "Canvas"),
        icon: <LayoutGrid size={16} />,
      },
      {
        id: "level" as const,
        label: tt("mapEditorRightTabLevel", "Level"),
        icon: <Pencil size={16} />,
      },
      {
        id: "rules" as const,
        label: tt("mapEditorRightTabBlocks", "Blocks"),
        icon: <Shapes size={16} />,
      },
      {
        id: "objects" as const,
        label: tt("mapEditorRightTabObjects", "Objects"),
        icon: <Package size={16} />,
      },
      {
        id: "map" as const,
        label: tt("mapEditorRightTabMap", "Map"),
        icon: <Settings2 size={16} />,
      },
    ],
    [tt],
  );
  const visibleRightTabs = useMemo(() => {
    if (!allowedRightTabs || allowedRightTabs.length === 0) {
      return rightTabItems;
    }

    const allowedSet = new Set(allowedRightTabs);
    return rightTabItems.filter((tab) => allowedSet.has(tab.id));
  }, [allowedRightTabs, rightTabItems]);

  useEffect(() => {
    if (!showRightPanel) return;
    if (visibleRightTabs.length === 0) return;

    const hasCurrentTab = visibleRightTabs.some((tab) => tab.id === rightPanelTab);
    if (hasCurrentTab) return;

    const fallback =
      (initialRightTab && visibleRightTabs.find((tab) => tab.id === initialRightTab)?.id) ||
      visibleRightTabs[0]?.id;

    if (fallback) {
      setRightPanelTab(fallback);
    }
  }, [initialRightTab, rightPanelTab, showRightPanel, visibleRightTabs]);

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
            : await new ObjectSpriteLoader(gameType).loadTieredObjectDefinitions(
                "objects",
                userPlan,
              );
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
  }, [
    gameType,
    mapData.config.type,
    objectCache,
    onObjectDefinitionsLoaded,
    showLeftPanel,
    userPlan,
  ]);

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
    if (!onAllowedBlocksChange) return;
    if (!hasExplicitAllowedSelection) return;

    const missingMandatory = mandatoryAllowedBlockTypes.filter(
      (type) => !normalizedAllowedBlocks.includes(type),
    );
    if (missingMandatory.length === 0) return;

    const merged = Array.from(new Set([...normalizedAllowedBlocks, ...mandatoryAllowedBlockTypes]));
    onAllowedBlocksChange(
      merged.length >= availableBlockTypes.length ? [] : merged,
    );
  }, [
    availableBlockTypes.length,
    hasExplicitAllowedSelection,
    mandatoryAllowedBlockTypes,
    normalizedAllowedBlocks,
    onAllowedBlocksChange,
  ]);

  useEffect(() => {
    tagSelectionTouchedRef.current = false;
  }, [initialSelectedTagNames]);

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
    tagSelectionTouchedRef.current = true;
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
    if (pendingGalleryFiles.length === 0) {
      setPendingGalleryPreviewUrls([]);
      return;
    }

    const urls = pendingGalleryFiles.map((file) => URL.createObjectURL(file));
    setPendingGalleryPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingGalleryFiles]);

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

  const selectedTagNames = useMemo(
    () =>
      availableMapTags
        .filter((tag) => selectedTagIds.includes(tag.id))
        .map((tag) => tag.name),
    [availableMapTags, selectedTagIds],
  );

  const hiddenLearnedKnowledgeTagNames = new Set(["beginner", "expert", "easy", "medium", "hard"]);

  const learnedKnowledgeTags = useMemo(
    () =>
      availableMapTags.filter(
        (tag) => !hiddenLearnedKnowledgeTagNames.has(tag.name.trim().toLowerCase()),
      ),
    [availableMapTags],
  );

  const blockCategoryByType = useMemo(
    () =>
      new Map(
        availableBlocks.map((block) => {
          const raw = typeof block.category === "string" ? block.category.trim() : "";
          return [block.type, raw.length > 0 ? raw : "other"] as const;
        }),
      ),
    [availableBlocks],
  );

  const inferredLearnedTagIds = useMemo(() => {
    const availableTypeSet = new Set(availableBlockTypes);
    const levelMaps = (() => {
      if (buildUploadLevels) {
        try {
          const levels = buildUploadLevels();
          if (levels.length > 0) {
            return levels.map((level) => level.mapData);
          }
        } catch {
          // Fall back to current map data.
        }
      }
      return [mapData];
    })();

    const selectedBlocks = new Set<string>();
    for (const levelMap of levelMaps) {
      const types = selectedBlockTypesForLearnedKnowledge(levelMap, availableTypeSet);
      for (const type of types) {
        selectedBlocks.add(type);
      }
    }

    const inferredNames = inferLearnedTagNamesFromBlocks(
      Array.from(selectedBlocks),
      blockCategoryByType,
    );

    const learnedTagIdByName = new Map(
      learnedKnowledgeTags.map((tag) => [tag.name.trim().toLowerCase(), tag.id] as const),
    );
    const inferredIds = inferredNames
      .map((name) => learnedTagIdByName.get(name.trim().toLowerCase()))
      .filter((id): id is string => Boolean(id));

    if (inferredIds.length > 0) {
      return Array.from(new Set(inferredIds));
    }

    return initialSelectedLearnedTagNames
      .map((name) => learnedTagIdByName.get(name.trim().toLowerCase()))
      .filter((id): id is string => Boolean(id));
  }, [
    availableBlockTypes,
    blockCategoryByType,
    buildUploadLevels,
    initialSelectedLearnedTagNames,
    learnedKnowledgeTags,
    mapData,
  ]);

  useEffect(() => {
    setSelectedLearnedTagIds((prev) => (arraysEqual(prev, inferredLearnedTagIds) ? prev : inferredLearnedTagIds));
  }, [inferredLearnedTagIds]);

  const selectedLearnedTagNames = useMemo(
    () =>
      learnedKnowledgeTags
        .filter((tag) => selectedLearnedTagIds.includes(tag.id))
        .map((tag) => tag.name),
    [learnedKnowledgeTags, selectedLearnedTagIds],
  );

  useEffect(() => {
    if (!availableMapTags.length) return;
    // Avoid overwriting parent state with an empty selection before user interaction.
    if (
      !tagSelectionTouchedRef.current &&
      selectedTagIds.length === 0 &&
      initialSelectedTagNames.length > 0
    ) {
      return;
    }
    onSelectedTagNamesChange?.(selectedTagNames);
  }, [
    availableMapTags.length,
    initialSelectedTagNames.length,
    onSelectedTagNamesChange,
    selectedTagIds.length,
    selectedTagNames,
  ]);

  useEffect(() => {
    onSelectedLearnedTagNamesChange?.(selectedLearnedTagNames);
  }, [
    onSelectedLearnedTagNamesChange,
    selectedLearnedTagNames,
  ]);

  const difficultyLabel = `${mapData.config.difficulty}/5`;

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

  const toCategoryLabel = (category: string) => {
    const key = `blockCategory.${category}`;
    const translated = t(key);
    if (translated !== key) return translated;
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const handleToggleAllowedBlock = (type: string) => {
    if (!onAllowedBlocksChange) return;
    if (mandatoryAllowedBlockSet.has(type)) return;

    const currentAllowed = hasExplicitAllowedSelection
      ? effectiveAllowedBlockTypes
      : availableBlockTypes;
    const exists = currentAllowed.includes(type);
    const nextWorking = exists
      ? currentAllowed.filter((item) => item !== type)
      : [...currentAllowed, type];
    const nextWithMandatory = Array.from(
      new Set([...nextWorking, ...mandatoryAllowedBlockTypes]),
    );
    const nextAllowed =
      nextWithMandatory.length >= availableBlockTypes.length ? [] : nextWithMandatory;
    onAllowedBlocksChange(nextAllowed);

    if (onRequiredBlocksChange) {
      const nextAllowedSet = new Set(nextWithMandatory);
      const sanitizedRequired = normalizedRequiredBlocks.filter((rule) =>
        nextAllowedSet.has(rule.type),
      );
      onRequiredBlocksChange(sanitizedRequired);
    }
  };

  const handleSelectAllBlocks = () => {
    if (!onAllowedBlocksChange) return;
    // Empty selection in storage means all blocks are enabled.
    onAllowedBlocksChange([]);
  };

  const handleClearToMandatoryBlocks = () => {
    if (!onAllowedBlocksChange) return;
    const nextAllowed =
      mandatoryAllowedBlockTypes.length >= availableBlockTypes.length
        ? []
        : mandatoryAllowedBlockTypes;
    onAllowedBlocksChange(nextAllowed);

    if (onRequiredBlocksChange) {
      const mandatorySet = new Set(mandatoryAllowedBlockTypes);
      const sanitizedRequired = normalizedRequiredBlocks.filter((rule) =>
        mandatorySet.has(rule.type),
      );
      onRequiredBlocksChange(sanitizedRequired);
    }
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

    const mandatoryTypes = ["move_forward", "turn_left", "turn_right"];
    if (md.config.type === "platform") {
      mandatoryTypes.push("jump");
    }
    const existingMandatoryTypes = mandatoryTypes.filter((type) =>
      availableBlockTypes.includes(type),
    );

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

      const missingMandatory = existingMandatoryTypes.filter((type) => !allowedSet.has(type));
      if (missingMandatory.length > 0) {
        errors.push(
          tt(
            "mapEditorRuleMandatoryMovementRequired",
            "Move Forward, Turn Left, Turn Right (and Jump for Platform) must remain enabled.",
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
  const isMandatoryOnlySelection =
    effectiveAllowedBlockTypes.length === mandatoryAllowedBlockTypes.length &&
    mandatoryAllowedBlockTypes.every((type) => effectiveAllowedBlockSet.has(type));

  const displayHints =
    onLevelHintsChange && levelHints !== undefined
      ? levelHints.length > 0
        ? levelHints
        : [""]
      : hints;

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
        let targetMapId = editingMapId;
        let createdVersionMapId: string | null = null;

        const infoRes = await learnerMapsApi.getMapInfo(editingMapId);
        if (!infoRes.data.isSuccess || !infoRes.data.data) {
          alert(
            tt("mapEditorSaveFailed", "Save failed: {message}").replace(
              "{message}",
              infoRes.data.message || tt("mapEditorUnknownError", "Unknown error"),
            ),
          );
          return;
        }

        const currentStatus = infoRes.data.data.mapStatus;
        const requiresVersioning = currentStatus === "Approved" || currentStatus === "Published";
        if (requiresVersioning) {
          const versionRes = await learnerMapsApi.createMapVersion(editingMapId);
          if (!versionRes.data.isSuccess) {
            alert(
              tt("mapEditorSaveFailed", "Save failed: {message}").replace(
                "{message}",
                versionRes.data.message || tt("mapEditorUnknownError", "Unknown error"),
              ),
            );
            return;
          }

          const newVersionId = parseDuplicateNewMapId(versionRes.data.data);
          if (!newVersionId) {
            alert(
              tt(
                "mapEditorDuplicateMapNoId",
                "The server did not return a new map id. Try again or contact support.",
              ),
            );
            return;
          }

          targetMapId = newVersionId;
          createdVersionMapId = newVersionId;
        }

        const res = await learnerMapsApi.updateMapMetadata(targetMapId, {
          title: formMeta.title,
          description: formMeta.description || "",
          difficulty: formMeta.difficulty,
          price: clampMapPrice(formMeta.price),
          ...(typeof formMeta.freeTrialAttemptLimit === "number"
            ? {
                freeTrialAttemptLimit: clampFreeTrialAttemptLimit(
                  Number(formMeta.freeTrialAttemptLimit),
                ),
              }
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
          const avatarResponse = await learnerMapsApi.uploadMapAvatar(targetMapId, avatarFile);
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
            targetMapId,
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
        if (createdVersionMapId) {
          alert(
            tt(
              "mapEditorVersionDraftCreated",
              "A new draft version was created from the approved/published map and your changes were saved there.",
            ),
          );
          navigate(ROUTES.MAP_EDITOR, {
            replace: true,
            state: { mapId: createdVersionMapId, mode: "edit", roleContext: "learner" },
          });
        } else {
          alert(tt("mapEditorMapInfoSavedShort", "Map info saved."));
        }
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
        Price: clampMapPrice(formMeta.price),
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
    submitForReview?: boolean;
  }) => {
    const meta = getMapFormMeta?.();
    const titleForApi =
      meta?.title?.trim() ?? mapCatalogTitle?.trim() ?? mapData.config.name?.trim();
    if (!titleForApi) {
      alert(tt("mapEditorPleaseSetMapName", "Please set a map name before saving"));
      return;
    }

    if (opts?.submitForReview && !canSubmitForReview) {
      const topReasons = submitForReviewRequirements.slice(0, 8);
      const detailText =
        topReasons.length > 0
          ? `\n- ${topReasons.join("\n- ")}${
              submitForReviewRequirements.length > topReasons.length ? "\n..." : ""
            }`
          : "";
      alert(
        `${tt(
          "mapEditorSubmitBlockedByChecklist",
          "Cannot submit for review yet. Complete all Step 6 checklist criteria first.",
        )}${detailText}`,
      );
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
        Price: clampMapPrice(formMeta.price),
        ...(typeof formMeta.freeTrialAttemptLimit === "number"
          ? {
              FreeTrialAttemptLimit: clampFreeTrialAttemptLimit(
                Number(formMeta.freeTrialAttemptLimit),
              ),
            }
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
      let createdVersionMapId: string | null = null;

      if (isEditingExistingMap && isLearner && editingMapId) {
        const infoRes = await learnerMapsApi.getMapInfo(editingMapId);
        if (!infoRes.data.isSuccess || !infoRes.data.data) {
          alert(
            tt("mapEditorSaveFailed", "Save failed: {message}").replace(
              "{message}",
              infoRes.data.message || tt("mapEditorUnknownError", "Unknown error"),
            ),
          );
          return;
        }

        const currentStatus = infoRes.data.data.mapStatus;
        const requiresVersioning = currentStatus === "Approved" || currentStatus === "Published";
        if (requiresVersioning) {
          const versionRes = await learnerMapsApi.createMapVersion(editingMapId);
          if (!versionRes.data.isSuccess) {
            alert(
              tt("mapEditorSaveFailed", "Save failed: {message}").replace(
                "{message}",
                versionRes.data.message || tt("mapEditorUnknownError", "Unknown error"),
              ),
            );
            return;
          }

          const newVersionId = parseDuplicateNewMapId(versionRes.data.data);
          if (!newVersionId) {
            alert(
              tt(
                "mapEditorDuplicateMapNoId",
                "The server did not return a new map id. Try again or contact support.",
              ),
            );
            return;
          }

          targetMapIdForUpdate = newVersionId;
          createdVersionMapId = newVersionId;
        }
      }

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
          price: clampMapPrice(formMeta.price ?? 0),
          ...(typeof formMeta.freeTrialAttemptLimit === "number"
            ? {
                freeTrialAttemptLimit: clampFreeTrialAttemptLimit(
                  Number(formMeta.freeTrialAttemptLimit),
                ),
              }
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
        const uploadedMapId = parseDuplicateNewMapId(response.data.data);
        const effectiveMapId = isEditingExistingMap ? targetMapIdForUpdate! : uploadedMapId ?? "";

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

        if (opts?.submitForReview && isLearner) {
          if (!effectiveMapId) {
            alert(
              tt(
                "mapEditorSubmitReviewMissingMapId",
                "Saved draft but cannot submit for review because game id was not returned.",
              ),
            );
            return;
          }

          const submitRes = await learnerMapsApi.submitMapForReview(effectiveMapId);
          if (!submitRes.data.isSuccess) {
            alert(
              tt(
                "mapEditorSavedButSubmitReviewFailed",
                "Draft saved but submit for review failed: {message}",
              ).replace(
                "{message}",
                submitRes.data.message || tt("mapEditorUnknownError", "Unknown error"),
              ),
            );
            return;
          }
        }

        const savedAsNewListing =
          isLearner && opts?.catalogSaveMode === "newListing" && isEditingExistingMap;
        alert(
          opts?.submitForReview && isLearner
            ? tt(
                "mapEditorSavedAndSubmittedForReview",
                "Game saved and submitted for review successfully.",
              )
            : createdVersionMapId
            ? tt(
                "mapEditorVersionDraftCreated",
                "A new draft version was created from the approved/published map and your changes were saved there.",
              )
            : savedAsNewListing
              ? tt(
                  "mapEditorLevelContentSavedAsNewListing",
                  "Saved as a new map listing. The editor now uses the new map id; the original listing is unchanged.",
                )
              : isEditingExistingMap
                ? tt("mapEditorLevelContentSavedSuccess", "Level content saved successfully!")
                : tt("mapEditorMapSavedSuccessWithId", "Map saved successfully!{idPart}").replace(
                    "{idPart}",
                  effectiveMapId
                      ? tt("mapEditorMapSavedIdPart", " Map ID: {id}").replace(
                          "{id}",
                          effectiveMapId,
                        )
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
        } else if (createdVersionMapId && isLearner) {
          navigate(ROUTES.MAP_EDITOR, {
            replace: true,
            state: { mapId: createdVersionMapId, mode: "edit", roleContext: "learner" },
          });
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
  const registeredSaveHandlerRef = useRef<(() => Promise<void>) | undefined>(undefined);
  if (!registeredSaveHandlerRef.current) {
    registeredSaveHandlerRef.current = () => handleSaveLevelContentRef.current();
  }

  useEffect(() => {
    if (sectionMode !== "right" || !registerSaveLevelContent) return;
    registerSaveLevelContent(registeredSaveHandlerRef.current!);
  }, [registerSaveLevelContent, sectionMode]);

  useEffect(() => {
    onSavingLevelContentChange?.(savingLevelContent);
  }, [savingLevelContent, onSavingLevelContentChange]);

  return (
    <div style={styles.container}>
      {showRightPanel && (
        <div style={styles.rightPanelShell}>
          {!hideRightPanelTabBar && visibleRightTabs.length > 1 && (
            <div
              style={{
                ...styles.rightPanelTabBar,
                gridTemplateColumns: `repeat(${Math.max(visibleRightTabs.length, 1)}, minmax(0, 1fr))`,
              }}
              role="tablist"
              aria-label={tt("mapEditorRightPanelTabs", "Right panel sections")}
            >
              {visibleRightTabs.map((tab, index, arr) => {
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
          )}
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
                        <Layers size={16} />{" "}
                        {tt("mapEditorLayerVisibilityTitle", "Layer Visibility")}
                      </h3>
                      {editorStore ? (
                        <LayerPanel store={editorStore} hideTitle embedded />
                      ) : (
                        <p style={styles.helpText}>
                          {tt(
                            "mapEditorLayerVisibilityFallback",
                            "Open the editor with a map to use layer visibility.",
                          )}
                        </p>
                      )}
                    </div>
                  </>
                )}
                {rightPanelTab === "level" && (
                  <>
                    <div style={styles.section}>
                      <h3 style={styles.sectionTitle}>
                        <Pencil size={16} />{" "}
                        {tt("mapEditorLevelMapDetailTitle", "Level")}
                      </h3>
                      {typeof currentLevelIndex === "number" && onCurrentLevelIndexChange && (
                        <div style={styles.formGroup}>
                          <label style={styles.label}>
                            {tt("mapEditorCurrentLevel", "Current Level")}
                          </label>
                          <select
                            value={Math.max(0, Math.min(levelSlotCount - 1, currentLevelIndex))}
                            onChange={(e) => {
                              const nextIndex = Math.max(
                                0,
                                Math.min(levelSlotCount - 1, Number(e.target.value) || 0),
                              );
                              onCurrentLevelIndexChange(nextIndex);
                            }}
                            style={styles.select}
                          >
                            {Array.from({ length: levelSlotCount }, (_, idx) => (
                              <option key={`level-switch-${idx}`} value={idx}>
                                {tt("mapEditorLevelButton", "Level {n}").replace(
                                  "{n}",
                                  String(idx + 1),
                                )}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div style={styles.formGroup}>
                        <label style={styles.label}>{tt("mapEditorMapTypeMap", "Map Type")}</label>
                        <select
                          value={mapData.config.type}
                          onChange={(e) =>
                            onTypeChange?.(e.target.value as "platform" | "topdown" | "snake")
                          }
                          style={styles.select}
                        >
                          <option value="platform">
                            {tt("mapEditorGameTypePlatform", "Platform")}
                          </option>
                          <option value="topdown">
                            {tt("mapEditorGameTypeTopDown", "Top-down")}
                          </option>
                          <option value="snake">{tt("mapEditorGameTypeSnake", "Snake")}</option>
                        </select>
                      </div>
                      <div style={styles.mapInfoCard}>
                        <div style={styles.mapInfoRow}>
                          <span>{tt("mapEditorSize", "Size")}</span>
                          <strong>
                            {mapData.config.width} × {mapData.config.height}{" "}
                            {tt("mapEditorTiles", "tiles")}
                          </strong>
                        </div>
                        <div style={styles.mapInfoRow}>
                          <span>{tt("mapEditorTileSize", "Tile Size")}</span>
                          <strong>{mapData.config.tileSize}px</strong>
                        </div>
                      </div>
                      <div
                        style={{
                          ...styles.actionButtons,
                          flexDirection: "column",
                          alignItems: "stretch",
                          marginBottom: 16,
                        }}
                      >
                        <button
                          type="button"
                          style={styles.actionButton}
                          onClick={() => setShowResizeDialog(true)}
                        >
                          <Maximize2 size={14} /> {tt("mapEditorResizeMap", "Resize Map")}
                        </button>
                      </div>
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
                          {tt("mapEditorAllowedBlocksLabel", "Allowed Blocks:")}
                        </label>
                        <p style={styles.helpText}>
                          {tt(
                            "mapEditorAllowedBlocksHint2",
                            "Only selected blocks will be available to the player",
                          )}
                        </p>
                        <div style={styles.allowedBlocksToolbar}>
                          <span style={styles.allowedBlocksSelectedText}>
                            {tt(
                              "mapEditorAllowedBlocksSelectedCount",
                              "Selected {selected}/{total}",
                            )
                              .replace("{selected}", String(effectiveAllowedBlockTypes.length))
                              .replace("{total}", String(availableBlocks.length))}
                          </span>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={handleSelectAllBlocks}
                              disabled={
                                effectiveAllowedBlockTypes.length === availableBlocks.length ||
                                !onAllowedBlocksChange
                              }
                              style={{
                                ...styles.allowedBlocksUseAllButton,
                                ...(effectiveAllowedBlockTypes.length === availableBlocks.length ||
                                !onAllowedBlocksChange
                                  ? styles.allowedBlocksUseAllButtonDisabled
                                  : {}),
                              }}
                            >
                              {tt("mapEditorAllowedBlocksSelectAll", "Select all")}
                            </button>
                            <button
                              type="button"
                              onClick={handleClearToMandatoryBlocks}
                              disabled={isMandatoryOnlySelection || !onAllowedBlocksChange}
                              style={{
                                ...styles.allowedBlocksUseAllButton,
                                ...(isMandatoryOnlySelection || !onAllowedBlocksChange
                                  ? styles.allowedBlocksUseAllButtonDisabled
                                  : {}),
                              }}
                            >
                              {tt("mapEditorAllowedBlocksClearAll", "Deselect all")}
                            </button>
                          </div>
                        </div>

                        <div style={styles.allowedBlockGroups}>
                          {groupedAvailableBlocks.map(({ category, blocks }) => (
                            <div key={`allowed-block-group-${category}`} style={styles.allowedBlockGroupCard}>
                              <p style={styles.allowedBlockGroupTitle}>{toCategoryLabel(category)}</p>
                              <div style={styles.allowedBlockGrid}>
                                {blocks.map((block) => {
                                  const selected = effectiveAllowedBlockSet.has(block.type);
                                  const mandatory = mandatoryAllowedBlockSet.has(block.type);
                                  const accent =
                                    BLOCK_CATEGORY_ACCENTS[category] ?? BLOCK_CATEGORY_ACCENTS.other;

                                  return (
                                    <button
                                      key={`allowed-block-toggle-${block.type}`}
                                      type="button"
                                      onClick={() => handleToggleAllowedBlock(block.type)}
                                      disabled={!onAllowedBlocksChange}
                                      style={{
                                        ...styles.allowedBlockCell,
                                        ...(selected
                                          ? {
                                              ...styles.allowedBlockCellSelected,
                                              borderColor: accent,
                                              background: `color-mix(in srgb, ${accent} 18%, var(--surface))`,
                                            }
                                          : {}),
                                        ...(mandatory
                                          ? {
                                              cursor: "not-allowed",
                                              boxShadow:
                                                "inset 0 0 0 1px color-mix(in srgb, var(--text) 18%, transparent)",
                                            }
                                          : {}),
                                        ...(!onAllowedBlocksChange ? styles.allowedBlockCellDisabled : {}),
                                      }}
                                      title={
                                        mandatory
                                          ? tt(
                                              "mapEditorAllowedBlockAlwaysEnabled",
                                              "This block is always enabled for gameplay.",
                                            )
                                          : toBlockLabel(block.type)
                                      }
                                    >
                                      <span style={styles.allowedBlockCellLabel}>
                                        {toBlockLabel(block.type)}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
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
                    {showCatalogEditorInlineInMapTab ? (
                      userType === "unknown" ? (
                        <div style={styles.section}>
                          <h3 style={styles.sectionTitle}>
                            <Settings2 size={16} /> {tt("mapEditorMapSettings", "Map Settings")}
                          </h3>
                          <p style={styles.helpText}>
                            {tt(
                              "mapEditorLoginToSaveMaps",
                              "You must be logged in as a learner or CMS user to save maps",
                            )}
                          </p>
                        </div>
                      ) : (
                        <div style={styles.inlineMapInfoShell}>
                          <div style={styles.step1InlineCard}>
                            <div style={styles.detailLayout}>
                              <div style={styles.step1InlineLayout}>
                                <div style={styles.step1MediaColumn}>
                                  <button
                                    type="button"
                                    style={styles.step1HeroDropZone}
                                    onClick={() => avatarInputRef.current?.click()}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      const dropped = Array.from(e.dataTransfer.files ?? []);
                                      const firstImage = dropped.find((file) =>
                                        file.type.toLowerCase().startsWith("image/"),
                                      );
                                      if (firstImage) {
                                        setAvatarFile(firstImage);
                                      }
                                      appendGalleryFiles(
                                        firstImage
                                          ? dropped.filter((file) => file !== firstImage)
                                          : dropped,
                                      );
                                    }}
                                  >
                                    {resolvedAvatarPreviewUrl ? (
                                      <img
                                        src={resolvedAvatarPreviewUrl}
                                        alt={tt("mapEditorThumbnailWholeMapAlt", "Map thumbnail (whole map)")}
                                        style={styles.step1HeroImage}
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div style={styles.step1HeroPlaceholder}>
                                        <ImagePlus size={42} />
                                        <p style={styles.step1HeroPlaceholderText}> 
                                          {tt(
                                            "mapEditorGalleryHeroHint",
                                            "Drag screenshots or videos here, or click to add gallery media",
                                          )}
                                        </p>
                                      </div>
                                    )}
                                  </button>

                                  <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setAvatarFile(e.currentTarget.files?.[0] ?? null)}
                                    style={styles.fileInput}
                                  />

                                  <input
                                    ref={galleryInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    multiple
                                    style={styles.fileInput}
                                    onChange={(e) => {
                                      const list = Array.from(e.target.files ?? []);
                                      e.target.value = "";
                                      appendGalleryFiles(list);
                                    }}
                                  />

                                  <div style={styles.step1ThumbCarouselRow}>
                                    <button
                                      type="button"
                                      style={styles.step1ThumbNavButton}
                                      onClick={() => scrollGalleryStrip(-1)}
                                      aria-label={tt("previousAria", "Previous")}
                                    >
                                      <ChevronLeft size={20} />
                                    </button>

                                    <div style={styles.step1ThumbViewport}>
                                      <div ref={galleryStripRef} style={styles.step1ThumbStrip}>
                                        <button
                                          type="button"
                                          style={styles.step1ThumbItem}
                                          onClick={() => avatarInputRef.current?.click()}
                                          title={tt("mapEditorChangeImage", "Change Image")}
                                        >
                                          {resolvedAvatarPreviewUrl ? (
                                            <img
                                              src={resolvedAvatarPreviewUrl}
                                              alt={tt("mapEditorThumbnailWholeMapAlt", "Map thumbnail (whole map)")}
                                              style={styles.step1ThumbImage}
                                              referrerPolicy="no-referrer"
                                            />
                                          ) : (
                                            <span style={styles.step1ThumbPlaceholderText}>
                                              {tt("mapEditorGalleryCoverLabel", "COVER")}
                                            </span>
                                          )}
                                        </button>

                                        {pendingGalleryFiles.map((file, idx) => (
                                          <div key={`${file.name}-${file.size}-${idx}`} style={styles.step1ThumbItemWrap}>
                                            <button
                                              type="button"
                                              style={styles.step1ThumbItem}
                                              title={file.name}
                                            >
                                              {file.type.toLowerCase().startsWith("image/") ? (
                                                <img
                                                  src={pendingGalleryPreviewUrls[idx]}
                                                  alt={file.name}
                                                  style={styles.step1ThumbImage}
                                                />
                                              ) : (
                                                <span style={styles.step1ThumbPlaceholderText}>
                                                  {tt("mapEditorGalleryVideoLabel", "VIDEO")}
                                                </span>
                                              )}
                                            </button>
                                            <button
                                              type="button"
                                              style={styles.step1ThumbRemoveButton}
                                              onClick={() =>
                                                setPendingGalleryFiles((prev) =>
                                                  prev.filter((_, fileIndex) => fileIndex !== idx),
                                                )
                                              }
                                              aria-label={tt("mapEditorGalleryRemove", "Remove")}
                                            >
                                              <X size={14} />
                                            </button>
                                          </div>
                                        ))}

                                        <button
                                          type="button"
                                          style={{ ...styles.step1ThumbItem, ...styles.step1ThumbAddItem }}
                                          onClick={() => galleryInputRef.current?.click()}
                                          title={tt("mapEditorGalleryAddFiles", "Add files")}
                                        >
                                          <Plus size={24} />
                                        </button>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      style={styles.step1ThumbNavButton}
                                      onClick={() => scrollGalleryStrip(1)}
                                      aria-label={tt("nextAria", "Next")}
                                    >
                                      <ChevronRight size={20} />
                                    </button>
                                  </div>

                                  <p style={styles.helpText}>{thumbnailHintBelowImage}</p>
                                  <p style={styles.helpText}>
                                    {tt("mapEditorGalleryMaxFiles", "Up to {n} files per batch.").replace(
                                      "{n}",
                                      String(GALLERY_BATCH_MAX),
                                    )}
                                  </p>
                                </div>

                                <div style={styles.step1MetaColumn}>
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

                                  <div style={styles.formGroup}>
                                    <label style={styles.label}>
                                      {tt("mapEditorFreeTrialAttempts", "Free trial attempts")}
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={MAX_FREE_TRIAL_ATTEMPTS}
                                      value={normalizedFreeTrialAttemptLimit}
                                      onChange={(e) =>
                                        handleFreeTrialAttemptLimitInputChange(
                                          Number(e.target.value) || 0,
                                        )
                                      }
                                      style={styles.input}
                                    />
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
                                        max={MAX_MAP_PRICE}
                                        value={mapData.config.price}
                                        onChange={(e) =>
                                          handlePriceInputChange(Number(e.target.value))
                                        }
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
                                      ...styles.inlineFieldReadOnly,
                                    }}
                                    onMouseEnter={() => setHoveredInlineField("learnedTagsCsv")}
                                    onMouseLeave={() => setHoveredInlineField(null)}
                                  >
                                    <div style={styles.inlineFieldLabel}>
                                      {tt("mapEditorLearnedKnowledge", "Learned knowledge")}
                                    </div>
                                    {loadingMapTags ? (
                                      <p style={styles.helpText}>{tt("mapEditorLoadingTags", "Loading tags...")}</p>
                                    ) : (
                                      <div style={styles.tagWrap}>
                                        {selectedLearnedTagNames.length > 0 ? (
                                          selectedLearnedTagNames.map((name) => (
                                            <span
                                              key={`learned-${name}`}
                                              style={{ ...styles.tagChip, ...styles.tagChipSelected, ...styles.tagChipReadOnly }}
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
                                    <p style={styles.helpText}>
                                      {tt(
                                        "mapEditorLearnedKnowledgeAutoHint",
                                        "Auto-selected from blocks configured in Step 4.",
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      )
                    ) : (
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
                      </div>
                    )}
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
                        max={MAX_MAP_PRICE}
                        value={mapData.config.price}
                        onChange={(e) => handlePriceInputChange(Number(e.target.value))}
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
                      ...styles.inlineFieldReadOnly,
                    }}
                    onMouseEnter={() => setHoveredInlineField("learnedTagsCsv")}
                    onMouseLeave={() => setHoveredInlineField(null)}
                  >
                    <div style={styles.inlineFieldLabel}>
                      {tt("mapEditorLearnedKnowledge", "Learned knowledge")}
                    </div>
                    {loadingMapTags ? (
                      <p style={styles.helpText}>
                        {tt("mapEditorLoadingTags", "Loading tags...")}
                      </p>
                    ) : (
                      <div style={styles.tagWrap}>
                        {selectedLearnedTagNames.length > 0 ? (
                          selectedLearnedTagNames.map((name) => (
                            <span
                              key={`learned-${name}`}
                              style={{ ...styles.tagChip, ...styles.tagChipSelected, ...styles.tagChipReadOnly }}
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
                    <p style={styles.helpText}>
                      {tt(
                        "mapEditorLearnedKnowledgeAutoHint",
                        "Auto-selected from blocks configured in Step 4.",
                      )}
                    </p>
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

      {showRightPanel && userType !== "unknown" && !showCatalogEditorInlineInMapTab && (
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
          onPriceChange={(p) => onPriceChange?.(clampMapPrice(p))}
          freeTrialAttemptLimit={normalizedFreeTrialAttemptLimit}
          onFreeTrialAttemptLimitChange={(v) =>
            onFreeTrialAttemptLimitChange?.(clampFreeTrialAttemptLimit(v))
          }
          loadingMapTags={loadingMapTags}
          availableMapTags={availableMapTags}
          learnedKnowledgeTags={learnedKnowledgeTags}
          selectedTagIds={selectedTagIds}
          selectedLearnedTagIds={selectedLearnedTagIds}
          onToggleTag={toggleTagSelection}
          onToggleLearnedTag={() => {}}
          learnedKnowledgeReadOnly
          avatarPreviewUrl={resolvedAvatarPreviewUrl}
          avatarFile={avatarFile}
          onAvatarFileChange={setAvatarFile}
          galleryFiles={pendingGalleryFiles}
          onGalleryFilesAdd={(next) => setPendingGalleryFiles(next)}
          onGalleryFileRemove={(i) =>
            setPendingGalleryFiles((prev) => prev.filter((_, j) => j !== i))
          }
          galleryMaxFiles={GALLERY_BATCH_MAX}
          onSaveToServer={(saveOptions) =>
            void handleSaveLevelContent({
              skipConfirm: true,
              catalogSaveMode: catalogSaveMode,
              redirectAfterSave: true,
              submitForReview: Boolean(saveOptions?.submitForReview),
            })
          }
          allowSubmitForReview={isLearner && canSubmitForReview}
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
    minHeight: 68,
    padding: 0,
    margin: 0,
    fontSize: 12,
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
    gap: 8,
    width: "100%",
    minWidth: 0,
    padding: "10px 8px",
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
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: 1.2,
    fontSize: 12,
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
  inlineMapInfoShell: {
    display: "grid",
    gap: "12px",
  },
  step1InlineCard: {
    width: "100%",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    background:
      "radial-gradient(circle at top right, rgba(37, 99, 235, 0.12), transparent 35%), linear-gradient(180deg, var(--surface), var(--surface-2))",
    padding: "18px",
    boxSizing: "border-box",
    overflow: "visible",
  },
  step1InlineLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
    gap: "16px",
    alignItems: "start",
  },
  step1MediaColumn: {
    display: "grid",
    gap: "12px",
  },
  step1MetaColumn: {
    display: "grid",
    gap: "10px",
  },
  step1HeroDropZone: {
    width: "100%",
    minHeight: "360px",
    height: "clamp(360px, 48vh, 560px)",
    borderRadius: "10px",
    border: "1px dashed color-mix(in srgb, var(--primary) 36%, var(--border))",
    background: "linear-gradient(180deg, var(--surface), color-mix(in srgb, var(--surface) 92%, #dbe7f7))",
    color: "var(--text-2)",
    padding: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  step1HeroImage: {
    width: "100%",
    height: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    objectPosition: "center",
    background: "color-mix(in srgb, var(--surface-2) 85%, #dbe7f7)",
    borderRadius: "8px",
  },
  step1HeroPlaceholder: {
    width: "100%",
    minHeight: "220px",
    borderRadius: "8px",
    border: "1px dashed var(--border)",
    background: "color-mix(in srgb, var(--surface-2) 86%, #dbe7f7)",
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    gap: "10px",
    padding: "20px",
  },
  step1HeroPlaceholderText: {
    margin: 0,
    fontSize: "14px",
    color: "var(--text-2)",
    maxWidth: "640px",
  },
  step1ThumbCarouselRow: {
    display: "grid",
    gridTemplateColumns: "42px minmax(0, 1fr) 42px",
    alignItems: "center",
    gap: "8px",
  },
  step1ThumbNavButton: {
    height: "124px",
    borderRadius: "6px",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text-2)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
  },
  step1ThumbViewport: {
    overflow: "hidden",
  },
  step1ThumbStrip: {
    display: "flex",
    gap: "10px",
    overflowX: "auto",
    paddingBottom: "2px",
    scrollbarWidth: "none",
  },
  step1ThumbItemWrap: {
    position: "relative",
    flex: "0 0 auto",
  },
  step1ThumbItem: {
    flex: "0 0 auto",
    width: "92px",
    height: "120px",
    borderRadius: "8px",
    border: "1px dashed var(--border)",
    background: "var(--surface-2)",
    color: "var(--text-2)",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    overflow: "hidden",
    padding: 0,
  },
  step1ThumbAddItem: {
    borderStyle: "dashed",
    borderColor: "color-mix(in srgb, var(--primary) 40%, var(--border))",
    color: "var(--primary)",
    background: "color-mix(in srgb, var(--primary) 8%, var(--surface-2))",
  },
  step1ThumbImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    objectPosition: "center",
    background: "color-mix(in srgb, var(--surface-2) 88%, #dbe7f7)",
    display: "block",
  },
  step1ThumbPlaceholderText: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
  },
  step1ThumbRemoveButton: {
    position: "absolute",
    top: "4px",
    right: "4px",
    width: "22px",
    height: "22px",
    borderRadius: "999px",
    border: "1px solid color-mix(in srgb, var(--danger) 45%, var(--border))",
    background: "color-mix(in srgb, var(--surface) 80%, var(--danger))",
    color: "var(--danger)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    padding: 0,
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
  allowedBlocksToolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    marginBottom: "8px",
    flexWrap: "wrap",
  },
  allowedBlocksSelectedText: {
    fontSize: "12px",
    color: "var(--text-2)",
    fontWeight: 600,
  },
  allowedBlocksUseAllButton: {
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text)",
    borderRadius: "8px",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  allowedBlocksUseAllButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  allowedBlockGroups: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  allowedBlockGroupCard: {
    border: "1px solid var(--border)",
    borderRadius: "10px",
    background: "var(--surface-2)",
    padding: "10px",
  },
  allowedBlockGroupTitle: {
    margin: "0 0 8px 0",
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "0.02em",
    textTransform: "uppercase",
  },
  allowedBlockGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "8px",
  },
  allowedBlockCell: {
    border: "1px solid var(--border)",
    borderRadius: "10px",
    background: "var(--surface)",
    color: "var(--text-2)",
    padding: "10px 8px",
    minHeight: "40px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    textAlign: "left",
  },
  allowedBlockCellSelected: {
    color: "var(--text)",
    boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--surface) 40%, transparent)",
  },
  allowedBlockCellDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  allowedBlockCellLabel: {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    lineHeight: 1.25,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
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
    background:
      "linear-gradient(135deg, var(--bg), color-mix(in srgb, var(--bg) 80%, var(--surface)))",
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
  inlineFieldReadOnly: {
    cursor: "default",
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
  tagChipReadOnly: {
    cursor: "default",
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
