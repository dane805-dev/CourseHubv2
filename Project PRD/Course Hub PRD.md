# PRD

# **Product Requirements Document (PRD)**

### ***Course Hub — Wharton MBA Course Planning Platform (MVP)***

---

## **1. Product Identity & Vision**

**Product Name** Course Hub

**Core Value Proposition**
Course Hub is an integrated, AI-powered course planning platform for Wharton MBA students that consolidates fragmented academic information—course lists, degree requirements, syllabi, and qualitative reviews—into a single, accurate interface. It enables students to plan and validate their academic paths efficiently while ensuring 100% alignment with degree requirements.

**Target User Personas (MVP)**

1. **First-Year MBA Students** – Need structured guidance to design a balanced, goal-aligned schedule across all 8 quarters (2 years) while satisfying core and major requirements.

*Note: Second-year students and academic advisors deferred to post-MVP.*

**Success Metrics (MVP)**

* **Adoption Rate:** % of enrolled MBAs using Course Hub for semester planning (target 60%+).

* **Data Accuracy:** 100% verified Wharton MBA course data.

* **Ease of Use:** Net Promoter Score (NPS) ≥ 8/10.

* **Plan Creation Completion Rate:** ≥ 70% of users create a valid course plan within first session.

---

## **2. Discovery Foundations**

**Problem Statement**
Wharton MBA students face inefficient, fragmented course selection processes. Critical information is dispersed across multiple platforms—university sites, departmental PDFs, Penn Course Review, and third-party dashboards—requiring manual aggregation. The result: planning friction, inconsistent data, and suboptimal course choices.

**Key Customer Insights**

* *Latent Need #1*: "I want one place where everything about my MBA program lives."

* *Latent Need #2*: "I need to know whether I'm on track for my degree without juggling PDFs and Excel sheets."

* *Pain Point #1*: Data fragmentation leads to manual cross-checking.

* *Pain Point #2*: Lack of reliable, updated course details (syllabi, workloads, timing).

* *Behavioral Context*: Students plan quarterly, often under time pressure before bidding deadlines; most are digitally savvy and expect a Notion-like interface.

**Market Landscape**

* **Current Tools**

  * *Course Match*: Optimizes course bidding, not course planning.

  * *MBA Course Recommendation Guide (Power BI)*: Visualizes skill relevance but lacks integration with requirements or live data.

* **White Space**

  * Unified, verified course data layer.

  * Degree validation with visual progress tracking.

  * Conversational recommendation experience grounded in official data.

* **AI-Advantaged Differentiation**

  * Natural language interaction for academic advising.

  * Structured data extraction and summarization from unstructured PDFs and syllabi.

  * Plan validation against evolving degree rules.

**Solution Hypothesis**
If we combine verified academic data sources with an LLM capable of structured parsing, summarization, and rule validation, we can deliver an intelligent, centralized planner that reduces student friction, ensures accuracy, and improves course satisfaction.

---

## **3. MVP Scope & Constraints**

### Target User
- **First-year MBA students only** with full 8 quarters (2 years) to complete
- Standard MBA path only - dual-degree and transfer students excluded from MVP
- Second-year onboarding (for students who have completed courses) deferred to post-MVP

### Authentication
- Google SSO restricted to **@wharton.upenn.edu emails only**
- No manual account creation - users must have valid Wharton email
- Login required before accessing any app functionality

---

## **4. Core Features & Behaviors**

### 4.1 Degree Validation Engine

**Validation Behavior:**
- Allow all plan changes with **warnings** (no blocking actions)
- Cannot save plan as "complete" if validation fails
- Show persistent red indicators for invalid states

**Requirement Types:**
- **Core requirements**: One specific course per requirement
- **Flex-core requirements**: Multiple courses can fulfill the requirement (categories and options to be provided)
- **Major requirements**: Specific to declared major(s)
- **Overall Graduation Requirement**: Total courseload tracks to 19-21 cumulative CU graduation requirement

**Credit Unit (CU) Tracking:**
- Full CU tracking toward 19-21 CU graduation requirement
- Support **0.5 CU (half-credit) courses** fully
- Per-quarter overload **warning** (not blocking) when exceeding typical 5-5.5 CU load

**Cross-Major Courses:**
- A single course can count toward **maximum 2 majors**

**Prerequisites:**
- **Soft warnings** only - display but allow override (students can get waivers)
- Warning icon on course tile + tooltip with missing prereq details

### 4.2 Major System

- Students can declare **up to 3 majors**
- Support **all Wharton MBA majors** from day one
- Declared majors only (no exploratory mode for MVP)
- Major selection during onboarding flow; user must select at least one major

### 4.3 Waiver System

**Waivable Course Types:**
- Full waiver (course requirement removed entirely)
- Half-credit waiver (waive full course, take half-credit version instead)
- Substitution (replace with upper-level course)

**CU Impact:**
- **Configurable per waiver type** - each waiver specifies how it affects total CU requirement

**Onboarding UI:**
- Guided onboarding flow, collecting user information in as few clicks as possible
- First question "Have you waived or substituted any Core or Flex requirements?"
- If yes, user presented with waiver selection screen based on Waiver Rules markdown file. 
- Display list of waivable courses
- User selects which courses and **waiver type** for each

### 4.4 Course Data

**Data Source:**
- Initial course data provided via **CSV** or **JSON** (structure to be shared by product owner)
- Flex-core category details to be provided by product owner
- Degree requirements researched from Wharton site + supplemented by provided docs

**Course Availability:**
- Courses have specific quarters when offered
- **Restrict placement** to available quarters only (cannot add course to wrong quarter)
- Show **current data only** - no historical course data

**Excluded for MVP:**
- Workload/difficulty data
- Course popularity data
- Course details populated from syllabi (e.g., exam schedule, attendance policy)

---

## **5. User Experience & Interface Design**

### 5.1 Layout

**Split-Screen Design:**
- 70% plan view / 30% chat panel (default split)
- Chat panel is **collapsible** (not resizable)
- Single-page app behavior (browser back button exits app)

**Color Mode:**
- **Dark mode only** (no light mode toggle)

**Component Library:**
- **shadcn/ui** (Radix-based components)

**Responsive Design:**
- Desktop-first with basic mobile responsiveness
- Mobile gets simplified responsive view

### 5.2 Plan View

**Timeline Structure:**
- Tile view, one semester is a tile. 4 total tiles in a 2x2 grid
- A semester tile has two quarters within
- Quarter-long course span half a tile, semester long course span the full tile
- Quarter-long course half the visual size of a semester-long course
- Labels show "Fall Semester 1"
- Tiles show a total CU count for the semester calculated by courses dropped in to semester
- Quarters show a CU count for that quarter, and the two quarters add up to total semester CU count
- Empty quarters show **drop zone only** (no hints or guidance text)

**Course Tiles Display:**
- Course code + name
- Credit units (CU)
- Type indicator (core/flex-core/major requirement/elective)
- Prerequisite warning icon (if applicable) with tooltip

**Drag-and-Drop:**
- Full reordering: between quarters AND within quarters
- Click course tile → opens **modal popup** with details

**Staging Area:**
- Located **at top of plan view**
- **No limit** on staged courses
- Courses added from catalog go here first, then user drags to desired quarter
- Ability to click and select desired semester/quarter to add course

**Duplicate Handling:**
- If adding course already in plan: **confirmation prompt**
- Options: "Move from Q2 to Q3?" or "Add second instance?"

### 5.3 Course Modal

**Content:**
- Course modal contains: Course ID, Course Title, Department, Credit_Units, Description, Prerequisites, Term_Available, Instructors_Fall, Instructors_Spring, Average_Rating_Fall, Average_Rating_Spring, Syllabi_URL
- Which requirements it fulfills for this student

**Actions:**
- **Add to staging area** button (then user drags to quarter)
- Close button

### 5.4 Course Catalog / Browse View

**Discovery Methods:**
- **Search bar** for text search
- **Filterable browse** interface

**Filtering:**
- Multi-filter with **AND logic**
- Filter by: department, quarter offered, course type

**Sorting:**
- Basic sorting options: by name, department, or credit units

**Personalization:**
- Show **requirement badges** (which of student's requirements each course fulfills)
- Show **plan status** indicator (already in plan or not)

### 5.5 Progress Dashboard

**Structure:**
- **Tabbed interface**: Core, Major 1, Major 2, Major 3, Electives
- Plus **inline indicators** within plan view

**Content per Tab:**
- Visual requirement mapping showing which courses fulfill what
- **Both percentage and missing items** with expandable toggle
- E.g., "75% complete" plus "Missing: Core STAT, 2 Finance electives"

**Interaction:**
- Clicking a requirement **highlights courses in plan** that fulfill it

### 5.6 Chat Panel

**Position:**
- Right side, collapsible
- No timestamps on messages

**History:**
- **Session-based only** - clears on logout/browser close

**Suggestion Chips:**
- **Question-focused** prompts above input
- Examples: "What are the prereqs for X?", "Compare these courses"

**Course Links:**
- Clicking course name in chat → **opens course modal**

### 5.7 Notifications

**Toast Notifications:**
- Position: **top right**
- Used for: AI action confirmations, errors, save status

**Save Indicator:**
- **Icon indicator** (syncing/saved icon like Google Docs)

---

## **6. AI Chat Agent Specification**

### 6.1 Model & Cost

- Use **cheaper model** (GPT-3.5-turbo or Claude Haiku) for MVP
- **Unlimited usage** - no rate limiting for users

### 6.2 Capabilities

**Scope:**
- **Modification assistant only** - no full plan generation from scratch
- Answer questions about courses
- Suggest course swaps/additions
- Explain requirements

**Autonomy:**
- **Always require confirmation** before any plan changes
- Flow: AI proposes change → toast notification asks user to confirm → apply if confirmed

**Context Available:**
- Course catalog data
- Student's current plan
- Student's profile (majors, waivers, preferences)
- NO Penn Course Review data for MVP

**Reasoning:**
- **Always explain** why suggesting a course
- E.g., "This fulfills your Finance major requirement"

---

## **7. Onboarding Flow**

### 7.1 New vs Returning Users

- **Login first** (Google SSO with Wharton email)
- System detects new vs returning user
- **New users**: directed to onboarding flow
- **Returning users**: return to saved plan state

### 7.2 Onboarding Questions

1. **Major selection** (1-3 majors from full list)
2. **Waived/substituted courses** (from waivable list, select waiver type for each)
3. **CU load preference** (light/normal/heavy per quarter)

### 7.3 Schedule Generation

- **Rules-based logic** (not AI-generated)
- Initial user schedule populated with fixed core classes
- Place fixed cores in Quarter 1 or Quarter 2 

### 7.4 Post-Generation

- **Immediate editing** allowed
- No "accept" step required
- User can modify generated plan right away

### 7.5 Onboarding UX

- **No tutorial** - UI should be self-explanatory
- No guided walkthrough or tooltip tour

---

## **8. Data Persistence**

### 8.1 Storage

- **Supabase** (local development first, then deploy to cloud)
- Cloud sync expected - plan accessible from any device after login

### 8.2 Auto-Save

- **Auto-save on every change** (immediate)
- Icon indicator shows save status (syncing/saved)

### 8.3 Offline

- **View-only offline** capability
- Can view cached plan offline, cannot modify without internet connection

### 8.4 Plan Versioning

- **Single active plan** for MVP
- Multiple saved plans deferred to post-MVP

---

## **9. Export Features**

### 9.1 PDF Export
- **Plan only** (course schedule by quarter)
- No progress data or requirements breakdown

### 9.2 CSV Export
- Course data in spreadsheet format

---

## **10. Technical Implementation Guide**

**Recommended Stack**

* **Frontend:** Next.js + React

* **UI Components:** shadcn/ui

* **Backend:** Supabase (Postgres)

* **Auth:** Supabase Auth with Google OAuth (restricted to @wharton.upenn.edu)

* **LLM Integration:** GPT-3.5-turbo or Claude Haiku

* **Hosting:** Vercel

---

## **11. Observability Plan**

**Key Metrics to Monitor**

* **User Behavior:** Adoption rate, plan completion rate, NPS.

* **AI Performance:** Hallucination rate, recommendation acceptance rate, chat satisfaction.

* **System Health:** API uptime, data refresh success.

**Logging Strategy**

* LLM request/response logs stored for debugging.

* User flag events logged with metadata (course ID, field flagged, free text).

**AI Transparency**

* Internal visibility: Data source tracking per course.

---

## **12. Ethical & Risk Considerations**

**Bias & Fairness**

* Objective data only; no opinion-based recommendations.

* No personalization based on demographic or identity data.

**Privacy & Data Governance**

* No sensitive student data stored beyond course preferences.

* All data encrypted in Supabase (AES-256).

* SSO login via Google (Wharton emails only).

**Failure Modes & Guardrails**

| Risk | Mitigation |
| ----- | ----- |
| Data drift (old syllabi) | Timestamp verification + quarterly refresh |
| Incorrect degree validation | Hard-coded logic validated by PMs |
| Chat misinterpretation | Confirmation prompts before plan changes |
| User overreliance | Onboarding disclaimer to verify with advisors |

---

## **13. Success Criteria & Iteration Plan**

**Definition of Done (MVP)**

* Complete Wharton MBA course dataset integrated and verified.

* Degree validation engine functional.

* Conversational agent assists with modifications accurately.

* Data accuracy ≥ 100%.

* NPS ≥ 8/10 from pilot cohort.

**Post-Launch Learning Goals**

* Measure recommendation acceptance rate.

* Track most common flags (missing data, incorrect workload).

* Gather qualitative feedback on chat trust.

**Pivot/Persevere Criteria**

* Persevere if NPS ≥ 8 and adoption > 50%.

* Iterate if hallucination > 2% or feedback highlights major usability gaps.

---

## **14. Out of Scope for MVP**

- Dual-degree students
- Transfer students
- Second-year student onboarding
- Academic advisor view
- Workload/difficulty data
- Course popularity data
- Verification badges
- Multiple saved plan versions
- Wishlist/favorites feature
- In-app feedback mechanism
- Admin dashboard
- Keyboard shortcuts (beyond basic accessibility)
- Penn Course Review integration
- AI-generated full plans from scratch
- Light mode

---

## **15. Data Requirements (To Be Provided)**

1. **Course CSV** - complete course catalog with schema
2. **Flex-core categories** - which categories exist and their course options
3. **Waivable courses list** - which cores can be waived and waiver types
4. **Major requirements** - specific courses/rules per major (to supplement research from Wharton site)

---

## **16. Terminology**

- Use **"Quarters"** (Q1-Q8)
- Display format: "Year 1 Fall (Q1)"

---

## **Appendices**

**Appendix A: Data Source Summary**

| Source | Type | Refresh Frequency |
| ----- | ----- | ----- |
| Wharton Course List (CSV) | Manual upload (provided) | As needed |
| Major Requirement Pages | Web research | Initial build |
| Flex-core/Waiver docs | Provided | Initial build |

**Appendix B: Onboarding Checklist (MVP)**

* Major(s) (up to 3)

* Waived Core Requirements (with waiver type)

* Substituted Core Requirements (with substitution details)

* Course Unit Load Preference (light/normal/heavy)

**Appendix C: AI Agent Prompts (Example Skeletons)**

* **Advisor Chat Agent:** "Explain reasoning behind this replacement and confirm user preference."

* **Course Query Agent:** "Provide course details and explain how it relates to user's requirements."

---

*This PRD incorporates all decisions from the comprehensive product interview.*
