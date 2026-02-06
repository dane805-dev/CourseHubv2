# CourseHub v2 — App Walkthrough & Architecture

## What Is CourseHub?

CourseHub is a course planning platform for Wharton MBA students. It lets students build a 2-year, 8-quarter academic plan with drag-and-drop, validates the plan against all core and major degree requirements in real time, and tracks progress toward graduation.

**Tech stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Zustand · dnd-kit · shadcn/ui · Supabase (planned)

**Theme:** Dark mode only (zinc palette).

---

## Running the App

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app runs at `http://localhost:3000`. It redirects to `/login` on first visit.

**User flow:** `/login` → `/onboarding` (3 steps) → `/plan` (main app)

---

## App Routes

| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/app/page.tsx` | Redirects to `/login` |
| `/login` | `src/app/login/page.tsx` | Mock dev login (email input, no real auth) |
| `/onboarding` | `src/app/onboarding/page.tsx` | 3-step wizard: majors → waivers → CU load preference |
| `/plan` | `src/app/plan/page.tsx` | Main planning interface |

---

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (Inter font, dark class, Toaster)
│   ├── globals.css               # Tailwind v4 + dark theme CSS variables
│   ├── page.tsx                  # → redirects to /login
│   ├── login/page.tsx            # Mock auth page
│   ├── onboarding/page.tsx       # Onboarding wizard
│   └── plan/page.tsx             # Main app page
│
├── components/
│   ├── layout/                   # App shell, header
│   ├── plan/                     # Plan grid, course tiles, drag-and-drop
│   ├── catalog/                  # Course search & browse
│   ├── course/                   # Course detail modal
│   ├── progress/                 # Degree progress dashboard
│   ├── onboarding/               # Major/waiver/load selectors
│   ├── export/                   # CSV/text export menu
│   └── ui/                       # 15 shadcn/ui primitives
│
├── stores/                       # Zustand state management (4 stores)
├── hooks/                        # Custom React hooks
├── lib/
│   ├── data/                     # Course resolver, requirements, constants
│   ├── validation/               # Degree validation engine (5 modules)
│   ├── scheduling/               # Initial plan generator
│   └── supabase/                 # Supabase client/server (not yet connected)
│
└── types/                        # TypeScript type definitions (6 files)
```

**Data files (read-only, not part of the app build):**

```
Student Requirements/
├── wharton_mba_core_requirements.json    # 13 core requirements
└── wharton_mba_major_requirements.json   # 21 majors

scripts/cleaned_courses.json              # 252 courses (full catalog data)
data/course_registry.json                 # 324 courses (lightweight registry)
docs/data-architecture.md                 # Data model reference
Project PRD/Course Hub PRD.md             # Product requirements
```

---

## How the App Works (Walkthrough)

### 1. Login (`/login`)

A mock dev login page. Enter any email and click "Continue." This creates a profile in the Zustand profile store and redirects to onboarding. No real authentication — this is a dev bypass that will be replaced with Google SSO later.

### 2. Onboarding (`/onboarding`)

A 3-step wizard that collects student preferences:

**Step 1 — Major Selection** (`MajorSelector.tsx`)
- Choose 1–3 majors from the 21 available options.
- Mutual exclusions are enforced at selection time (e.g., FNCE ↔ QFNC, ESGB ↔ BEES, ESGB ↔ SOGO, MKOP ↔ MKTG, MKOP ↔ OIDD). Excluded majors are grayed out.

**Step 2 — Waiver Selection** (`WaiverSelector.tsx`)
- Select waivers for the 4 waivable core requirements (ACCT_FLEX, FNCE_CORP_FLEX, FNCE_MACRO_FLEX, MKTG_FLEX).
- Each waiver can be: none, full, half-credit, or substitution.

**Step 3 — CU Load Preference** (`LoadPreference.tsx`)
- Choose Light, Normal, or Heavy course load per quarter.
- Affects how many courses the initial schedule generator places per quarter.

On completion, the app:
1. Saves the profile to the Zustand profile store
2. Runs the initial schedule generator (`initial-plan.ts`)
3. Loads the generated plan into the plan store
4. Redirects to `/plan`

### 3. Plan View (`/plan`)

The main app interface. A 70/30 split layout:

**Left side (70%) — Plan Grid** (`PlanGrid.tsx`)
- A staging area at the top for unplaced courses
- A 2×2 grid of 4 semesters (Year 1 Fall, Year 1 Spring, Year 2 Fall, Year 2 Spring)
- Each semester contains 2 quarter columns (e.g., Y1F has Q1 and Q2)
- Each quarter column shows its courses as draggable tiles with a CU counter

**Right side (30%) — Side Panel** (togglable)
- **Catalog view**: Search and filter all courses, add to staging
- **Progress view**: Track degree requirement completion

**Header** (`Header.tsx`)
- App title, total CU counter, save status indicator
- Buttons to switch right panel view (Catalog / Progress)
- Export dropdown menu (CSV / Text)

### 4. Drag-and-Drop

Powered by `@dnd-kit`. Courses can be:
- Dragged between quarters
- Dragged between staging and quarters
- Reordered within a quarter or staging
- Removed via the × button on the tile

All DnD logic is in `PlanGrid.tsx`. The `onDragEnd` handler dispatches to the plan store (`moveToQuarter`, `moveToStaging`, `reorderInQuarter`, `reorderInStaging`).

### 5. Course Tiles (`CourseTile.tsx`)

Each tile shows:
- Course ID and title
- Credit units
- Type badge (Core / Flex)
- Remove button (appears on hover)
- Click to open the course detail modal

### 6. Course Modal (`CourseModal.tsx`)

A dialog showing full course details:
- Course ID, title, department, credit units
- Description and prerequisites
- Term availability, instructors, ratings (by semester)
- Link to syllabus
- Which requirements the course fulfills (based on student's declared majors)
- "Add to Staging" button

### 7. Catalog Browser (`CatalogBrowser.tsx`)

In the right panel. Features:
- Text search across course ID, title, and department
- Filters: department, term (Fall/Spring/Both)
- Each course card shows an "In Plan" badge if already placed
- "+ Add" button adds the course to staging

### 8. Progress Dashboard (`ProgressDashboard.tsx`)

In the right panel. Tabbed interface:
- **Core tab**: Shows all 13 core requirements with status (Done / Waived / Partial / Missing)
- **Major tabs**: One tab per declared major showing fulfilled vs. remaining courses with progress bars
- **Overall tab**: Summary with validation errors and warnings

### 9. Export (`ExportMenu.tsx`)

Dropdown in the header with two options:
- **CSV**: Comma-separated file with Course_ID, Course_Title, Department, Credit_Units, Quarter, Semester
- **Text**: Human-readable formatted plan organized by quarter with CU totals

---

## Data Architecture

### Two-File Course System

CourseHub uses two data sources merged at build time:

| Source | File | Count | Fields |
|--------|------|-------|--------|
| Catalog | `scripts/cleaned_courses.json` | 252 | 24 fields (full scheduling, instructors, ratings, descriptions) |
| Registry | `data/course_registry.json` | 324 | 7 fields (course_id, title, department, credit_units, is_wharton, currently_offered, catalog_source) |

The **course resolver** (`src/lib/data/course-resolver.ts`) merges these with catalog-first priority. A course appearing in both files gets the full catalog data. Registry-only courses get minimal fields.

Exported functions:
- `resolveCourse(id)` — Get a single course by ID
- `getAllCourses()` — All 324 courses
- `getOfferedCourses()` — Only currently offered courses
- `getCreditUnits(id)` — Quick CU lookup

### Requirements Data

Loaded at build time via static JSON imports in `src/lib/data/requirements.ts`.

**Core requirements** (`wharton_mba_core_requirements.json`):
- 13 requirements totaling 9.5 CU
- 6 fixed cores (must take specific course) + 7 flex cores (choose from a list)
- 4 are waivable (ACCT, FNCE Corp, FNCE Macro, MKTG flex)

**Major requirements** (`wharton_mba_major_requirements.json`):
- 21 majors with 4 structural patterns:
  - `ELECTIVES` — Pick N CU from an elective list
  - `COMBINED` — Required courses + electives
  - `PILLARS` — Courses grouped into pillars with min/max constraints
  - `COMBINED_PILLARS` — Required courses + pillar-based electives

---

## Validation Engine

The most critical subsystem. Located in `src/lib/validation/`. Runs client-side on every plan change via the `useValidation` hook.

### Pipeline

```
Plan changes → useValidation hook → validatePlan() →
  1. Core rules     (core-rules.ts)
  2. Major rules    (major-rules.ts)
  3. Cross rules    (cross-rules.ts)
  4. CU tracking    (cu-tracker.ts)
→ ValidationResult { errors[], warnings[], coreProgress[], majorProgress[], graduationProgress }
```

### Core Rules (`core-rules.ts`)

Validates all 13 core requirements:
- Checks waiver status (full/half-credit/substitution)
- Checks if a qualifying course is in the plan
- Handles CU nuances:
  - STAT6130 is 1.0 CU but only 0.5 CU is required
  - FNCE6210 (0.5 CU) alone satisfies the 1.0 CU FNCE Corp Flex requirement
  - FNCE6230 (0.5 CU) alone satisfies the 1.0 CU FNCE Macro Flex requirement
  - OIDD flex needs 1.0 CU total (two 0.5 CU courses or one 1.0 CU)
- Checks prohibited combinations (FNCE6210 + FNCE6230)
- Enforces finance major overrides (FNCE/QFNC majors must take FNCE6110/FNCE6130)

### Major Rules (`major-rules.ts`)

Validates each declared major using its structural pattern:
- `ELECTIVES` — Sum CU of matching courses vs. `credits_required`
- `COMBINED` — Check required + elective CU separately
- `PILLARS` — Validate min/max per pillar and combined constraints
- `COMBINED_PILLARS` — Required courses + remaining distributed across pillars
- ISP/Global Modular cap (1.0 CU max per major)
- Major-specific prohibited combinations (MKTG, BUAN, ENTR)

### Cross Rules (`cross-rules.ts`)

- Mutual major exclusions (5 pairs)
- Double-counting restrictions (OIDD courses can't count toward both a major and the OIDD flex core)

### CU Tracking (`cu-tracker.ts`)

- Per-quarter CU totals
- Overload warnings (>2.75 CU per quarter, >5.5 CU per semester)
- Term availability mismatch detection
- Graduation range check (19–21 CU required)

---

## State Management

Four Zustand stores with Immer middleware for immutable updates:

### `plan-store.ts`
The central plan state.
- **State**: `placements` (courseId → Placement), `stagingOrder` (string[]), `quarterOrder` (Record<QuarterId, string[]>), save status flags
- **Actions**: `loadPlan`, `addToStaging`, `moveToQuarter`, `moveToStaging`, `removeCourse`, `reorderInQuarter`, `reorderInStaging`
- **Derived**: `isInPlan`, `getCUForQuarter`, `getCUForSemester`, `getTotalCU`, `getPlacedCourseIds`

### `profile-store.ts`
User profile and preferences.
- **State**: `email`, `majors`, `waivers`, `cuLoadPreference`, `onboardingCompleted`
- **Actions**: `setProfile`, `setMajors`, `setWaivers`, `completeOnboarding`
- **Derived**: `hasMajor`, `hasWaiver`, `getWaiver`

### `catalog-store.ts`
Course catalog search and filtering.
- **State**: `courses`, `searchQuery`, `filters` (department, term, courseType), `sortBy`, `sortDirection`
- **Derived**: `getFilteredCourses()` — applies search + filters with AND logic, then sorts

### `ui-store.ts`
UI state.
- **State**: `selectedCourseId` (modal), `rightPanelOpen`, `rightPanelView` (catalog/progress), `highlightedCourses`, `confirmDialog`

---

## Initial Schedule Generator

`src/lib/scheduling/initial-plan.ts`

Rules-based (not AI) placement of core courses when onboarding completes:

- **Q1**: MGMT6100, BEPP6110, MKTG6110 (0.5 CU each — fixed cores)
- **Q2**: BEPP6120 (0.5 CU — fixed core)
- **Q1–Q4**: Flex cores (STAT, WHCP, ACCT, FNCE, LGST, MGMT, MKTG, OIDD) spread across Year 1 based on term availability
- Respects waivers (skips waived courses)
- Respects finance major overrides (FNCE/QFNC majors get FNCE6110/FNCE6130 instead of the abbreviated versions)
- Adjusts density based on CU load preference (Light/Normal/Heavy)

---

## Quarter Model

8 quarters across 2 years:

| Quarter ID | Label | Semester | Term |
|------------|-------|----------|------|
| `Y1F_Q1` | Year 1 Fall (Q1) | Y1F | Fall |
| `Y1F_Q2` | Year 1 Fall (Q2) | Y1F | Fall |
| `Y1S_Q3` | Year 1 Spring (Q3) | Y1S | Spring |
| `Y1S_Q4` | Year 1 Spring (Q4) | Y1S | Spring |
| `Y2F_Q5` | Year 2 Fall (Q5) | Y2F | Fall |
| `Y2F_Q6` | Year 2 Fall (Q6) | Y2F | Fall |
| `Y2S_Q7` | Year 2 Spring (Q7) | Y2S | Spring |
| `Y2S_Q8` | Year 2 Spring (Q8) | Y2S | Spring |

Graduation requires 19–21 total CU across all 8 quarters.

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `next` (16) | Framework (App Router, Turbopack) |
| `react` (19) | UI library |
| `zustand` + `immer` | State management with immutable updates |
| `@dnd-kit/core` + `@dnd-kit/sortable` | Drag-and-drop course placement |
| `@supabase/supabase-js` + `@supabase/ssr` | Database client (not yet connected) |
| `lucide-react` | Icons |
| `sonner` | Toast notifications |
| `radix-ui` | Headless UI primitives (via shadcn) |
| `tailwindcss` (v4) | Styling |
| `class-variance-authority` + `clsx` + `tailwind-merge` | Class name utilities (shadcn) |

---

## What's Not Built Yet

| Feature | Status | Notes |
|---------|--------|-------|
| Supabase database | Not connected | Tables designed, clients exist, but no migrations or seed script yet. Data lives in Zustand (in-memory, lost on refresh). |
| Auto-save | Not built | Depends on Supabase connection |
| Google OAuth | Deferred | Currently using mock login; will use Supabase Auth + Google SSO restricted to @wharton.upenn.edu |
| AI Chat panel | Deferred | Per user's choice — would integrate Claude/GPT via Vercel AI SDK |
| PDF export | Not built | `@react-pdf/renderer` not installed; only CSV and text exports work |
| Middleware route protection | Not built | `/plan` and `/onboarding` aren't protected yet |
| Data persistence | Not built | Plan state resets on page refresh |

---

## File Reference

### Type Definitions (`src/types/`)

| File | Key Types |
|------|-----------|
| `course.ts` | `CatalogCourse`, `RegistryCourse`, `ResolvedCourse` |
| `plan.ts` | `QuarterId`, `SemesterId`, `Placement`, `Plan`, `QUARTER_IDS`, `QUARTER_INFO` |
| `requirements.ts` | `CoreRequirement`, `MajorRequirement` (discriminated union for 4 structures), `WaiverDetails` |
| `validation.ts` | `ValidationResult`, `ValidationWarning`, `ValidationError`, `CoreProgress`, `MajorProgress` |
| `user.ts` | `MajorCode` (21 values), `WaiverType`, `UserProfile`, `MAJOR_OPTIONS`, `MAJOR_EXCLUSIONS` |

### Components

| Directory | Components | Purpose |
|-----------|------------|---------|
| `layout/` | `AppShell`, `Header` | 70/30 split shell, header bar |
| `plan/` | `PlanGrid`, `SemesterTile`, `QuarterColumn`, `CourseTile`, `StagingArea` | Plan view with DnD |
| `catalog/` | `CatalogBrowser` | Search, filter, browse courses |
| `course/` | `CourseModal` | Full course detail dialog |
| `progress/` | `ProgressDashboard` | Degree requirement tracking |
| `onboarding/` | `MajorSelector`, `WaiverSelector`, `LoadPreference` | Onboarding wizard steps |
| `export/` | `ExportMenu` | CSV/text export dropdown |
| `ui/` | 15 shadcn primitives | Button, Card, Dialog, Input, etc. |
