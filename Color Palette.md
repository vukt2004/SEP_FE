## 1) Core Color Palette (Design Tokens)

### Core palette (recommended)

**Primary (Brand / CTA):** `#2563EB` (Blue 600)
→ modern, trustworthy, suitable for a learning platform, stands out for CTAs.

**Accent (Game energy / highlights):** `#F97316` (Orange 500)
→ youthful, energetic, used for XP/badges/highlights.

**Success:** `#22C55E` (Green 500)
**Warning:** `#F59E0B` (Amber 500)
**Danger:** `#EF4444` (Red 500)

**Info / Secondary accent:** `#06B6D4` (Cyan 500)
→ fits an “orbit / sci-fi / tech” theme while staying clean.

### Neutrals (background + text)

- **Background:** `#0B1220` (deep navy — “space-like” but not overly dark)
- **Surface / Card:** `#0F1B2D`
- **Elevated / Panel:** `#14233A`
- **Border:** `#22324C`
- **Text primary:** `#E5E7EB`
- **Text secondary:** `#A7B0C0`
- **Muted:** `#7C879C`

---

## 2) Define Colors for Each Component (Landing Page)

**Goal:** harmonious + youthful while still feeling “product-grade”.
All colors are **solid colors**, no gradients.

---

### A) Layout / Sections

- **Body background:** `--bg`
- **Section background (alternate):** alternate between `--bg` and `--surface` to separate sections
- **Container cards:** `--surface` (card), `--surface-2` (hover/elevated)
- **Divider/border:** `--border`

---

### B) Typography

- **Heading (H1/H2):** `--text`
- **Body text:** `--text-2`
- **Caption / helper:** `--muted`
- **Link:** `--info` (slightly brighter or underline on hover)

---

### C) Header / Navbar

- **Navbar bg:** `--bg` (or `rgba(11,18,32,0.9)` if blur is used)
- **Nav item:** `--text-2`
- **Nav item hover/active:** `--text` + underline `--primary`

---

### D) Hero Section

- **Hero title:** `--text`
- **Hero subtitle:** `--text-2`

**Hero badge/pill** (e.g., “2D Puzzle • Block-based • Multiplayer”):

- bg: `--surface-2`
- border: `--border`
- text: `--text-2`
- icon/highlight: `--info`

---

### E) Buttons (CTA)

**Primary Button (Start Learning / Play Now):**

- bg: `--primary`
- text: `#FFFFFF`
- hover: `--primary-hover`
- focus ring: `--focus`

**Secondary Button (View Demo / Docs):**

- bg: transparent
- border: `--border`
- text: `--text`
- hover bg: `--surface-2`

**Accent Button (Join Competitive / Get XP):**

- bg: `--accent`
- text: `#0B1220` (more “game-like” and clear)
- hover: `--accent-hover`

---

### F) Feature Cards

(Challenge Mode / Competitive / Marketplace / Admin)

- Card bg: `--surface`
- Card border: `--border`
- Card title: `--text`
- Card description: `--text-2`

**Icon chip (per feature):**

- Challenge Mode: `--primary`
- Competitive Mode: `--accent`
- Marketplace / UGC: `--info`
- Admin / Moderation: `--warning`

---

### G) “How It Works” Steps

**Step number circle:**

- bg: `--surface-2`
- border: `--border`
- number text: `--primary` (or vary by step)

**Step connector line:** `--border`

---

### H) Pricing / Packages (if included on landing)

- Plan card: `--surface`
- Recommended plan highlight: border `--primary` (no glow/gradient)
- Price text: `--text`
- Plan feature check icon: `--success`
- Disabled/unavailable: text `--muted`, icon `--border`

---

### I) Testimonials / Stats

- Stat number: `--text`
- Stat label: `--muted`
- Stat highlight (XP / stars): use `--accent`

---

### J) Footer

- Footer bg: `--surface`
- Footer title: `--text`
- Footer link: `--text-2` (hover `--text`)
- Footer divider: `--border`

---

### K) Forms (email signup/contact)

- Input bg: `--surface`
- Input border: `--border`
- Input text: `--text`
- Placeholder: `--muted`
- Focus: border `--primary`, ring `--focus`
- Error state: border `--danger`, helper text `--danger`

---

### L) Badges / Tags

(very suitable for concept tags like: Loops, Conditions…)

**Default badge:**

- bg `--surface-2`
- text `--text-2`
- border `--border`

**Loops:**

- bg `rgba(37,99,235,0.15)`
- text `--primary`

**Conditions:**

- bg `rgba(249,115,22,0.15)`
- text `--accent`

**Variables:**

- bg `rgba(6,182,212,0.15)`
- text `--info`

---

## 3) Color Usage Rules (to avoid visual overload)

- **Primary (blue):** use for main CTAs, important links, and active states (avoid overuse).
- **Accent (orange):** only for game/gamification elements (XP, badges, competitive features).
- **Cyan:** use for informational or technology-related features (realtime, editor).
- **Neutrals keep the background clean:** helps the UI look modern and professional.
