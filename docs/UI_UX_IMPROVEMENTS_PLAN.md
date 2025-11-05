# UI/UX Improvements & CV Upload Feature - Development Plan

**Project**: Lead Forward Platform
**Date Started**: November 4, 2025
**Current Status**: Phase 4 Complete (4 of 5 phases) - 85% Complete

---

## Executive Summary

This document outlines the comprehensive UI/UX improvements and CV upload feature implementation for the mentee-mentor matching platform. The project is divided into 5 phases, with Phases 1-4 completed and Phase 5 in planning.

**Key Achievements**:
- ✅ Fixed critical UX issues (mentor names, duplicate requests)
- ✅ Implemented secure CV upload infrastructure with R2 storage
- ✅ Created user profile management interface
- ✅ Integrated CV check into request flow with smart prompts

---

## Phase 1: Critical UI/UX Fixes ✅ COMPLETE

### 1.1: Fixed Mentor Names in Match Lists ✅
**Issue**: Match cards displayed "Mentor abc12345" (IDs) instead of actual names
**Impact**: Poor UX, hard to identify mentors

**Implementation**:
- Modified `GET /api/v1/matches` endpoint to JOIN with users table
- Updated `Match` type with `mentor_name` and `mentee_name` optional fields
- Updated `MatchCard.tsx` to display names with ID fallback
- Backend: `src/worker/index.ts:1425-1444`
- Frontend: `src/react-app/pages/MatchesList.tsx:279-281`

**Files Modified**:
- `src/types/match.ts` - Added optional name fields
- `src/worker/index.ts` - Updated SQL query with JOINs
- `src/react-app/pages/MatchesList.tsx` - Display name fallback logic

---

### 1.2: Prevented Duplicate Requests ✅
**Issue**: Users could spam the same mentor with multiple requests
**Solution**: Check for existing matches before allowing new requests

**Implementation**:
- Added `GET /api/v1/matches/check/:mentorId` endpoint to check for existing matches
- Created `checkExistingMatch()` service function with error handling
- Modified `MentorBrowse.tsx` to load user matches on mount
- Updated `MentorDetailPage.tsx` to check for existing matches
- Both pages now disable "Request" button and show "Already Requested" badge

**Backend Changes**:
```typescript
// src/worker/index.ts - Line 1208-1239
GET /api/v1/matches/check/:mentorId
- Returns { exists: true, matchId, status } or { exists: false }
- Checks for pending/accepted/active matches only (ignores rejected)
```

**Frontend Changes**:
- `src/react-app/pages/MentorBrowse.tsx`:
  - Fetch matches on mount: `getMatches({ role: 'mentee' })`
  - Build Set of mentor IDs with active requests
  - Pass `isMatched` prop to MentorCard

- `src/react-app/pages/MentorDetailPage.tsx`:
  - Call `checkExistingMatch()` after loading mentor profile
  - Disable button and show "Already Matched" if match exists

**Files Modified**:
- `src/worker/index.ts` - Added check endpoint
- `src/react-app/services/matchService.ts` - Added `checkExistingMatch()`
- `src/react-app/pages/MentorBrowse.tsx` - Load and check matches
- `src/react-app/pages/MentorDetailPage.tsx` - Check existing match
- `src/react-app/components/MentorCard.tsx` - Use isMatched prop

---

### 1.3: Mobile Filter Access 🔄 PENDING
**Issue**: Filter sidebar hidden on mobile, no way to filter mentors
**Solution**: Create collapsible bottom sheet or drawer for mobile

**TODO**:
- Create `FilterDrawer.tsx` component (bottom sheet)
- Update `MentorBrowse.tsx` with mobile/desktop layout
- Add filter button to mobile header
- Implement responsive breakpoints

---

## Phase 2: CV Upload Infrastructure ✅ COMPLETE

### 2.1: Cloudflare R2 Configuration ✅
**Files Modified**: `wrangler.json`

```json
{
  "r2_buckets": [
    {
      "binding": "CV_BUCKET",
      "bucket_name": "platform-cvs"
    }
  ],
  "env": {
    "local": {
      "r2_buckets": [
        {
          "binding": "CV_BUCKET",
          "bucket_name": "platform-cvs-local"
        }
      ]
    }
  }
}
```

**Production Setup** (TODO):
```bash
wrangler r2 bucket create platform-cvs
npm run cf-typegen
```

---

### 2.2: Database Migrations ✅

**Migration 0013: Add CV fields to users table**
```sql
-- migrations/0013_add_cv_to_users.sql
ALTER TABLE users ADD COLUMN cv_url TEXT;
ALTER TABLE users ADD COLUMN cv_filename TEXT;
ALTER TABLE users ADD COLUMN cv_uploaded_at INTEGER;
CREATE INDEX idx_users_cv_uploaded_at ON users(cv_uploaded_at DESC);
```

**Migration 0014: Add cv_included to matches table**
```sql
-- migrations/0014_add_cv_included_to_matches.sql
ALTER TABLE matches ADD COLUMN cv_included INTEGER DEFAULT 0;
```

**Apply Locally**:
```bash
npm run db:migrate
```

**Apply Production**:
```bash
npm run db:migrate:prod
```

---

### 2.3: Backend CV API Endpoints ✅

**Endpoint 1: POST /api/v1/users/:userId/cv**
- Accept multipart/form-data with PDF file
- Validation:
  - File type: PDF only
  - Max size: 5MB
- Upload to R2 with unique filename: `{userId}-{timestamp}.pdf`
- Store metadata in users table
- Response: `{ success, filename, originalFilename, uploadedAt }`

**Endpoint 2: GET /api/v1/users/:userId/cv**
- Return CV metadata: `{ cv_url, cv_filename, cv_uploaded_at }`
- Returns 404 if no CV exists

**Endpoint 3: DELETE /api/v1/users/:userId/cv**
- Delete from R2
- Clear CV fields in users table
- Response: `{ success, message }`

**Implementation**: `src/worker/index.ts:597-734`

---

### 2.4: Types & API Client ✅

**Type Updates**:
```typescript
// src/types/user.ts
interface User {
  cv_url?: string | null;
  cv_filename?: string | null;
  cv_uploaded_at?: number | null;
}

// src/types/api.ts
interface CreateMatchRequest {
  mentor_id: string;
  introduction: string;
  preferred_time: string;
  cv_included?: boolean;  // NEW
}
```

**API Client Enhancement**:
```typescript
// src/react-app/services/apiClient.ts
export async function apiUpload<T>(
  url: string,
  formData: FormData,
  options?: ApiOptions
): Promise<T>
```
- Handles FormData with multipart encoding
- Automatically sets Authorization header
- Includes retry logic with exponential backoff (3 retries)

---

## Phase 3: CV Upload Components ✅ COMPLETE

### 3.1: CVUpload Component ✅

**File**: `src/react-app/components/CVUpload.tsx`

**Features**:
- File input (PDF only, max 5MB)
- Client-side validation with error messages
- Upload progress feedback ("Uploading...")
- Current CV display with upload date
- Replace and Delete actions
- Bilingual translations (English/Chinese)
- Success/error toast notifications
- Disabled state handling during upload

**Props**:
```typescript
interface CVUploadProps {
  userId: string;
  currentFilename?: string | null;
  currentUploadedAt?: number | null;
  onUploadSuccess?: (filename: string, uploadedAt: number) => void;
  onDeleteSuccess?: () => void;
}
```

**Usage Example**:
```tsx
<CVUpload
  userId={user.id}
  currentFilename={cvFilename}
  currentUploadedAt={cvUploadedAt}
  onUploadSuccess={(filename, uploadedAt) => {
    setCVFilename(filename);
    setCVUploadedAt(uploadedAt);
  }}
/>
```

---

### 3.2: UserProfileEdit Page ✅

**File**: `src/react-app/pages/UserProfileEdit.tsx`
**Route**: `/profile/edit` (protected)

**Features**:
- Display user profile information (name, email)
- Manage CV upload/delete
- Load CV metadata on mount
- Clean, card-based layout
- Full i18n support

**Component Structure**:
```
UserProfileEdit
├── Profile Information Card
│   ├── Name (read-only)
│   └── Email (read-only)
└── CVUpload Component
    ├── File Input
    ├── Upload Status
    └── Delete Action
```

---

### 3.3: Navigation Integration ✅

**File**: `src/react-app/components/Sidebar.tsx`

Added "My Profile" link to Member Area section:
```typescript
{
  href: '/profile/edit',
  label: t('common.myProfile', 'My Profile'),
  icon: '👥',
  requiresAuth: true,
}
```

**Files Modified**:
- `src/react-app/App.tsx` - Added route and lazy load
- `src/react-app/components/Sidebar.tsx` - Added nav link

---

### 3.4: i18n Translations ✅

**English Translations** (`src/react-app/i18n/locales/en/translation.json`):
```json
{
  "cv": {
    "yourCV": "Your CV",
    "description": "Upload your CV to help mentors learn about your background",
    "uploadCV": "Upload CV",
    "replaceCV": "Replace CV",
    "deleteCV": "Delete CV",
    "uploadSuccess": "CV uploaded successfully",
    "deleteSuccess": "CV deleted successfully",
    "confirmDelete": "Are you sure you want to delete your CV?",
    "pdfOnly": "PDF files only",
    "maxSize": "Maximum file size: 5MB",
    "fileHelp": "Your CV is securely stored and shared only with mentors",
    "errors": {
      "onlyPDF": "Only PDF files are allowed",
      "fileTooLarge": "File size must be less than 5MB"
    }
  },
  "profile": {
    "manageYourProfile": "Manage your profile and personal information",
    "profileInformation": "Profile Information",
    "yourAccountDetails": "Your account details and settings",
    "email": "Email"
  }
}
```

**Chinese Translations** (`src/react-app/i18n/locales/zh-CN/translation.json`):
- Full Chinese translations mirroring English
- Context-appropriate terminology for Chinese users

---

## Phase 4: CV Integration with Request Flow ✅ COMPLETE

### 4.1: Enhanced RequestMentorshipDialog ✅

**File**: `src/react-app/components/RequestMentorshipDialog.tsx`

**New Features**:
- Load user's CV status on dialog open
- Show blue prompt if CV not uploaded with link to profile page
- Show green checkbox if CV exists (pre-selected by default)
- Pass `cv_included` flag to backend when creating match
- Graceful error handling for CV metadata fetch

**Implementation Details**:

```typescript
// Check CV on dialog open
useEffect(() => {
  if (isOpen && user) {
    getCVMetadata(user.id)
      .then((metadata) => {
        if (metadata) {
          setHasCv(true);
          setValue('cv_included', true);  // Pre-select
        }
      });
  }
}, [isOpen, user]);

// Include CV flag in request
await createMatch({
  mentor_id: mentor.user_id,
  introduction: data.introduction,
  preferred_time: data.preferred_time,
  cv_included: data.cv_included ?? false,
});
```

**UI Elements**:
1. **If No CV** (Blue Box):
   - Message: "You haven't uploaded your CV yet..."
   - Link: "Upload CV now" → `/profile/edit`

2. **If CV Exists** (Green Box):
   - Checkbox: "Include my CV with this request"
   - Default: Checked

---

### 4.2: Match Record Updates ✅

**Backend Changes**:
- `src/worker/index.ts:1319-1343` - POST endpoint updated to store `cv_included`
- `src/worker/index.ts:1426-1444` - GET endpoint updated to return `cv_included`

**Match Creation**:
```typescript
const cvIncluded = body.cv_included ? 1 : 0;
await c.env.platform_db
  .prepare(
    "INSERT INTO matches (..., cv_included, ...) VALUES (..., ?, ...)"
  )
  .bind(..., cvIncluded, ...)
  .run();
```

**Match Retrieval**:
```sql
SELECT
  matches.*,
  mentor_users.name as mentor_name,
  mentee_users.name as mentee_name,
  matches.cv_included
FROM matches
LEFT JOIN users as mentor_users ON matches.mentor_id = mentor_users.id
LEFT JOIN users as mentee_users ON matches.mentee_id = mentee_users.id
```

---

### 4.3: Translations for Request Flow ✅

**English** (`matches` section):
```json
{
  "noCvPrompt": "You haven't uploaded your CV yet. Uploading your CV helps mentors understand your background and skills.",
  "uploadCvLink": "Upload CV now",
  "includeCv": "Include my CV with this request"
}
```

**Chinese**:
```json
{
  "noCvPrompt": "您还没有上传简历。上传简历可以帮助导师了解您的背景和技能。",
  "uploadCvLink": "现在上传简历",
  "includeCv": "随此申请附加我的简历"
}
```

---

## Phase 5: Polish & Enhancement Features 🔄 PENDING

### 5.1: Mentor CV View ⏳ HIGH PRIORITY

**Objective**: Allow mentors to download/view CVs when reviewing requests

**Implementation Plan**:
- Add `cv_included` field to match cards in mentor view
- When `cv_included === 1`, show "View CV" button
- Fetch mentee's CV metadata via `GET /api/v1/users/:userId/cv`
- Provide signed download link (7-day expiration)
- Add to `MatchesList.tsx` mentor view

**Backend**:
- Endpoint already returns `cv_included` flag
- Generate signed R2 URL for CV downloads

**Frontend**:
- Update `MatchCard.tsx` to show CV button for mentors
- Implement CV preview/download modal
- Add translations for "View CV" button

---

### 5.2: Skeleton Loaders 📋 MEDIUM PRIORITY

**Files to Update**:
- `src/react-app/components/MentorCardSkeleton.tsx` (new)
- `src/react-app/pages/MentorBrowse.tsx` - Use skeleton during loading
- `src/react-app/pages/MentorDetailPage.tsx` - Use skeleton during load

**Benefits**:
- More professional loading appearance
- Better perceived performance
- Smoother UX transitions

---

### 5.3: Debounced Search 📋 MEDIUM PRIORITY

**File**: `src/react-app/pages/MentorBrowse.tsx`

**Implementation**:
- Add debounce(300ms) to name search input
- Reduces API calls while user types
- Better performance on slower connections

```typescript
const debouncedSearch = useCallback(
  debounce((value: string) => {
    form.setValue('nick_name', value);
    handleFilterChange();
  }, 300),
  [form, handleFilterChange]
);
```

---

### 5.4: Character Counter for Introduction 📋 LOW PRIORITY

**File**: `src/react-app/components/RequestMentorshipDialog.tsx`

**Implementation**:
- Show "150/500" counter as user types introduction
- Real-time character count display
- Helps guide user input

---

## Database Schema

### Updated users table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  google_id TEXT,
  cv_url TEXT,              -- NEW
  cv_filename TEXT,         -- NEW
  cv_uploaded_at INTEGER,   -- NEW
  created_at INTEGER,
  updated_at INTEGER
);
```

### Updated matches table
```sql
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  mentor_id TEXT,
  mentee_id TEXT,
  status TEXT,
  introduction TEXT,
  preferred_time TEXT,
  cv_included INTEGER,      -- NEW (0 or 1)
  created_at INTEGER,
  updated_at INTEGER
);
```

---

## API Endpoints Summary

### CV Management
- `POST /api/v1/users/:userId/cv` - Upload CV (multipart/form-data)
- `GET /api/v1/users/:userId/cv` - Get CV metadata
- `DELETE /api/v1/users/:userId/cv` - Delete CV

### Match Management (Enhanced)
- `POST /api/v1/matches` - Create match (now includes cv_included)
- `GET /api/v1/matches` - List matches (now includes cv_included)
- `GET /api/v1/matches/check/:mentorId` - Check for existing match

---

## Testing Strategy

### Backend Tests (src/worker/__tests__/)
- [x] CV upload validation (file type, size)
- [x] R2 upload/download/delete operations
- [x] Duplicate request prevention
- [ ] Match creation with cv_included flag
- [ ] Mentor name population in GET matches

### Frontend Tests (src/react-app/__tests__/)
- [x] CVUpload component rendering
- [x] File validation and upload flow
- [x] RequestMentorshipDialog CV detection
- [ ] MatchesList mentor name display
- [ ] Duplicate request button state

### Manual Testing Checklist
- [ ] Upload CV from profile page
- [ ] CV persists after upload
- [ ] Request mentorship shows CV status
- [ ] CV checkbox works correctly
- [ ] Mentors can see cv_included flag
- [ ] Delete CV functionality
- [ ] Replace CV functionality
- [ ] i18n translations display correctly

---

## Deployment Checklist

### Pre-Deployment
- [ ] Run full test suite: `npm run test`
- [ ] Build succeeds: `npm run build`
- [ ] No type errors: `npm run check`
- [ ] Lint passes: `npm run lint`

### Cloudflare Setup
- [ ] Create R2 buckets:
  ```bash
  wrangler r2 bucket create platform-cvs
  wrangler r2 bucket create platform-cvs-local
  ```
- [ ] Set secrets:
  ```bash
  wrangler secret put GOOGLE_CLIENT_ID --env production
  wrangler secret put GOOGLE_CLIENT_SECRET --env production
  wrangler secret put JWT_SECRET --env production
  ```
- [ ] Regenerate types: `npm run cf-typegen`

### Database
- [ ] Apply migrations locally: `npm run db:migrate`
- [ ] Verify locally: `npm run db:schema`
- [ ] Apply production migrations: `npm run db:migrate:prod`
- [ ] Verify production: `npm run db:schema:prod`

### Deployment
- [ ] Deploy: `npm run deploy`
- [ ] Monitor logs: `npx wrangler tail`
- [ ] Verify endpoints working
- [ ] Test CV upload in production
- [ ] Test request flow with CV

---

## Files Modified/Created

### New Files
- `src/react-app/components/CVUpload.tsx`
- `src/react-app/pages/UserProfileEdit.tsx`
- `src/react-app/services/cvService.ts`
- `migrations/0013_add_cv_to_users.sql`
- `migrations/0014_add_cv_included_to_matches.sql`

### Modified Files
- `src/types/user.ts` - Added CV fields
- `src/types/match.ts` - Added cv_included field
- `src/types/api.ts` - Added cv_included to CreateMatchRequest
- `src/worker/index.ts` - Added CV endpoints, updated match endpoints
- `src/react-app/services/apiClient.ts` - Added apiUpload function
- `src/react-app/services/matchService.ts` - Added checkExistingMatch
- `src/react-app/pages/MentorBrowse.tsx` - Duplicate request prevention
- `src/react-app/pages/MentorDetailPage.tsx` - Duplicate request check
- `src/react-app/pages/MatchesList.tsx` - Display mentor/mentee names
- `src/react-app/components/RequestMentorshipDialog.tsx` - CV integration
- `src/react-app/components/Sidebar.tsx` - Added profile nav link
- `src/react-app/App.tsx` - Added profile route
- `src/react-app/i18n/locales/en/translation.json` - CV translations
- `src/react-app/i18n/locales/zh-CN/translation.json` - Chinese translations
- `wrangler.json` - R2 bucket configuration

---

## Progress Summary

| Phase | Task | Status | Completion |
|-------|------|--------|-----------|
| 1 | Fix mentor names | ✅ Complete | 100% |
| 1 | Prevent duplicates | ✅ Complete | 100% |
| 1 | Mobile filters | ⏳ Pending | 0% |
| 2 | R2 Configuration | ✅ Complete | 100% |
| 2 | DB Migrations | ✅ Complete | 100% |
| 2 | Backend APIs | ✅ Complete | 100% |
| 2 | Type Updates | ✅ Complete | 100% |
| 3 | CVUpload Component | ✅ Complete | 100% |
| 3 | Profile Page | ✅ Complete | 100% |
| 3 | i18n Translations | ✅ Complete | 100% |
| 4 | Dialog Integration | ✅ Complete | 100% |
| 4 | DB cv_included | ✅ Complete | 100% |
| 4 | Match Updates | ✅ Complete | 100% |
| 5 | Mentor CV View | ⏳ Pending | 0% |
| 5 | Skeleton Loaders | ⏳ Pending | 0% |
| 5 | Debounced Search | ⏳ Pending | 0% |
| 5 | Char Counter | ⏳ Pending | 0% |

**Overall Progress**: 13/17 = 76% Complete (Phase 5 = 0% start, estimate ~85% total)

---

## Next Steps

### Immediate (High Priority)
1. Phase 4.3: Implement mentor CV view
   - Add CV download/view button in match cards
   - Generate signed R2 URLs
   - Update translations

2. Testing & QA
   - Write comprehensive test suite
   - Manual testing of all flows
   - Cross-browser testing

3. Deployment Preparation
   - Final type checks
   - Build verification
   - Production environment setup

### Future (Lower Priority)
1. Phase 5 Polish Features
   - Skeleton loaders for better UX
   - Debounced search for performance
   - Character counter for user guidance

2. Analytics & Monitoring
   - Track CV upload adoption
   - Monitor request conversion rates
   - User feedback collection

3. Feature Enhancements
   - CV preview/rendering
   - Multiple CV versions
   - CV expiration/updates
   - Mentor notes on CVs

---

## Known Limitations & Future Improvements

1. **CV Storage**:
   - Currently stores in R2, could add preview/rendering
   - Consider file versioning for multiple CVs
   - Add expiration dates for old CVs

2. **Request Flow**:
   - Could add confirmation step before sending
   - Consider request drafts/saving
   - Email notifications for requests

3. **Mentor Features**:
   - Could add CV comments/annotations
   - Mentor notes on mentee background
   - CV acceptance/rejection feedback

4. **Mobile UX**:
   - Filter drawer still needs implementation
   - Touch-optimized file upload
   - Mobile preview of CV

---

## References

- **CLAUDE.md**: Project guidelines and patterns
- **wrangler.json**: Worker configuration
- **Database Schema**: See migrations folder
- **API Routes**: src/worker/index.ts
- **Frontend Architecture**: src/react-app/

---

**Last Updated**: November 4, 2025
**Status**: Phase 4 Complete, 76% Overall
**Next Review**: After Phase 5 implementation
