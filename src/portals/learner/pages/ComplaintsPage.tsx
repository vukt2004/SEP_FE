import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { learnerComplaintsApi } from "@/services/api/learner/complaints.api";
import type { ComplaintItem, ComplaintStatus } from "@/types/api/complaints";
import type {
  ComplaintCategoryConfigItem,
  CreateComplaintRequest,
  CreateComplaintResponse,
} from "@/types/api/learner/complaints";
import { ComplaintStatusBadge } from "@/shared/components/complaints/ComplaintStatusBadge";
import { AlertToast } from "@/shared/components/AlertToast";
import { validateCreateComplaintForm } from "@/shared/components/complaints/complaint.utils";
import {
  Search,
  SlidersHorizontal,
  Ticket,
  Hourglass,
  CheckCircle2,
  ChevronsUpDown,
  Upload,
  Copy,
  X,
  ArrowLeft,
  Eye,
  Plus,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/translations";
import { ROUTES } from "@/lib/constants/routes";

const pageSize = 10;

const DEFAULT_COMPLAINT_CATEGORIES = [
  {
    categoryKey: "PaymentIssue",
    sortOrder: 10,
  },
  {
    categoryKey: "AccessIssue",
    sortOrder: 20,
  },
  {
    categoryKey: "GameplayScoringIssue",
    sortOrder: 30,
  },
  {
    categoryKey: "RewardBalanceIssue",
    sortOrder: 40,
  },
  {
    categoryKey: "TrialIssue",
    sortOrder: 50,
  },
];

const CATEGORY_CONTEXT_REQUIREMENTS: Record<string, string[]> = {
  PaymentIssue: ["paymentRecordId", "mapId", "packageId"],
  AccessIssue: ["mapId", "packageId"],
  GameplayScoringIssue: ["submissionId", "playHistoryId"],
  RewardBalanceIssue: ["xpTransactionId", "orbitCoinTransactionId", "submissionId", "mapId"],
  TrialIssue: ["mapId", "playHistoryId"],
};

function normalizeCategoryOptions(items: ComplaintCategoryConfigItem[] | null | undefined) {
  if (!items) return [] as ComplaintCategoryConfigItem[];
  return items
    .filter((item) => item.isEnabled)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));
}

function hasContextValue(context: CreateComplaintRequest["context"], field: string) {
  const raw = context[field as keyof typeof context];
  return typeof raw === "string" && raw.trim().length > 0;
}

function trimOrUndefined(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function getContextLabel(t: (key: string) => string, key: string) {
  const translated = t(`complaints.contextLabel.${key}`);
  return translated === `complaints.contextLabel.${key}` ? key : translated;
}

function getGameContextDisplayName(context: CreateComplaintRequest["context"]) {
  const gameName = context.gameId?.trim() ?? "";
  const mapId = context.mapId?.trim() ?? "";
  if (!gameName || !mapId || gameName === mapId) return "";
  return gameName;
}

function getContextPresentation(
  t: (key: string) => string,
  locale: string,
  context: CreateComplaintRequest["context"],
  field: string,
) {
  const rawValue = (context[field as keyof typeof context] as string) ?? "";
  const gameDisplayName = getGameContextDisplayName(context);

  if ((field === "mapId" || field === "gameId") && gameDisplayName) {
    return {
      label: locale.startsWith("vi") ? "Tên trò chơi" : "Game name",
      value: gameDisplayName,
      preserveFullValue: true,
    };
  }

  return {
    label: getContextLabel(t, field),
    value: rawValue,
    preserveFullValue: false,
  };
}

function getCategoryDisplayName(
  t: (key: string) => string,
  item: ComplaintCategoryConfigItem | null,
) {
  if (!item) return "";
  const translated = t(`complaints.runtimeCategory.${item.categoryKey}.displayName`);
  return translated === `complaints.runtimeCategory.${item.categoryKey}.displayName`
    ? item.displayName
    : translated;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatContextDisplayValue(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 18) return trimmed;
  const guidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed);
  if (guidLike) return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
  return `${trimmed.slice(0, 12)}...${trimmed.slice(-6)}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatVietnamDateTimeLocal(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function getVietnamNowDateTimeLocal() {
  return formatVietnamDateTimeLocal(new Date());
}

function normalizeDateTimeLocalInput(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return formatVietnamDateTimeLocal(parsed);
}

function getComplaintContextSummary(t: (key: string) => string, item: ComplaintItem) {
  const displayTitle = item.contextResolved?.displayTitle?.trim();
  const displaySubtitle = item.contextResolved?.displaySubtitle?.trim();
  const referenceCode = item.contextResolved?.referenceCode?.trim();
  const parts = [displayTitle, displaySubtitle, referenceCode].filter((value): value is string =>
    Boolean(value),
  );
  if (parts.length > 0) return parts.join(" • ");

  if (item.contextType || item.contextId) {
    const idSuffix = item.contextId ? ` #${item.contextId.slice(0, 8)}` : "";
    return `${item.contextType || t("complaints.context.unresolved")}${idSuffix}`;
  }

  if (item.categoryKey) return item.categoryKey;
  return t("complaints.context.none");
}

export default function ComplaintsPage() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryToken, setRetryToken] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [createdComplaint, setCreatedComplaint] = useState<CreateComplaintResponse | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createForm, setCreateForm] = useState<CreateComplaintRequest>({
    subject: "",
    categoryKey: "",
    description: "",
    context: {
      paymentRecordId: "",
      gameId: "",
      mapId: "",
      packageId: "",
      submissionId: "",
      playHistoryId: "",
      xpTransactionId: "",
      orbitCoinTransactionId: "",
      occurredAt: getVietnamNowDateTimeLocal(),
    },
  });
  const [categoryOptions, setCategoryOptions] = useState<ComplaintCategoryConfigItem[]>([]);
  const [categoryOptionsLoading, setCategoryOptionsLoading] = useState(false);
  const [categoryOptionsError, setCategoryOptionsError] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState<string[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [copiedContextField, setCopiedContextField] = useState("");
  const [isUploadHover, setIsUploadHover] = useState(false);
  const [isSubmitHovered, setIsSubmitHovered] = useState(false);
  const [keywordInput, setKeywordInput] = useState(searchParams.get("keyword") ?? "");
  const [isKeywordComposing, setIsKeywordComposing] = useState(false);
  const [sortBy, setSortBy] = useState<"id" | "subject" | "category" | "createdAt" | "status">(
    "createdAt",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const pageNumber = Number(searchParams.get("pageNumber") || "1");
  const status = (searchParams.get("status") as ComplaintStatus | null) ?? "";
  const keyword = searchParams.get("keyword") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const isCreateRoute = location.pathname.endsWith("/complaints/new");

  const updateQuery = useCallback(
    (key: string, value: string) => {
      setSearchParams((p) => {
        p.set("pageNumber", "1");
        if (value) p.set(key, value);
        else p.delete(key);
        return p;
      });
    },
    [setSearchParams],
  );

  const fallbackCategoryOptions = useMemo<ComplaintCategoryConfigItem[]>(
    () =>
      DEFAULT_COMPLAINT_CATEGORIES.map((item) => ({
        categoryKey: item.categoryKey,
        displayName: t(`complaints.runtimeCategory.${item.categoryKey}.displayName`),
        description: t(`complaints.runtimeCategory.${item.categoryKey}.description`),
        isEnabled: true,
        sortOrder: item.sortOrder,
        requiredAnyContextFields: CATEGORY_CONTEXT_REQUIREMENTS[item.categoryKey] ?? [],
        allowManualContextInput: false,
      })),
    [t],
  );

  useEffect(() => {
    setKeywordInput(keyword);
  }, [keyword]);

  useEffect(() => {
    if (isKeywordComposing) return;
    const timeout = window.setTimeout(() => {
      updateQuery("keyword", keywordInput.normalize("NFC"));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [isKeywordComposing, keywordInput, updateQuery]);

  // No auto-dismiss for createSuccess — we now show a full success screen

  useEffect(() => {
    const prefillToken = searchParams.get("prefill") || "";
    if (!prefillToken) return;

    const prefillCategoryKey = searchParams.get("categoryKey") || "";
    const prefillSubject = searchParams.get("subject") || "";
    const prefillDescription = searchParams.get("description") || "";
    const prefillOpenCreate = searchParams.get("openCreate") === "1";

    const prefillContext = {
      paymentRecordId: searchParams.get("paymentRecordId") || "",
      gameId:
        searchParams.get("gameName") ||
        searchParams.get("gameId") ||
        searchParams.get("mapId") ||
        "",
      mapId: searchParams.get("mapId") || searchParams.get("gameId") || "",
      packageId: searchParams.get("packageId") || "",
      submissionId: searchParams.get("submissionId") || "",
      playHistoryId: searchParams.get("playHistoryId") || "",
      xpTransactionId: searchParams.get("xpTransactionId") || "",
      orbitCoinTransactionId: searchParams.get("orbitCoinTransactionId") || "",
      occurredAt: normalizeDateTimeLocalInput(searchParams.get("occurredAt") || ""),
    };

    setCreateForm((prev) => ({
      subject: prefillSubject || prev.subject,
      categoryKey: prefillCategoryKey || prev.categoryKey,
      description: prefillDescription || prev.description,
      context: {
        paymentRecordId: prefillContext.paymentRecordId || prev.context.paymentRecordId || "",
        gameId: prefillContext.gameId || prev.context.gameId || prev.context.mapId || "",
        mapId: prefillContext.mapId || prev.context.mapId || "",
        packageId: prefillContext.packageId || prev.context.packageId || "",
        submissionId: prefillContext.submissionId || prev.context.submissionId || "",
        playHistoryId: prefillContext.playHistoryId || prev.context.playHistoryId || "",
        xpTransactionId: prefillContext.xpTransactionId || prev.context.xpTransactionId || "",
        orbitCoinTransactionId:
          prefillContext.orbitCoinTransactionId || prev.context.orbitCoinTransactionId || "",
        occurredAt:
          prefillContext.occurredAt || prev.context.occurredAt || getVietnamNowDateTimeLocal(),
      },
    }));

    if (prefillOpenCreate && !isCreateRoute) {
      navigate(`${ROUTES.LEARNER_COMPLAINTS_NEW}?${searchParams.toString()}`, { replace: true });
      return;
    }
  }, [isCreateRoute, navigate, searchParams]);

  useEffect(() => {
    const previewUrls = attachments.map((file) => URL.createObjectURL(file));
    setAttachmentPreviewUrls(previewUrls);
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [attachments]);

  useEffect(() => {
    let mounted = true;

    async function loadCategoryOptions() {
      try {
        setCategoryOptionsLoading(true);
        setCategoryOptionsError("");

        const learnerResult = await learnerComplaintsApi.getCategoryConfigs().catch(() => null);
        const learnerItems = normalizeCategoryOptions(learnerResult?.data?.data);
        if (learnerItems.length > 0) {
          if (mounted) setCategoryOptions(learnerItems);
          return;
        }

        if (mounted) {
          setCategoryOptions(fallbackCategoryOptions);
          setCategoryOptionsError(t("complaints.category.fallbackMessage"));
        }
      } finally {
        if (mounted) setCategoryOptionsLoading(false);
      }
    }

    loadCategoryOptions();
    return () => {
      mounted = false;
    };
  }, [fallbackCategoryOptions, t]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        setLoading(true);
        setError("");
        const first = await learnerComplaintsApi.getComplaints({ pageNumber: 1, pageSize: 100 });
        if (!mounted) return;
        if (!first.data.isSuccess || !first.data.data) {
          setError(first.data.message || t("complaints.failedLoad"));
          return;
        }
        let all = [...first.data.data.items];
        const pages = first.data.data.totalPages || 1;
        if (pages > 1) {
          const rest = await Promise.all(
            Array.from({ length: pages - 1 }, (_, idx) =>
              learnerComplaintsApi.getComplaints({ pageNumber: idx + 2, pageSize: 100 }),
            ),
          );
          rest.forEach((res) => {
            if (res.data.isSuccess && res.data.data) all = all.concat(res.data.data.items);
          });
        }
        if (!mounted) return;
        setItems(all);
      } catch {
        if (!mounted) return;
        setError(t("complaints.failedLoad"));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [retryToken, t]);

  const filteredItems = useMemo(() => {
    const keywordNorm = normalizeText(keyword);
    return items.filter((item) => {
      if (status && item.complaintStatus !== status) return false;
      if (dateFrom && new Date(item.createdAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(item.createdAt) > new Date(`${dateTo}T23:59:59`)) return false;
      if (keywordNorm) {
        const haystack = normalizeText(
          [
            item.subject,
            item.category,
            item.categoryKey,
            item.contextType || "",
            item.contextResolved?.displayTitle || "",
            item.contextResolved?.displaySubtitle || "",
            item.contextResolved?.referenceCode || "",
          ].join(" "),
        );
        if (!haystack.includes(keywordNorm)) return false;
      }
      return true;
    });
  }, [dateFrom, dateTo, items, keyword, status]);

  const pendingCount = useMemo(
    () =>
      filteredItems.filter(
        (x) => x.complaintStatus === "Open" || x.complaintStatus === "InProgress",
      ).length,
    [filteredItems],
  );
  const solvedCount = useMemo(
    () => filteredItems.filter((x) => x.complaintStatus === "Resolved").length,
    [filteredItems],
  );
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      let va = "";
      let vb = "";
      if (sortBy === "id") {
        va = a.id;
        vb = b.id;
      } else if (sortBy === "subject") {
        va = a.subject;
        vb = b.subject;
      } else if (sortBy === "category") {
        va = a.category;
        vb = b.category;
      } else if (sortBy === "status") {
        va = a.complaintStatus;
        vb = b.complaintStatus;
      } else {
        va = a.createdAt;
        vb = b.createdAt;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredItems, sortBy, sortDir]);
  const pagedItems = useMemo(
    () => sortedItems.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    [pageNumber, sortedItems],
  );
  const empty = useMemo(
    () => !loading && !error && pagedItems.length === 0,
    [error, loading, pagedItems.length],
  );
  const activeCategory = useMemo(
    () => categoryOptions.find((item) => item.categoryKey === createForm.categoryKey) ?? null,
    [categoryOptions, createForm.categoryKey],
  );

  const requiredAnyContextFields = useMemo(
    () =>
      activeCategory?.requiredAnyContextFields ??
      CATEGORY_CONTEXT_REQUIREMENTS[createForm.categoryKey] ??
      [],
    [activeCategory?.requiredAnyContextFields, createForm.categoryKey],
  );

  const allowManualContextInput = useMemo(
    () => activeCategory?.allowManualContextInput ?? false,
    [activeCategory?.allowManualContextInput],
  );

  const hasAnyRequiredContextValue = useMemo(
    () => requiredAnyContextFields.some((field) => hasContextValue(createForm.context, field)),
    [createForm.context, requiredAnyContextFields],
  );

  const prefilledContextEntries = useMemo(
    () =>
      requiredAnyContextFields
        .map((field) => ({
          field,
          value:
            (createForm.context[field as keyof CreateComplaintRequest["context"]] as string) ?? "",
        }))
        .filter((item) => item.value.trim().length > 0),
    [createForm.context, requiredAnyContextFields],
  );

  const showOccurredAtInput = useMemo(
    () => allowManualContextInput || prefilledContextEntries.length > 0,
    [allowManualContextInput, prefilledContextEntries.length],
  );

  const detailsStepDone = useMemo(
    () => createForm.subject.trim().length > 0 && createForm.categoryKey.trim().length > 0,
    [createForm.categoryKey, createForm.subject],
  );

  const descriptionStepDone = useMemo(
    () => createForm.description.trim().length >= 20,
    [createForm.description],
  );

  const contextStepDone = useMemo(() => {
    if (requiredAnyContextFields.length === 0) return true;
    if (allowManualContextInput) return true;
    return hasAnyRequiredContextValue;
  }, [allowManualContextInput, hasAnyRequiredContextValue, requiredAnyContextFields.length]);

  const submitReady = detailsStepDone && descriptionStepDone && contextStepDone;
  const hasSelectedCategory = createForm.categoryKey.trim().length > 0;
  const createButtonDisabled =
    creating ||
    !submitReady ||
    !createForm.description.trim() ||
    !!attachmentError ||
    categoryOptionsLoading;

  const copyContextValue = async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedContextField(field);
      window.setTimeout(() => {
        setCopiedContextField((prev) => (prev === field ? "" : prev));
      }, 1300);
    } catch {
      // Ignore clipboard failures silently.
    }
  };

  const missingFieldLabels = useMemo(() => {
    const missing: string[] = [];

    if (!createForm.subject.trim()) missing.push(t("complaints.subject"));
    if (!createForm.categoryKey.trim()) missing.push(t("complaints.category"));
    if (!createForm.description.trim()) {
      missing.push(t("complaints.description"));
    } else if (createForm.description.trim().length < 20) {
      missing.push(t("complaints.progress.descriptionTooShort"));
    }

    if (requiredAnyContextFields.length > 0 && !contextStepDone) {
      missing.push(...requiredAnyContextFields.map((field) => getContextLabel(t, field)));
    }

    return missing;
  }, [
    contextStepDone,
    createForm.categoryKey,
    createForm.description,
    createForm.subject,
    requiredAnyContextFields,
    t,
  ]);

  const submitHelperText = useMemo(() => {
    if (creating) return t("complaints.progress.submitting");
    if (submitReady) return t("complaints.progress.ready");
    if (missingFieldLabels.length === 0) return t("complaints.progress.notReady");
    return t("complaints.progress.missingFields").replace(
      "{fields}",
      missingFieldLabels.join(", "),
    );
  }, [creating, missingFieldLabels, submitReady, t]);

  function handleAttachmentChange(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const nextFiles = Array.from(fileList);
    const accepted: File[] = [];
    const rejected: string[] = [];
    nextFiles.forEach((file) => {
      const isAllowedType = /^image\/(png|jpe?g|gif|webp)$/i.test(file.type);
      const isAllowedSize = file.size <= 5 * 1024 * 1024;
      if (isAllowedType && isAllowedSize) {
        accepted.push(file);
      } else {
        rejected.push(file.name);
      }
    });
    setAttachments((prev) => [...prev, ...accepted].slice(0, 5));
    setAttachmentError(
      rejected.length > 0
        ? t("complaints.attachments.invalidFiles").replace("{count}", String(rejected.length))
        : "",
    );
  }

  function goToPage(nextPage: number) {
    setSearchParams((p) => {
      p.set("pageNumber", String(Math.min(Math.max(1, nextPage), totalPages)));
      return p;
    });
  }

  function handleSort(column: "id" | "subject" | "category" | "createdAt" | "status") {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDir("asc");
  }

  function getPaginationItems(current: number, total: number): Array<number | "..."> {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
    if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "...", current - 1, current, current + 1, "...", total];
  }

  function getComplaintRoute(item: ComplaintItem) {
    return ROUTES.LEARNER_COMPLAINT_DETAIL(item.id);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateCreateComplaintForm(
      {
        ...createForm,
        requiredAnyContextFields,
      },
      {
        subjectRequired: t("complaints.validation.subjectRequired"),
        subjectMax: (limit) =>
          t("complaints.validation.subjectMax").replace("{limit}", String(limit)),
        categoryRequired: t("complaints.validation.categoryRequired"),
        categoryKeyMax: (limit) =>
          t("complaints.validation.categoryKeyMax").replace("{limit}", String(limit)),
        descriptionRequired: t("complaints.validation.descriptionRequired"),
        descriptionMax: (limit) =>
          t("complaints.validation.descriptionMax").replace("{limit}", String(limit)),
        contextRequiredAny: (labels) =>
          t("complaints.validation.contextRequiredAny").replace(
            "{fields}",
            labels.map((field) => getContextLabel(t, field)).join(", "),
          ),
      },
    );
    setFieldErrors(errors);
    setCreateError("");
    setCreateSuccess("");
    if (Object.keys(errors).length > 0) return;
    try {
      setCreating(true);
      const payload: CreateComplaintRequest = {
        subject: createForm.subject.trim(),
        categoryKey: createForm.categoryKey,
        description: createForm.description.trim(),
        context: {
          paymentRecordId: trimOrUndefined(createForm.context.paymentRecordId || ""),
          mapId: trimOrUndefined(createForm.context.mapId || ""),
          packageId: trimOrUndefined(createForm.context.packageId || ""),
          submissionId: trimOrUndefined(createForm.context.submissionId || ""),
          playHistoryId: trimOrUndefined(createForm.context.playHistoryId || ""),
          xpTransactionId: trimOrUndefined(createForm.context.xpTransactionId || ""),
          orbitCoinTransactionId: trimOrUndefined(createForm.context.orbitCoinTransactionId || ""),
          occurredAt: createForm.context.occurredAt
            ? new Date(createForm.context.occurredAt).toISOString()
            : undefined,
        },
        attachments,
      };
      const res = await learnerComplaintsApi.createComplaint(payload);
      if (!res.data.isSuccess) {
        setCreateError(res.data.message || t("complaints.failedCreate"));
        return;
      }
      // Store created complaint data for the success screen
      if (res.data.data) {
        setCreatedComplaint(res.data.data);
      }
      setCreateForm({
        subject: "",
        categoryKey: "",
        description: "",
        context: {
          paymentRecordId: "",
          gameId: "",
          mapId: "",
          packageId: "",
          submissionId: "",
          playHistoryId: "",
          xpTransactionId: "",
          orbitCoinTransactionId: "",
          occurredAt: getVietnamNowDateTimeLocal(),
        },
      });
      setAttachments([]);
      setAttachmentError("");
      setCreateSuccess(res.data.message || t("complaints.createSuccess"));
      setRetryToken((x) => x + 1);
    } catch (err) {
      if (isAxiosError(err)) {
        const messageFromApi = (err.response?.data as { message?: string } | undefined)?.message;
        setCreateError(messageFromApi || err.message || t("complaints.failedCreate"));
      } else {
        setCreateError(t("complaints.failedCreate"));
      }
    } finally {
      setCreating(false);
    }
  }

  const createUi = {
    panel: {
      border: "none",
      borderRadius: 0,
      padding: 0,
      overflow: "visible",
      background: "transparent",
      boxShadow: "none",
    },
    panelHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "0 0 16px",
      borderBottom: "1px solid var(--border)",
      background: "transparent",
    },
    panelTitleWrap: {
      display: "grid",
      gap: 2,
    },
    panelTitle: {
      margin: 0,
      fontWeight: 700,
      fontSize: 24,
      color: "var(--text)",
    },
    panelSubtitle: {
      margin: 0,
      fontSize: 13,
      color: "var(--text-2)",
      fontWeight: 500,
    },
    toggleBtn: {
      border: "1px solid color-mix(in srgb, var(--border) 86%, #cbd5e1)",
      borderRadius: 10,
      padding: "8px 10px",
      fontWeight: 600,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
    },
    formBody: {
      display: "grid",
      gap: 18,
      padding: "18px 0 0",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "minmax(0, 920px)",
      justifyContent: "center",
      gap: 28,
      alignItems: "start" as const,
    },
    formColumn: {
      display: "grid",
      gap: 18,
      alignContent: "start" as const,
    },
    card: {
      border: "none",
      borderRadius: 0,
      padding: 0,
      background: "transparent",
      display: "grid",
      gap: 12,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 700,
      color: "var(--text)",
      letterSpacing: 0,
      marginBottom: 2,
    },
    twoCol: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      gap: 12,
      alignItems: "start" as const,
    },
    field: {
      display: "grid",
      gap: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: 700,
      color: "var(--text)",
    },
    control: {
      border: "1px solid color-mix(in srgb, var(--border) 92%, #cbd5e1)",
      borderRadius: 9,
      padding: "11px 12px",
      background: "var(--surface)",
      color: "var(--text)",
      boxShadow: "none",
    },
    helper: {
      minHeight: 18,
      fontSize: 13,
      color: "var(--text-2)",
    },
    errorText: {
      color: "var(--danger)",
      fontSize: 12,
    },
    warningText: {
      color: "#d97706",
      fontSize: 12,
    },
    submitRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      paddingTop: 10,
    },
    submitBtn: {
      border: "none",
      borderRadius: 12,
      padding: "11px 20px",
      background: "var(--primary)",
      color: "white",
      fontWeight: 700,
      boxShadow: "0 4px 10px color-mix(in srgb, var(--primary) 22%, transparent)",
      transition: "transform 160ms ease, box-shadow 180ms ease, filter 180ms ease",
    },
  };

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        maxWidth: isCreateRoute ? 1080 : undefined,
        margin: isCreateRoute ? "0 auto" : undefined,
        background: isCreateRoute ? "color-mix(in srgb, var(--surface) 96%, white 4%)" : undefined,
        border: isCreateRoute
          ? "1px solid color-mix(in srgb, var(--border) 80%, #cbd5e1)"
          : undefined,
        borderRadius: isCreateRoute ? 16 : undefined,
        padding: isCreateRoute ? "20px 24px 18px" : undefined,
        boxShadow: isCreateRoute ? "0 10px 24px rgba(15, 23, 42, 0.08)" : undefined,
      }}
    >
      {createError ? (
        <AlertToast type="error" message={createError} onClose={() => setCreateError("")} />
      ) : null}

      {!isCreateRoute ? <h1 style={{ margin: 0 }}>{t("complaints.mySupportTickets")}</h1> : null}

      {!isCreateRoute ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              border: "1px solid color-mix(in srgb, #3b82f6 28%, var(--border))",
              borderRadius: 12,
              background:
                "linear-gradient(140deg, color-mix(in srgb, #3b82f6 10%, var(--surface)) 0%, var(--surface) 70%)",
              padding: 14,
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(99, 102, 241, 0.12)",
                color: "#6366f1",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Ticket size={18} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{totalItems}</div>
              <div style={{ color: "var(--text-2)", fontSize: 13 }}>
                {t("complaints.totalTickets")}
              </div>
            </div>
          </div>
          <div
            style={{
              border: "1px solid color-mix(in srgb, #f59e0b 32%, var(--border))",
              borderRadius: 12,
              background:
                "linear-gradient(140deg, color-mix(in srgb, #f59e0b 12%, var(--surface)) 0%, var(--surface) 70%)",
              padding: 14,
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(245, 158, 11, 0.13)",
                color: "#d97706",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Hourglass size={18} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{pendingCount}</div>
              <div style={{ color: "var(--text-2)", fontSize: 13 }}>
                {t("complaints.pendingTickets")}
              </div>
            </div>
          </div>
          <div
            style={{
              border: "1px solid color-mix(in srgb, #22c55e 28%, var(--border))",
              borderRadius: 12,
              background:
                "linear-gradient(140deg, color-mix(in srgb, #22c55e 10%, var(--surface)) 0%, var(--surface) 70%)",
              padding: 14,
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(34, 197, 94, 0.13)",
                color: "#16a34a",
                display: "grid",
                placeItems: "center",
              }}
            >
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{solvedCount}</div>
              <div style={{ color: "var(--text-2)", fontSize: 13 }}>
                {t("complaints.solvedTickets")}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isCreateRoute && createdComplaint ? (
        <section
          style={{
            display: "grid",
            gap: 0,
            maxWidth: 680,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {/* Success animation circle */}
          <div
            style={{
              display: "grid",
              placeItems: "center",
              paddingTop: 24,
              paddingBottom: 8,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 8px 32px rgba(34, 197, 94, 0.3), 0 2px 8px rgba(34, 197, 94, 0.2)",
                animation: "successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
              }}
            >
              <CheckCircle2 size={40} color="white" strokeWidth={2.5} />
            </div>
          </div>

          {/* Title */}
          <div style={{ textAlign: "center", padding: "12px 16px 4px" }}>
            <h2
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 800,
                color: "var(--text)",
                lineHeight: 1.3,
              }}
            >
              {createSuccess || t("complaints.createSuccess")}
            </h2>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 14,
                color: "var(--text-2)",
                lineHeight: 1.5,
              }}
            >
              {t("complaints.success.description")}
            </p>
          </div>

          {/* Ticket info card */}
          <div
            style={{
              margin: "18px 0 0",
              border: "1px solid color-mix(in srgb, var(--border) 80%, #22c55e 20%)",
              borderRadius: 14,
              background: "var(--surface)",
              overflow: "hidden",
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            }}
          >
            {/* Card header */}
            <div
              style={{
                padding: "14px 18px",
                background:
                  "linear-gradient(135deg, color-mix(in srgb, #22c55e 8%, var(--surface)) 0%, var(--surface) 100%)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: "rgba(34, 197, 94, 0.12)",
                    color: "#16a34a",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Ticket size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
                    {t("complaints.success.ticketId")}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-2)",
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    }}
                  >
                    #{createdComplaint.id.slice(0, 8)}
                  </div>
                </div>
              </div>
              <ComplaintStatusBadge status={createdComplaint.complaintStatus} />
            </div>

            {/* Card body */}
            <div style={{ padding: "16px 18px", display: "grid", gap: 14 }}>
              {/* Subject */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text-2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 4,
                  }}
                >
                  {t("complaints.subject")}
                </div>
                <div
                  style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", lineHeight: 1.4 }}
                >
                  {createdComplaint.subject}
                </div>
              </div>

              {/* Category + Date row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-2)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 4,
                    }}
                  >
                    {t("complaints.category")}
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      borderRadius: 8,
                      background: "rgba(99, 102, 241, 0.08)",
                      color: "#6366f1",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {createdComplaint.category}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-2)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 4,
                    }}
                  >
                    {t("complaints.table.createDate")}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 500 }}>
                    {createdComplaint.createdAt
                      ? new Date(createdComplaint.createdAt).toLocaleString()
                      : new Date().toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text-2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 4,
                  }}
                >
                  {t("complaints.description")}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--text)",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    background: "var(--bg)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    border: "1px solid var(--border)",
                    maxHeight: 180,
                    overflow: "auto",
                  }}
                >
                  {createdComplaint.description}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
              padding: "20px 0 8px",
            }}
          >
            <button
              type="button"
              onClick={() => navigate(ROUTES.LEARNER_COMPLAINT_DETAIL(createdComplaint.id))}
              style={{
                border: "none",
                borderRadius: 12,
                padding: "11px 22px",
                background: "var(--primary)",
                color: "white",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 12px color-mix(in srgb, var(--primary) 25%, transparent)",
                transition: "transform 160ms ease, box-shadow 180ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 8px 20px color-mix(in srgb, var(--primary) 30%, transparent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px color-mix(in srgb, var(--primary) 25%, transparent)";
              }}
            >
              <Eye size={16} />
              {t("complaints.success.viewDetail")}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatedComplaint(null);
                setCreateSuccess("");
                navigate(ROUTES.LEARNER_COMPLAINTS);
              }}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "10px 20px",
                background: "var(--surface)",
                color: "var(--text)",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                transition: "background 160ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--surface)";
              }}
            >
              <ArrowLeft size={16} />
              {t("complaints.success.backToList")}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatedComplaint(null);
                setCreateSuccess("");
              }}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "10px 20px",
                background: "var(--surface)",
                color: "var(--text-2)",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                transition: "background 160ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--surface)";
              }}
            >
              <Plus size={16} />
              {t("complaints.success.createAnother")}
            </button>
          </div>

          {/* CSS keyframes for the success animation */}
          <style>{`
            @keyframes successPop {
              0% { transform: scale(0); opacity: 0; }
              60% { transform: scale(1.1); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </section>
      ) : isCreateRoute ? (
        <section style={createUi.panel}>
          <div style={createUi.panelHeader}>
            <div style={createUi.panelTitleWrap}>
              <h3 style={createUi.panelTitle}>{t("complaints.createTicket")}</h3>
              <p style={createUi.panelSubtitle}>{t("complaints.helpCenterDescription")}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCreateError("");
                setFieldErrors({});
                navigate(ROUTES.LEARNER_COMPLAINTS);
              }}
              style={{
                ...createUi.toggleBtn,
                background: "transparent",
                color: "var(--text-2)",
                borderColor: "var(--border)",
              }}
              aria-label={t("complaints.close")}
              title={t("complaints.close")}
            >
              <X size={14} />
            </button>
          </div>
          <form onSubmit={handleCreate} style={createUi.formBody}>
            <div style={createUi.formGrid}>
              <div style={createUi.formColumn}>
                <div style={createUi.card}>
                  <div style={createUi.cardTitle}>{t("complaints.ticketDetails")}</div>
                  <div style={createUi.twoCol}>
                    <div style={createUi.field}>
                      <label style={createUi.label}>{t("complaints.subject")}</label>
                      <input
                        placeholder={t("complaints.subjectPlaceholder")}
                        value={createForm.subject}
                        onChange={(e) => setCreateForm((p) => ({ ...p, subject: e.target.value }))}
                        maxLength={200}
                        style={{ ...createUi.control, height: 44 }}
                      />
                      <div style={{ ...createUi.helper, ...createUi.errorText }}>
                        {fieldErrors.subject || ""}
                      </div>
                    </div>

                    <div style={createUi.field}>
                      <label style={createUi.label}>{t("complaints.category")}</label>
                      <select
                        value={createForm.categoryKey}
                        onChange={(e) => {
                          const next = e.target.value;
                          setCreateForm((p) => ({ ...p, categoryKey: next }));
                        }}
                        disabled={categoryOptionsLoading}
                        style={{ ...createUi.control, height: 44 }}
                      >
                        <option value="">
                          {categoryOptionsLoading
                            ? t("complaints.loadingCategories")
                            : t("complaints.selectCategory")}
                        </option>
                        {categoryOptions.map((cat) => (
                          <option key={cat.categoryKey} value={cat.categoryKey}>
                            {getCategoryDisplayName(t, cat)}
                          </option>
                        ))}
                      </select>
                      <div style={{ ...createUi.helper, ...createUi.errorText }}>
                        {fieldErrors.categoryKey || ""}
                      </div>
                      <div
                        style={{
                          minHeight: categoryOptionsError ? 18 : 0,
                          ...createUi.warningText,
                        }}
                      >
                        {categoryOptionsError || ""}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={createUi.card}>
                  <div style={{ ...createUi.cardTitle, fontSize: 20, fontWeight: 800 }}>
                    {t("complaints.description")}
                  </div>
                  <textarea
                    placeholder={t("complaints.descriptionPlaceholder")}
                    value={createForm.description}
                    onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                    maxLength={5000}
                    rows={5}
                    style={{ ...createUi.control, resize: "vertical", minHeight: 112 }}
                  />
                  <div style={{ ...createUi.helper, ...createUi.errorText }}>
                    {fieldErrors.description || ""}
                  </div>
                </div>
              </div>

              <div style={createUi.formColumn}>
                {hasSelectedCategory ? (
                  <div style={createUi.card}>
                    <div
                      style={{
                        ...createUi.cardTitle,
                        fontSize: 16,
                        fontWeight: 700,
                        color: "var(--text-2)",
                      }}
                    >
                      {t("complaints.context.title")} ({t("optional")})
                    </div>
                    {requiredAnyContextFields.length > 0 ? (
                      allowManualContextInput ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                            gap: 10,
                          }}
                        >
                          {requiredAnyContextFields.map((field) => (
                            <div key={field} style={{ display: "grid", gap: 6 }}>
                              <label style={{ fontSize: 12, color: "var(--text)" }}>
                                {getContextLabel(t, field)}
                              </label>
                              <input
                                value={
                                  (createForm.context[
                                    field as keyof typeof createForm.context
                                  ] as string) ?? ""
                                }
                                onChange={(e) =>
                                  setCreateForm((p) => ({
                                    ...p,
                                    context: {
                                      ...p.context,
                                      [field]: e.target.value,
                                    },
                                  }))
                                }
                                placeholder={t("complaints.context.enterField").replace(
                                  "{field}",
                                  getContextLabel(t, field),
                                )}
                                style={{
                                  border: "1px solid var(--border)",
                                  borderRadius: 10,
                                  padding: "10px 12px",
                                  background: "var(--surface)",
                                  color: "var(--text)",
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          {prefilledContextEntries.length > 0 ? (
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                                gap: 10,
                              }}
                            >
                              {prefilledContextEntries.map((item) => (
                                <div key={item.field} style={{ display: "grid", gap: 4 }}>
                                  {(() => {
                                    const presentation = getContextPresentation(
                                      t,
                                      locale,
                                      createForm.context,
                                      item.field,
                                    );

                                    return (
                                      <>
                                        <div
                                          style={{
                                            ...createUi.label,
                                            color: "var(--text-2)",
                                            fontWeight: 600,
                                          }}
                                        >
                                          {presentation.label}
                                        </div>
                                        {item.field === "mapId" || item.field === "gameId" ? (
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 8,
                                            }}
                                          >
                                            <input
                                              readOnly
                                              value={
                                                presentation.preserveFullValue
                                                  ? presentation.value
                                                  : formatContextDisplayValue(presentation.value)
                                              }
                                              style={{
                                                ...createUi.control,
                                                flex: 1,
                                                fontFamily:
                                                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                                fontSize: 13,
                                              }}
                                              title={presentation.value}
                                            />
                                            <button
                                              type="button"
                                              onClick={() =>
                                                copyContextValue(item.field, presentation.value)
                                              }
                                              style={{
                                                border: "1px solid var(--border)",
                                                borderRadius: 9,
                                                padding: "8px 10px",
                                                background: "var(--surface)",
                                                cursor: "pointer",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 6,
                                                color: "var(--text)",
                                                fontSize: 12,
                                                fontWeight: 600,
                                              }}
                                            >
                                              <Copy size={14} />
                                              {copiedContextField === item.field
                                                ? t("paymentCopied")
                                                : t("paymentCopy")}
                                            </button>
                                          </div>
                                        ) : (
                                          <div
                                            style={{
                                              ...createUi.control,
                                              borderRadius: 10,
                                              fontFamily:
                                                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                              fontSize: 13,
                                            }}
                                            title={presentation.value}
                                          >
                                            {presentation.preserveFullValue
                                              ? presentation.value
                                              : formatContextDisplayValue(presentation.value)}
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              ))}
                            </div>
                          ) : null}
                          {!hasAnyRequiredContextValue ? (
                            <div style={createUi.warningText}>
                              {t("complaints.context.reportFromFlowHint")}
                            </div>
                          ) : null}
                        </div>
                      )
                    ) : null}

                    {showOccurredAtInput ? (
                      <div style={{ ...createUi.field, maxWidth: 340 }}>
                        <label style={createUi.label}>{t("complaints.context.occurredAt")}</label>
                        <input
                          type="datetime-local"
                          value={createForm.context.occurredAt || ""}
                          onChange={(e) =>
                            setCreateForm((p) => ({
                              ...p,
                              context: {
                                ...p.context,
                                occurredAt: e.target.value,
                              },
                            }))
                          }
                          max={getVietnamNowDateTimeLocal()}
                          style={createUi.control}
                        />
                      </div>
                    ) : null}
                    {fieldErrors.context ? (
                      <div style={createUi.errorText}>{fieldErrors.context}</div>
                    ) : null}
                  </div>
                ) : null}

                <div style={createUi.card}>
                  <div
                    style={{
                      ...createUi.cardTitle,
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--text-2)",
                    }}
                  >
                    {t("complaints.attachments.title")}
                  </div>
                  <label
                    htmlFor="complaint-attachments"
                    onMouseEnter={() => setIsUploadHover(true)}
                    onMouseLeave={() => setIsUploadHover(false)}
                    style={{
                      border: "1px dashed color-mix(in srgb, var(--border) 75%, var(--primary))",
                      borderRadius: 12,
                      padding: "18px 14px",
                      background: isUploadHover
                        ? "color-mix(in srgb, var(--primary) 8%, var(--surface))"
                        : "var(--surface)",
                      display: "grid",
                      gap: 6,
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "background-color 180ms ease, border-color 180ms ease",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        color: "var(--primary)",
                        fontWeight: 700,
                      }}
                    >
                      <Upload size={22} />
                      {t("complaints.attachments.cta")}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                      {t("complaints.attachments.rules")}
                    </div>
                  </label>
                  <input
                    id="complaint-attachments"
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    multiple
                    onChange={(e) => {
                      handleAttachmentChange(e.target.files);
                      e.currentTarget.value = "";
                    }}
                    style={{ display: "none" }}
                  />
                  {attachments.length > 0 ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      {attachments.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            padding: 8,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            background: "var(--surface)",
                          }}
                        >
                          <div
                            style={{
                              width: 64,
                              height: 64,
                              borderRadius: 10,
                              border: "1px solid var(--border)",
                              overflow: "hidden",
                              flexShrink: 0,
                              background: "var(--bg)",
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            {attachmentPreviewUrls[idx] ? (
                              <img
                                src={attachmentPreviewUrls[idx]}
                                alt={file.name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <span style={{ fontSize: 11, color: "var(--text-2)" }}>
                                {t("complaints.attachments.preview")}
                              </span>
                            )}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: 13,
                                color: "var(--text)",
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {file.name}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                              {formatFileSize(file.size)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setAttachments((prev) => prev.filter((_, i) => i !== idx))
                            }
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              background: "var(--bg)",
                              color: "var(--text)",
                              cursor: "pointer",
                              padding: "4px 8px",
                              fontSize: 12,
                            }}
                          >
                            {t("complaints.attachments.remove")}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div
                    style={{
                      ...createUi.helper,
                      color: attachmentError ? "var(--danger)" : "var(--text-2)",
                      minHeight: 20,
                    }}
                  >
                    {attachmentError || t("complaints.attachments.notice")}
                  </div>
                </div>

                <div style={createUi.submitRow}>
                  <div
                    style={{
                      fontSize: 12,
                      color: submitReady ? "#15803d" : "#d97706",
                      fontWeight: 600,
                    }}
                  >
                    {submitHelperText}
                  </div>
                  <button
                    disabled={createButtonDisabled}
                    type="submit"
                    onMouseEnter={() => setIsSubmitHovered(true)}
                    onMouseLeave={() => setIsSubmitHovered(false)}
                    style={{
                      ...createUi.submitBtn,
                      cursor: createButtonDisabled ? "not-allowed" : "pointer",
                      opacity: createButtonDisabled ? 0.7 : 1,
                      transform:
                        !createButtonDisabled && isSubmitHovered
                          ? "translateY(-1px)"
                          : "translateY(0)",
                      boxShadow:
                        !createButtonDisabled && isSubmitHovered
                          ? "0 10px 20px color-mix(in srgb, var(--primary) 28%, transparent)"
                          : createUi.submitBtn.boxShadow,
                      filter:
                        !createButtonDisabled && isSubmitHovered ? "brightness(1.02)" : "none",
                    }}
                  >
                    {creating ? t("submitting") : t("complaints.createTicket")}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </section>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => navigate(ROUTES.LEARNER_COMPLAINTS_NEW)}
            style={{
              ...createUi.toggleBtn,
              background: "var(--primary)",
              color: "white",
              borderColor: "var(--primary)",
            }}
          >
            {t("complaints.createTicket")}
          </button>
        </div>
      )}

      {error ? (
        <div style={{ color: "var(--danger)" }}>
          {error} <button onClick={() => setRetryToken((x) => x + 1)}>{t("retry")}</button>
        </div>
      ) : null}

      {!isCreateRoute ? (
        <section
          style={{
            border: "1px solid var(--border)",
            borderRadius: 14,
            background: "var(--surface)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 14, borderBottom: "1px solid var(--border)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "start",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>
                  {t("complaints.supportTickets")}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: 4,
                    borderRadius: 12,
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {[
                    { label: t("complaints.filter.all"), value: "" },
                    { label: t("complaints.filter.solved"), value: "Resolved" },
                    { label: t("complaints.filter.pending"), value: "Open" },
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => updateQuery("status", s.value)}
                      style={{
                        minWidth: 74,
                        border: "none",
                        borderRadius: 10,
                        padding: "7px 12px",
                        background: status === s.value ? "var(--surface)" : "transparent",
                        color: status === s.value ? "var(--text)" : "var(--text-2)",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <div style={{ position: "relative" }}>
                  <Search
                    size={15}
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-2)",
                    }}
                  />
                  <input
                    placeholder={t("complaints.searchPlaceholder")}
                    value={keywordInput}
                    onCompositionStart={() => setIsKeywordComposing(true)}
                    onCompositionEnd={(e) => {
                      setIsKeywordComposing(false);
                      setKeywordInput(e.currentTarget.value);
                    }}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    style={{
                      padding: "8px 12px 8px 32px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      minWidth: 320,
                      width: 420,
                      maxWidth: "52vw",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters((v) => !v)}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    background: showAdvancedFilters ? "rgba(59,130,246,0.12)" : "var(--bg)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  <SlidersHorizontal size={14} />
                  {t("complaints.filter.button")}
                </button>
              </div>
            </div>
            {showAdvancedFilters ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => updateQuery("dateFrom", e.target.value)}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "8px 10px",
                    background: "var(--bg)",
                  }}
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => updateQuery("dateTo", e.target.value)}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "8px 10px",
                    background: "var(--bg)",
                  }}
                />
              </div>
            ) : null}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                  <th
                    style={{ textAlign: "left", padding: 12, fontSize: 12, color: "var(--text-2)" }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort("id")}
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      {t("complaints.table.ticketId")} <ChevronsUpDown size={13} />
                    </button>
                  </th>
                  <th
                    style={{ textAlign: "left", padding: 12, fontSize: 12, color: "var(--text-2)" }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort("subject")}
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      {t("complaints.table.subject")} <ChevronsUpDown size={13} />
                    </button>
                  </th>
                  <th
                    style={{ textAlign: "left", padding: 12, fontSize: 12, color: "var(--text-2)" }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort("category")}
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      {t("complaints.table.category")} <ChevronsUpDown size={13} />
                    </button>
                  </th>
                  <th
                    style={{ textAlign: "left", padding: 12, fontSize: 12, color: "var(--text-2)" }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort("createdAt")}
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      {t("complaints.table.createDate")} <ChevronsUpDown size={13} />
                    </button>
                  </th>
                  <th
                    style={{ textAlign: "left", padding: 12, fontSize: 12, color: "var(--text-2)" }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort("status")}
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      {t("complaints.table.status")} <ChevronsUpDown size={13} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((c) => (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      background: "transparent",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(getComplaintRoute(c));
                      }
                    }}
                    onClick={() => navigate(getComplaintRoute(c))}
                    tabIndex={0}
                    aria-label={t("complaints.openComplaintAria").replace("{subject}", c.subject)}
                  >
                    <td style={{ padding: 12, fontWeight: 700 }}>#{c.id.slice(0, 8)}</td>
                    <td style={{ padding: 12 }}>{c.subject}</td>
                    <td style={{ padding: 12, color: "var(--text-2)" }}>
                      <div style={{ display: "grid", gap: 2 }}>
                        <span>{c.category}</span>
                        <span style={{ fontSize: 12, color: "var(--text-2)", opacity: 0.9 }}>
                          {getComplaintContextSummary(t, c)}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: 12, color: "var(--text-2)" }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: 12 }}>
                      <ComplaintStatusBadge status={c.complaintStatus} />
                    </td>
                  </tr>
                ))}
                {empty ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ padding: 24, textAlign: "center", color: "var(--text-2)" }}
                    >
                      {t("complaints.noComplaints")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {!empty ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                padding: 12,
                color: "var(--text-2)",
                fontSize: 13,
              }}
            >
              <span>
                {t("complaints.page")} {pageNumber} {t("of")} {totalPages}
              </span>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  disabled={pageNumber <= 1}
                  onClick={() => goToPage(pageNumber - 1)}
                >
                  {t("previous")}
                </button>
                {getPaginationItems(pageNumber, totalPages).map((item, idx) =>
                  item === "..." ? (
                    <span key={`ellipsis-${idx}`}>...</span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => goToPage(item)}
                      style={{
                        minWidth: 34,
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "6px 8px",
                        background: item === pageNumber ? "var(--primary)" : "var(--bg)",
                        color: item === pageNumber ? "white" : "var(--text)",
                        fontWeight: item === pageNumber ? 700 : 500,
                      }}
                    >
                      {item}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  disabled={pageNumber >= totalPages}
                  onClick={() => goToPage(pageNumber + 1)}
                >
                  {t("next")}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
