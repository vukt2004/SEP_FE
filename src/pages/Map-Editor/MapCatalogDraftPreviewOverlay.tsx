import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Video,
  ImagePlus,
  Save,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate, generatePath } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguageStore } from "@/stores/language.store";
import { getT } from "@/lib/i18n/translations";
import { localizeTagName } from "@/lib/maps/tagLocalization";
import type { MapTag } from "@/types/api/learner/maps";
import { ROUTES } from "@/lib/constants/routes";
import "@/shared/styles/tokens.css";
import styles from "@/portals/learner/pages/MapDetailPage.module.css";

const DEFAULT_GALLERY_MAX = 20;

export type CatalogListingSaveMode = "overwrite" | "newListing";

export type MapCatalogDraftPreviewOverlayProps = {
  open: boolean;
  onClose: () => void;
  persistedMapId?: string | null;
  titleValue: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  difficulty: number;
  onDifficultyChange: (value: 1 | 2 | 3 | 4 | 5) => void;
  price: number;
  onPriceChange: (value: number) => void;
  loadingMapTags: boolean;
  availableMapTags: MapTag[];
  learnedKnowledgeTags: MapTag[];
  selectedTagIds: string[];
  selectedLearnedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onToggleLearnedTag: (tagId: string) => void;
  avatarPreviewUrl: string | null;
  avatarFile: File | null;
  onAvatarFileChange: (file: File | null) => void;
  galleryFiles: File[];
  onGalleryFilesAdd: (files: File[]) => void;
  onGalleryFileRemove: (index: number) => void;
  galleryMaxFiles?: number;
  onSaveToServer: () => void | Promise<void>;
  saving: boolean;
  /** Khi đang sửa map đã có id: chọn ghi đè (PUT) hay map mới (duplicate + PUT) */
  catalogListingSaveMode?: CatalogListingSaveMode;
  onCatalogListingSaveModeChange?: (mode: CatalogListingSaveMode) => void;
  /** GET map detail — hiển thị phiên bản nội dung (contentVersion) */
  mapContentVersion?: number | null;
};

function isVideoMediaKind(kind: string): boolean {
  return /video/i.test(kind);
}

function fileLooksLikeVideo(f: File): boolean {
  if (f.type.startsWith("video/")) return true;
  return /\.(mp4|webm|mov|mkv|ogg)(\?|$)/i.test(f.name);
}

function mediaFilesFromList(files: File[]): { images: File[]; videos: File[] } {
  const images = files.filter((f) => f.type.startsWith("image/"));
  const videos = files.filter((f) => f.type.startsWith("video/"));
  return { images, videos };
}

type GallerySlide = { url: string; kind: string; key: string; fileIndex: number };

export function MapCatalogDraftPreviewOverlay({
  open,
  onClose,
  persistedMapId,
  titleValue,
  onTitleChange,
  description,
  onDescriptionChange,
  difficulty,
  onDifficultyChange,
  price,
  onPriceChange,
  loadingMapTags,
  availableMapTags,
  learnedKnowledgeTags,
  selectedTagIds,
  selectedLearnedTagIds,
  onToggleTag,
  onToggleLearnedTag,
  avatarPreviewUrl,
  avatarFile,
  onAvatarFileChange,
  galleryFiles,
  onGalleryFilesAdd,
  onGalleryFileRemove,
  galleryMaxFiles = DEFAULT_GALLERY_MAX,
  onSaveToServer,
  saving,
  catalogListingSaveMode = "overwrite",
  onCatalogListingSaveModeChange,
  mapContentVersion = null,
}: MapCatalogDraftPreviewOverlayProps) {
  const { locale } = useLanguageStore();
  const t = useMemo(() => getT(locale), [locale]);
  const navigate = useNavigate();
  const [gallerySlideIndex, setGallerySlideIndex] = useState(0);
  const [heroLoadError, setHeroLoadError] = useState(false);
  const [tagSearchGeneral, setTagSearchGeneral] = useState("");
  const [tagSearchLearned, setTagSearchLearned] = useState("");
  const [dragHeroActive, setDragHeroActive] = useState(false);
  const [dragKeyArtActive, setDragKeyArtActive] = useState(false);
  const [dragThumbActive, setDragThumbActive] = useState(false);
  const heroDragDepth = useRef(0);
  const keyArtDragDepth = useRef(0);
  const thumbDragDepth = useRef(0);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const [galleryObjectUrls, setGalleryObjectUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setGalleryObjectUrls([]);
      setTagSearchGeneral("");
      setTagSearchLearned("");
      return;
    }
    const urls = galleryFiles.map((f) => URL.createObjectURL(f));
    setGalleryObjectUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [open, galleryFiles]);

  const gallerySlides = useMemo((): GallerySlide[] => {
    return galleryFiles
      .map((f, i) => {
        const u = galleryObjectUrls[i];
        if (!u) return null;
        return {
          url: u,
          kind: fileLooksLikeVideo(f) ? "Video" : "Image",
          key: `g-${i}-${f.name}`,
          fileIndex: i,
        };
      })
      .filter((x): x is GallerySlide => x !== null);
  }, [galleryFiles, galleryObjectUrls]);

  useEffect(() => {
    if (gallerySlides.length === 0) {
      setGallerySlideIndex(0);
    } else if (gallerySlideIndex >= gallerySlides.length) {
      setGallerySlideIndex(gallerySlides.length - 1);
    }
  }, [gallerySlides.length, gallerySlideIndex]);

  useEffect(() => {
    setHeroLoadError(false);
  }, [gallerySlideIndex, gallerySlides]);

  const filteredGeneralTags = useMemo(() => {
    const q = tagSearchGeneral.trim().toLowerCase();
    if (!q) return availableMapTags;
    return availableMapTags.filter((tag) => {
      const raw = tag.name.toLowerCase();
      const localized = localizeTagName(tag.name, locale).toLowerCase();
      return raw.includes(q) || localized.includes(q);
    });
  }, [availableMapTags, locale, tagSearchGeneral]);

  const filteredLearnedTags = useMemo(() => {
    const q = tagSearchLearned.trim().toLowerCase();
    if (!q) return learnedKnowledgeTags;
    return learnedKnowledgeTags.filter((tag) => {
      const raw = tag.name.toLowerCase();
      const localized = localizeTagName(tag.name, locale).toLowerCase();
      return raw.includes(q) || localized.includes(q);
    });
  }, [learnedKnowledgeTags, locale, tagSearchLearned]);

  const currentHero = gallerySlides[gallerySlideIndex] ?? null;

  const applyDroppedToGallery = (fileList: File[]) => {
    const { images, videos } = mediaFilesFromList(fileList);
    const next = [...images, ...videos];
    if (!next.length) return;
    onGalleryFilesAdd([...galleryFiles, ...next].slice(0, galleryMaxFiles));
  };

  const applyDroppedToKeyArt = (fileList: File[]) => {
    const { images } = mediaFilesFromList(fileList);
    if (images[0]) onAvatarFileChange(images[0]);
  };

  const hasFileDrag = (e: React.DragEvent) => [...e.dataTransfer.types].includes("Files");

  const scrollCarousel = (dir: -1 | 1) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 220, behavior: "smooth" });
  };

  if (!open) return null;

  const el = (
    <div
      className={styles.page}
      style={{ position: "fixed", inset: 0, zIndex: 100000, overflow: "auto" }}
      role="dialog"
      aria-modal="true"
      aria-label={t("mapEditorCatalogPreviewTitle")}
    >
      <div className={styles.bg} aria-hidden />
      <motion.div
        className={styles.content}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <motion.button
            type="button"
            onClick={onClose}
            className={styles.backBtn}
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft size={18} /> {t("mapEditorCatalogPreviewBackToEditor")}
          </motion.button>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              padding: "6px 10px",
              borderRadius: 8,
              background: "rgba(59, 130, 246, 0.15)",
              color: "#1d4ed8",
            }}
          >
            {t("mapEditorCatalogPreviewEditBadge")}
          </span>
        </div>

        {!persistedMapId ? (
          <p
            style={{
              margin: "0 0 18px",
              padding: "12px 14px",
              borderRadius: 12,
              background: "linear-gradient(180deg, #fffbeb, #fef3c7)",
              border: "1px solid #fcd34d",
              color: "#92400e",
              fontSize: 14,
              lineHeight: 1.45,
            }}
          >
            {t("mapEditorCatalogPreviewDraftSaveHint")}
          </p>
        ) : (
          <p
            style={{
              margin: "0 0 18px",
              padding: "12px 14px",
              borderRadius: 12,
              background: "linear-gradient(180deg, #eff6ff, #e0f2fe)",
              border: "1px solid #93c5fd",
              color: "#1e3a8a",
              fontSize: 14,
              lineHeight: 1.45,
            }}
          >
            {t("mapEditorCatalogPreviewUpdateHint")}
          </p>
        )}

        <motion.div
          className={`${styles.steamRow} ${styles.catalogSteamStoreRow}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className={styles.authorFileHidden}
            onChange={(e) => onAvatarFileChange(e.target.files?.[0] ?? null)}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className={styles.authorFileHidden}
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (!list.length) return;
              onGalleryFilesAdd([...galleryFiles, ...list].slice(0, galleryMaxFiles));
            }}
          />

          {/* Cột trái: hero + carousel gallery (Steam) */}
          <div className={styles.steamMedia}>
            <div
              className={styles.steamPlayer}
              onDragOver={(e) => {
                if (hasFileDrag(e)) e.preventDefault();
              }}
              onDragEnter={(e) => {
                if (!hasFileDrag(e)) return;
                e.preventDefault();
                heroDragDepth.current += 1;
                setDragHeroActive(true);
              }}
              onDragLeave={(e) => {
                if (!hasFileDrag(e)) return;
                heroDragDepth.current -= 1;
                if (heroDragDepth.current <= 0) {
                  heroDragDepth.current = 0;
                  setDragHeroActive(false);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                heroDragDepth.current = 0;
                setDragHeroActive(false);
                const list = Array.from(e.dataTransfer.files);
                if (list.length) applyDroppedToGallery(list);
              }}
            >
              {currentHero && !heroLoadError ? (
                isVideoMediaKind(currentHero.kind) ? (
                  <video
                    key={currentHero.key}
                    src={currentHero.url}
                    className={styles.steamPlayerVideo}
                    controls
                    playsInline
                  />
                ) : (
                  <img
                    key={currentHero.key}
                    src={currentHero.url}
                    alt=""
                    className={styles.steamPlayerImg}
                    onError={() => setHeroLoadError(true)}
                  />
                )
              ) : (
                <button
                  type="button"
                  className={`${styles.catalogDropZone} ${
                    dragHeroActive ? styles.catalogDropZoneActive : ""
                  }`}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <ImagePlus size={36} strokeWidth={1.25} aria-hidden />
                  <span>{t("mapEditorCatalogGalleryHeroHint")}</span>
                </button>
              )}
              {currentHero && dragHeroActive && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                    border: "2px dashed color-mix(in srgb, var(--primary) 45%, var(--border))",
                    borderRadius: 3,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-2)",
                    pointerEvents: "none",
                  }}
                >
                  {t("mapEditorCatalogDropGalleryHeroHint")}
                </div>
              )}
            </div>

            <div className={styles.catalogCarouselStrip}>
              <button
                type="button"
                className={styles.catalogCarouselNavBtn}
                aria-label={t("previousAria")}
                onClick={() => scrollCarousel(-1)}
              >
                <ChevronLeft size={20} />
              </button>
              <div className={styles.catalogCarouselScroll}>
                <div
                  ref={carouselRef}
                  className={`${styles.steamCarousel} ${styles.catalogSteamCarousel}`}
                >
                  {gallerySlides.map((item, idx) => (
                    <div key={item.key} className={styles.catalogCarouselThumbCell}>
                      <button
                        type="button"
                        className={`${styles.steamThumb} ${
                          gallerySlideIndex === idx ? styles.steamThumbActive : ""
                        }`}
                        onClick={() => setGallerySlideIndex(idx)}
                      >
                        {isVideoMediaKind(item.kind) ? (
                          <div className={styles.steamThumbVideoWrap}>
                            <video
                              src={item.url}
                              className={styles.steamThumbVideo}
                              muted
                              playsInline
                              preload="metadata"
                            />
                            <span className={styles.steamThumbVideoBadge} aria-hidden>
                              <Video size={18} />
                            </span>
                          </div>
                        ) : (
                          <img src={item.url} alt="" />
                        )}
                      </button>
                    </div>
                  ))}
                  <div className={styles.catalogCarouselThumbCell}>
                    <button
                      type="button"
                      title={t("mapEditorCatalogThumbAddHint")}
                      aria-label={t("mapEditorCatalogThumbAddHint")}
                      className={`${styles.catalogThumbAddSlot} ${
                        dragThumbActive ? styles.catalogDropZoneActive : ""
                      }`}
                      onClick={() => galleryInputRef.current?.click()}
                      onDragOver={(e) => {
                        if (hasFileDrag(e)) e.preventDefault();
                      }}
                      onDragEnter={(e) => {
                        if (!hasFileDrag(e)) return;
                        e.preventDefault();
                        thumbDragDepth.current += 1;
                        setDragThumbActive(true);
                      }}
                      onDragLeave={(e) => {
                        if (!hasFileDrag(e)) return;
                        thumbDragDepth.current -= 1;
                        if (thumbDragDepth.current <= 0) {
                          thumbDragDepth.current = 0;
                          setDragThumbActive(false);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        thumbDragDepth.current = 0;
                        setDragThumbActive(false);
                        const list = Array.from(e.dataTransfer.files);
                        if (list.length) applyDroppedToGallery(list);
                      }}
                    >
                      <Plus size={22} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={styles.catalogCarouselNavBtn}
                aria-label={t("nextAria")}
                onClick={() => scrollCarousel(1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {galleryFiles.length > 0 && (
              <div className={styles.catalogGallerySlotsSection}>
                <h3 className={styles.catalogGallerySlotsTitle}>
                  {t("mapEditorCatalogGalleryPerSlotTitle")}
                </h3>
                <div className={styles.catalogGallerySlotsGrid}>
                  {galleryFiles.map((f, i) => {
                    const url = galleryObjectUrls[i];
                    const isVid = fileLooksLikeVideo(f);
                    return (
                      <div key={`${f.name}-${f.size}-${i}`} className={styles.catalogGallerySlot}>
                        <div className={styles.catalogGallerySlotFrame}>
                          <button
                            type="button"
                            className={`${styles.catalogGallerySlotPreview} ${
                              gallerySlideIndex === i ? styles.catalogGallerySlotPreviewActive : ""
                            }`}
                            onClick={() => setGallerySlideIndex(i)}
                            title={f.name}
                            aria-label={f.name}
                          >
                            {url ? (
                              isVid ? (
                                <div className={styles.steamThumbVideoWrap}>
                                  <video
                                    src={url}
                                    className={styles.steamThumbVideo}
                                    muted
                                    playsInline
                                    preload="metadata"
                                  />
                                  <span className={styles.steamThumbVideoBadge} aria-hidden>
                                    <Video size={14} />
                                  </span>
                                </div>
                              ) : (
                                <img src={url} alt="" />
                              )
                            ) : (
                              <div className={styles.catalogGallerySlotPreviewPlaceholder}>…</div>
                            )}
                          </button>
                          <button
                            type="button"
                            className={styles.catalogGallerySlotRemove}
                            onClick={() => onGalleryFileRemove(i)}
                            aria-label={t("mapDetailRemoveGalleryFile")}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <span className={styles.catalogGallerySlotName} title={f.name}>
                          {f.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Cột phải: key art + text + meta + tags (scroll riêng) */}
          <div className={styles.steamSidebar}>
            <div
              className={styles.catalogKeyArt}
              onDragOver={(e) => {
                if (hasFileDrag(e)) e.preventDefault();
              }}
              onDragEnter={(e) => {
                if (!hasFileDrag(e)) return;
                e.preventDefault();
                keyArtDragDepth.current += 1;
                setDragKeyArtActive(true);
              }}
              onDragLeave={(e) => {
                if (!hasFileDrag(e)) return;
                keyArtDragDepth.current -= 1;
                if (keyArtDragDepth.current <= 0) {
                  keyArtDragDepth.current = 0;
                  setDragKeyArtActive(false);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                keyArtDragDepth.current = 0;
                setDragKeyArtActive(false);
                const list = Array.from(e.dataTransfer.files);
                if (list.length) applyDroppedToKeyArt(list);
              }}
            >
              {avatarPreviewUrl?.trim() ? (
                <img src={avatarPreviewUrl} alt="" />
              ) : (
                <button
                  type="button"
                  className={`${styles.catalogDropZone} ${
                    dragKeyArtActive ? styles.catalogDropZoneActive : ""
                  }`}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <ImagePlus size={28} strokeWidth={1.25} aria-hidden />
                  <span>{t("mapEditorCatalogKeyArtHint")}</span>
                </button>
              )}
              {avatarPreviewUrl?.trim() && dragKeyArtActive && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "color-mix(in srgb, var(--primary) 14%, transparent)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-2)",
                    pointerEvents: "none",
                  }}
                >
                  {t("mapEditorCatalogDropKeyArtHint")}
                </div>
              )}
            </div>

            {avatarPreviewUrl?.trim() ? (
              <button
                type="button"
                className={styles.authorMediaBtn}
                style={{ marginBottom: 8 }}
                onClick={() => avatarInputRef.current?.click()}
              >
                <ImagePlus size={14} /> {t("mapDetailChangeAvatar")}
              </button>
            ) : null}

            {avatarFile && (
              <p className={styles.authorFileHint} style={{ margin: "0 0 8px" }}>
                {t("mapDetailAvatarSelected")}: {avatarFile.name}
              </p>
            )}

            <section className={styles.steamSidebarSection}>
              <input
                type="text"
                className={styles.catalogInlineTitle}
                value={titleValue}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder={t("mapEditorCatalogTitlePlaceholder")}
                aria-label={t("mapDetailFieldTitle")}
              />
              <textarea
                className={styles.catalogInlineDesc}
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder={t("mapEditorCatalogDescPlaceholder")}
                aria-label={t("mapDetailFieldDescription")}
              />
            </section>

            <section className={styles.steamSidebarSection}>
              <h2 className={styles.steamSectionTitle}>{t("productDetails")}</h2>
              <div className={styles.steamMetaGrid}>
                <div className={styles.steamMetaRow}>
                  <span className={styles.steamMetaLabel}>{t("difficulty")}</span>
                  <select
                    className={styles.catalogMetaField}
                    value={difficulty}
                    onChange={(e) =>
                      onDifficultyChange(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)
                    }
                    aria-label={t("mapDetailFieldDifficulty")}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}/5
                        {n <= 1
                          ? ` — ${t("easy")}`
                          : n === 2
                            ? ` — ${t("medium")}`
                            : ` — ${t("hard")}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.steamMetaRow}>
                  <span className={styles.steamMetaLabel}>{t("mapDetailFieldPrice")}</span>
                  <input
                    type="number"
                    min={0}
                    className={styles.catalogMetaField}
                    value={price}
                    onChange={(e) => onPriceChange(Math.max(0, Number(e.target.value) || 0))}
                    aria-label={t("mapDetailFieldPrice")}
                  />
                </div>
              </div>
            </section>

            <section className={styles.steamSidebarSection}>
              <h2 className={styles.steamSectionTitle}>{t("tags")}</h2>
              <input
                type="search"
                className={styles.catalogTagSearch}
                value={tagSearchGeneral}
                onChange={(e) => setTagSearchGeneral(e.target.value)}
                placeholder={t("mapEditorCatalogSearchTagsPlaceholder")}
                aria-label={t("mapEditorCatalogSearchTagsPlaceholder")}
              />
              <p className={styles.catalogHint}>{t("mapEditorCatalogTagsClickHint")}</p>
              <div className={styles.catalogTagsScrollBox}>
                {loadingMapTags ? (
                  <p className={styles.steamDescEmpty}>{t("mapDetailLoadingTags")}</p>
                ) : availableMapTags.length === 0 ? (
                  <p className={styles.steamDescEmpty}>{t("mapEditorCatalogNoTagsFromApi")}</p>
                ) : filteredGeneralTags.length === 0 ? (
                  <p className={styles.steamDescEmpty}>{t("noTags")}</p>
                ) : (
                  <div className={styles.catalogTagsWrap}>
                    {filteredGeneralTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        className={`${styles.catalogTagButton} ${
                          selectedTagIds.includes(tag.id) ? styles.catalogTagButtonActive : ""
                        }`}
                        onClick={() => onToggleTag(tag.id)}
                      >
                        {localizeTagName(tag.name, locale)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className={styles.steamSidebarSection}>
              <h2 className={styles.steamSectionTitle}>{t("mapEditorCatalogYouWillLearnTitle")}</h2>
              <input
                type="search"
                className={styles.catalogTagSearch}
                value={tagSearchLearned}
                onChange={(e) => setTagSearchLearned(e.target.value)}
                placeholder={t("mapEditorCatalogSearchLearnedPlaceholder")}
                aria-label={t("mapEditorCatalogSearchLearnedPlaceholder")}
              />
              <p className={styles.catalogHint}>{t("mapEditorCatalogLearnedClickHint")}</p>
              <div className={styles.catalogTagsScrollBox}>
                {loadingMapTags ? (
                  <p className={styles.steamDescEmpty}>{t("mapDetailLoadingTags")}</p>
                ) : learnedKnowledgeTags.length === 0 ? (
                  <p className={styles.steamDescEmpty}>{t("mapEditorCatalogNoLearnedPool")}</p>
                ) : filteredLearnedTags.length === 0 ? (
                  <p className={styles.steamDescEmpty}>{t("noTags")}</p>
                ) : (
                  <div className={styles.catalogTagsWrap}>
                    {filteredLearnedTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        className={`${styles.catalogTagButton} ${
                          selectedLearnedTagIds.includes(tag.id)
                            ? styles.catalogTagButtonActive
                            : ""
                        }`}
                        onClick={() => onToggleLearnedTag(tag.id)}
                      >
                        {localizeTagName(tag.name, locale)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <div className={styles.steamFooter}>
              {persistedMapId && onCatalogListingSaveModeChange ? (
                <fieldset className={styles.catalogPublishModeFieldset}>
                  <legend className={styles.catalogPublishModeLegend}>
                    {t("mapEditorCatalogPublishModeTitle")}
                  </legend>
                  <div
                    className={styles.catalogPublishModeOptions}
                    role="radiogroup"
                    aria-label={t("mapEditorCatalogPublishModeTitle")}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={catalogListingSaveMode === "overwrite"}
                      className={`${styles.catalogPublishModeBtn} ${
                        catalogListingSaveMode === "overwrite"
                          ? styles.catalogPublishModeBtnActive
                          : ""
                      }`}
                      onClick={() => onCatalogListingSaveModeChange("overwrite")}
                    >
                      <span className={styles.catalogPublishModeBtnLabel}>
                        {t("mapEditorCatalogPublishOverwrite")}
                      </span>
                      <span className={styles.catalogPublishModeBtnHint}>
                        {t("mapEditorCatalogPublishOverwriteHint")}
                      </span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={catalogListingSaveMode === "newListing"}
                      className={`${styles.catalogPublishModeBtn} ${
                        catalogListingSaveMode === "newListing"
                          ? styles.catalogPublishModeBtnActive
                          : ""
                      }`}
                      onClick={() => onCatalogListingSaveModeChange("newListing")}
                    >
                      <span className={styles.catalogPublishModeBtnLabel}>
                        {t("mapEditorCatalogPublishNewListing")}
                      </span>
                      <span className={styles.catalogPublishModeBtnHint}>
                        {t("mapEditorCatalogPublishNewListingHint")}
                      </span>
                    </button>
                  </div>
                </fieldset>
              ) : null}
              {persistedMapId && mapContentVersion != null && Number.isFinite(mapContentVersion) ? (
                <p className={styles.catalogContentVersionLine}>
                  {t("mapEditorCatalogContentVersionLine").replace(
                    "{n}",
                    String(mapContentVersion),
                  )}
                </p>
              ) : null}
              <button
                type="button"
                className={styles.steamFooterPrimary}
                disabled={saving}
                onClick={() => void onSaveToServer()}
              >
                <Save size={18} />{" "}
                {saving
                  ? t("mapEditorCatalogPreviewSaving")
                  : persistedMapId
                    ? catalogListingSaveMode === "newListing"
                      ? t("mapEditorCatalogPreviewSaveAsNewListing")
                      : t("mapEditorCatalogPreviewSaveUpdate")
                    : t("mapEditorCatalogPreviewSaveCreate")}
              </button>
              {persistedMapId ? (
                <button
                  type="button"
                  className={styles.steamFooterSecondary}
                  onClick={() => {
                    navigate(generatePath(ROUTES.LEARNER_MAP_DETAIL, { id: persistedMapId }), {
                      state: { mapCatalogSetup: true },
                    });
                  }}
                >
                  {t("mapEditorCatalogPreviewOpenDetailToSave")}
                </button>
              ) : null}
              {persistedMapId ? (
                <p className={styles.catalogHint} style={{ width: "100%", marginTop: 4 }}>
                  {t("mapEditorCatalogPreviewPersistHint")}
                </p>
              ) : null}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(el, document.body) : null;
}
