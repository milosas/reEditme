# Roadmap: reEDITme.com v3

**Milestone:** v3 Stabilization & Quality
**Phases:** 1-7
**Focus:** Fix bugs, improve reliability, polish UX

## Overview

| Phase | Name | Goal | Status |
|-------|------|------|--------|
| 1 | Frontend Foundation | Stabilize uncommitted work, verify features | Complete (6/6) |
| 2 | Try-On Quality | Improve generation reliability & garment label UX | Complete (2/2) |
| 3 | Social Publishing Fix | Fix LATE API and social connection flow | Complete (2/2) |
| 4 | Credits & Payment Polish | Handle credit/payment edge cases | Complete (3/3) |
| 5 | Landing Page & Conversion | Better examples, copy, onboarding | Pending |
| 6 | Google OAuth | Enable Google sign-in (carried from v2) | Pending |
| 7 | Email System | Welcome email, notifications | Pending |

---

## Phase 1: Stabilize In-Progress Work

**Goal:** Commit the 14 uncommitted files and verify everything works end-to-end

**Context:** There are significant uncommitted changes across Generator, PostProcessToolbar, generationService, generate-image edge function, BuyCreditsModal, Gallery, and type definitions. These include garment label picker, post-process toolbar refactor (select->apply->save flow), and edge function updates.

**Requirements:** [STAB-01, STAB-02, STAB-03, STAB-04, STAB-05]

**Uncommitted files:**
- `src/pages/Generator.tsx` — garment label state, validation, new handleApply flow
- `src/pages/Gallery.tsx` — layout/UX changes
- `src/components/generation/PostProcessToolbar.tsx` — select->apply->save refactor
- `src/components/generation/ErrorMessage.tsx` — error display tweaks
- `src/components/credits/BuyCreditsModal.tsx` — modal tweaks
- `src/components/gallery/ImageCard.tsx` — card format changes
- `src/components/gallery/ModelDetailModal.tsx` — modal updates
- `src/components/gallery/PostCard.tsx` — post card refactor
- `src/hooks/useGeneration.ts` — garment labels param
- `src/hooks/useImageUpload.ts` — upload tweak
- `src/services/generationService.ts` — service updates
- `src/types/generation.ts` — type changes
- `src/types/index.ts` — GarmentLabel type + GARMENT_LABELS constant
- `supabase/functions/generate-image/index.ts` — edge function updates

**Success Criteria:**
1. All changes committed with descriptive message
2. `npm run build` succeeds with no TypeScript errors
3. Try-on flow works end-to-end (upload garment -> select labels -> select avatar -> generate)
4. Post-process toolbar works (select action -> apply -> save/discard)
5. Edge function deployed and functional

**Plans:** 6/6 plans complete

Plans:
- [x] 01-01-PLAN.md — Project structure and core config (retroactive, v1)
- [x] 01-02-PLAN.md — UI components and image upload system (retroactive, v1)
- [x] 01-03-PLAN.md — (retroactive)
- [x] 01-04-PLAN.md — (retroactive)
- [x] 01-05-PLAN.md — Fix build error and commit all 14 uncommitted files
- [x] 01-06-PLAN.md — Deploy edge function and verify features end-to-end

---

## Phase 2: Try-On Quality

**Goal:** Improve error handling reliability with specific error types, retry functionality, and guest credit fix

**Known issues:**
- Garment label picker UX may need polish after Phase 1 commit
- Generation error handling could be more informative
- Image compression edge cases
- Try-on result quality varies

**Success Criteria:**
1. Error messages actionable (user knows what to fix)
2. Retry button works without additional credit cost
3. Guest credits only deducted on successful generation
4. Specific error types for bad image, rate limit, timeout

**Plans:** 2/2 plans complete

Plans:
- [x] 02-01-PLAN.md — Error types, translations, edge fn classification, service parsing
- [x] 02-02-PLAN.md — ErrorMessage redesign, guest credit fix, retry wiring

---

## Phase 3: Social Publishing Fix

**Goal:** Fix LATE API 400 error and improve social account connection flow

**Known issues:**
- LATE API returns 400 on social account connection
- Need to verify API key/account status at getlate.dev
- Connection flow UX unclear

**Requirements:** [SOC-01, SOC-02, SOC-03, SOC-04, SOC-05, SOC-06]

**Success Criteria:**
1. Social account connection works (Instagram, Facebook)
2. Publishing flow works end-to-end
3. Error messages clear when connection fails
4. Account status visible in dashboard

**Plans:** 6/2 plans complete

Plans:
- [x] 03-05-PLAN.md — Fix edge functions: add profileId to LATE API calls, error classification
- [x] 03-06-PLAN.md — Frontend: hook error state, popup.closed polling, Dashboard sync

---

## Phase 4: Credits & Payment Polish

**Goal:** Handle edge cases in credits and Stripe payment flow

**Areas to address:**
- Credit deduction error handling (what if deduction fails mid-generation?)
- Stripe webhook reliability
- Receipt/confirmation after purchase
- Credit transaction history visibility
- Guest-to-registered credit migration

**Requirements:** [SC-01, SC-02, SC-03, SC-04]

**Success Criteria:**
1. Payment flow handles all error states gracefully
2. Credits always accurate (no double-deduction, no free generation)
3. Users see purchase confirmation
4. Credit history accessible

**Plans:** 3/3 plans complete

Plans:
- [x] 04-01-PLAN.md — Atomic credit DB functions and shared constants module
- [x] 04-02-PLAN.md — Refactor all edge functions to use atomic credits
- [x] 04-03-PLAN.md — Payment confirmation UI, transaction history, guest credit migration

---

## Phase 5: Landing Page & Conversion

**Goal:** Improve landing page with better examples and copy

**Areas to address:**
- BeforeAfter pair 1 (crop top) too subtle — need better example
- Landing page copy polish
- Onboarding flow for new users
- Social proof (real testimonials, user count)

**Success Criteria:**
1. All BeforeAfter examples clearly show transformation
2. Landing page copy compelling and clear
3. New user path intuitive (landing -> try-on -> result)
4. Mobile landing page performs well

**Plans:** TBD

---

## Phase 6: Google OAuth

**Goal:** Enable Google sign-in (code already exists, needs provider configuration)

**Carried from:** v2 Phase 10

**What exists:**
- `src/components/auth/LoginModal.tsx` — Google button already rendered
- `src/contexts/AuthContext.tsx` — `signInWithGoogle` already implemented

**What's needed:**
- Google Cloud Console: Create OAuth credentials (client ID + secret)
- Supabase Dashboard: Configure Google OAuth provider
- Redirect URIs configured correctly

**Success Criteria:**
1. Google OAuth provider configured in Supabase
2. User can click "Sign in with Google" and authenticate
3. Google user gets profile created in profiles table
4. Redirect works on both reeditme.com and localhost

**Plans:** TBD

---

## Phase 7: Email System

**Goal:** Send welcome emails and notifications

**Options:**
- Supabase built-in email (limited customization)
- Resend (developer-friendly, good free tier)
- Custom SMTP via edge function

**Success Criteria:**
1. Welcome email sent on registration
2. Email template matches brand
3. Unsubscribe mechanism
4. Credit purchase confirmation email

**Plans:** TBD

---

## Dependencies Graph

```
Phase 1 (Stabilize)
    |
    v
Phase 2 (Try-On Quality)

Phase 3 (Social Fix) — independent
Phase 4 (Credits Polish) — independent
Phase 5 (Landing Page) — independent
Phase 6 (Google OAuth) — independent
Phase 7 (Email) — independent (after Phase 6 if welcome email needed)
```

**Note:** Phase 1 is prerequisite. Phases 2-7 are largely independent and can be tackled in any order.

---
*Roadmap created: 2026-03-07*
*Phase 3 planned: 2026-03-08*
*Phase 4 planned: 2026-03-08*
