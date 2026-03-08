---
phase: 04-credits-payment-polish
plan: 01
subsystem: database
tags: [postgres, rpc, credits, plpgsql, deno, supabase]

requires:
  - phase: 01-frontend-foundation
    provides: profiles table with credits column, credit_transactions table
provides:
  - deduct_credits Postgres RPC with FOR UPDATE row locking
  - increment_credits Postgres RPC with FOR UPDATE row locking
  - shared _shared/credits.ts module with CREDIT_COSTS, CreditAction, helper wrappers
affects: [04-02-PLAN (edge function refactor), 04-03-PLAN (payment UI)]

tech-stack:
  added: []
  patterns: [atomic-rpc-credits, shared-edge-function-modules]

key-files:
  created:
    - supabase/migrations/20260308001_atomic_credits.sql
    - supabase/functions/_shared/credits.ts
  modified: []

key-decisions:
  - "SECURITY DEFINER on both RPC functions for service_role edge function access"
  - "Array.isArray check on RPC result to handle Supabase returning single vs array"
  - "Typed error objects with .type property matching existing edge function error patterns"

patterns-established:
  - "Atomic credit operations: Always use RPC deduct_credits/increment_credits, never read-then-write"
  - "Shared edge function modules: Import from ../_shared/credits.ts for centralized constants"

requirements-completed: [SC-02, SC-01]

duration: 5min
completed: 2026-03-08
---

# Phase 4 Plan 01: Atomic Credit DB Functions Summary

**Postgres RPC functions with FOR UPDATE row locking and shared credit constants module for edge functions**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-08T16:22:28Z
- **Completed:** 2026-03-08T16:27:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Atomic `deduct_credits` RPC function prevents race conditions via SELECT ... FOR UPDATE row locking
- Atomic `increment_credits` RPC function for Stripe webhook and bonus credit flows
- Shared `_shared/credits.ts` module centralizes credit costs previously hardcoded in 7+ files
- Helper wrappers (`checkAndDeductCredits`, `addCredits`, `checkCreditsFromToken`) ready for edge function integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create atomic credit Postgres functions** - `7b8d73a` (feat)
2. **Task 2: Create shared credit constants module** - `0769c97` (feat)

## Files Created/Modified
- `supabase/migrations/20260308001_atomic_credits.sql` - deduct_credits and increment_credits RPC functions with FOR UPDATE locking
- `supabase/functions/_shared/credits.ts` - CREDIT_COSTS, CreditAction type, checkAndDeductCredits, addCredits, checkCreditsFromToken

## Decisions Made
- Used SECURITY DEFINER on both Postgres functions so edge functions with service_role key can call them via RPC
- Added Array.isArray guard on RPC response since Supabase may return single object or array for RETURNS TABLE functions
- Reused existing JWT base64url decode pattern (with `-` to `+`, `_` to `/` conversion) from current edge functions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
Migration needs to be applied to production Supabase: `npx supabase db push` or apply via Supabase Dashboard.

## Next Phase Readiness
- Both RPC functions and shared module ready for Plan 02 (refactor all edge functions to use atomic credits)
- No blockers

---
*Phase: 04-credits-payment-polish*
*Completed: 2026-03-08*
