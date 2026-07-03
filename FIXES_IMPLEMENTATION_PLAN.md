# Learning System Critical Fixes - Implementation Plan

## Status: IN PROGRESS

### COMPLETED FIXES

#### ✅ 1. Variable Shadowing Bug (CRITICAL)
- **Files:** `js/student-dashboard.js`, `js/instructor-dashboard.js`
- **Status:** FIXED
- **Change:** Renamed second `const $` to `const $$` in both files
- **Impact:** Dashboards now work correctly - DOM queries functional

---

## REMAINING CRITICAL FIXES

### 2. Missing API Endpoints (CRITICAL) - TODO
**File:** `routes/learning.js`

Need to add/fix:
- ✅ `GET /lessons` - EXISTS (line 94)
- ✅ `GET /quizzes` - EXISTS (line 107)
- ✅ `POST /courses/:id/enroll` - EXISTS (lines 69-89)
- ❌ `POST /quizzes/:id/submit` - MISSING (needed for quiz scoring)
- ❌ `PUT /courses/:id/progress` - MISSING (needed for progress tracking)

**Impact:** Students cannot submit quizzes or update progress

---

### 3. Authorization Check on PUT /courses/:id (CRITICAL) - TODO
**File:** `routes/learning.js` (line 38-50)

**Current Issue:** Instructor can edit ANY course, not just their own

**Fix:** Add ownership verification before update

```javascript
// Before update, verify instructor owns this course
const ownership = await pool.query(
    'SELECT id FROM learning.courses WHERE id = $1 AND instructor = $2',
    [id, req.user.email]
);
if (!ownership.rows.length) {
    return res.status(403).json({ error: 'Not authorized to edit this course' });
}
```

---

### 4. Database-Code Field Mismatch (HIGH) - TODO
**Files:** `sql/schema.sql`, `data/lessons.json`, `routes/learning.js`

**Issues:**
- Lessons schema missing `duration_minutes` field
- JSON uses `order` but schema uses `sort_order`
- Quiz schema field `correct_answer` vs JSON `correct`

**Fixes:**
1. Add to `learning.lessons` schema:
   ```sql
   ALTER TABLE learning.lessons ADD COLUMN duration_minutes INT;
   ```

2. Standardize field names across all data and queries

---

### 5. Incomplete Code Blocks (HIGH) - TODO
**Files:** `js/student-dashboard.js`, `js/instructor-dashboard.js`, `js/learning.js`

**Issues:**
- Functions not defined: `drawBarChart()`, `drawRadarChart()`, `drawLineChart()`
- Category click handler incomplete in `learning.js`

**Status:** Both dashboard files have chart functions defined (lines 378+)

---

## HIGH PRIORITY FIXES

### 6. Missing Lesson Completion Tracking Table (HIGH)
Add to schema:
```sql
CREATE TABLE learning.lesson_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES learning.lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);
```

### 7. Quiz Retry Limits (HIGH)
Add to schema:
```sql
ALTER TABLE learning.quizzes ADD COLUMN max_attempts INT DEFAULT 3;
ALTER TABLE learning.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    quiz_id UUID REFERENCES learning.quizzes(id),
    attempt_number INT,
    score INT,
    submitted_at TIMESTAMP,
    UNIQUE(user_id, quiz_id, attempt_number)
);
```

---

## MEDIUM PRIORITY FIXES

### 8. No Enrollment Verification
Add to protected routes that need enrollment check:
```javascript
// Verify user is enrolled before accessing course
const enrollment = await pool.query(
    'SELECT id FROM learning.enrollments WHERE user_id = $1 AND course_id = $2',
    [req.user.id, courseId]
);
if (!enrollment.rows.length) {
    return res.status(403).json({ error: 'Not enrolled in this course' });
}
```

### 9. Pagination Missing
Add limit/offset to course listing:
```javascript
const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
const offset = (Math.max(0, parseInt(req.query.page, 10) || 1) - 1) * limit;
```

### 10. Hardcoded Data
Replace all hardcoded arrays in dashboards with API calls:
- Progress percentages
- Deadlines
- Notifications
- Achievements

---

## Implementation Priority

### Phase 1 (CRITICAL - Do First)
1. ✅ Fix variable shadowing
2. ⬜ Add POST `/quizzes/:id/submit` endpoint
3. ⬜ Add PUT `/courses/:id/progress` endpoint
4. ⬜ Add authorization check on PUT `/courses/:id`

### Phase 2 (HIGH)
5. ⬜ Fix database field mismatches
6. ⬜ Add lesson completion tracking table
7. ⬜ Add quiz attempt limits
8. ⬜ Add enrollment verification

### Phase 3 (MEDIUM)
9. ⬜ Add pagination
10. ⬜ Replace hardcoded dashboard data

---

## Testing Strategy

After each fix:
1. Run `npm test` to check for regressions
2. Verify endpoint with curl/Postman
3. Check dashboard loads without errors

---

