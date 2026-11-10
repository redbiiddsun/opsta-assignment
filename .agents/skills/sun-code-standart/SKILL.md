---
name: sun-code-standart
description: Enforce naming/readability standards when writing or reviewing code — no magic strings or numbers, no single-letter variables (a, i, o, k, etc.), meaningful names. Use when the user says "apply the code standard", "no magic strings", "meaningful variable names", "clean up naming", "sun standard", or asks to review/refactor code for readability.
---

# Sun Code Standard

Apply these rules when writing new code or refactoring existing code. On review, report each violation with `file:line`, the offending name/literal, and the suggested replacement.

## Rules

1. **No magic strings or numbers.** Any literal with meaning gets a named constant.
   - Bad: `if (status === "AC")` / `setTimeout(fn, 86400000)`
   - Good: `const ACCOUNT_ACTIVE = "AC"` / `const ONE_DAY_MS = 86_400_000`
   - Exceptions: `0`, `1`, `-1`, `""`, `true/false`, and obvious array/loop bounds. Don't name what's already clear.

2. **No single/throwaway letter names.** Ban `a, b, c, i, j, k, o, x, tmp, data, val, arr, obj, res, e` as standalone names.
   - Loop index → name what it indexes: `for (const user of users)` or `userIndex`.
   - Callback params → the thing: `.map(order => ...)` not `.map(x => ...)`.
   - Exception: `x/y` for coordinates, `_` for a deliberately unused param.

3. **Meaningful names.** Name for intent, not type or mechanics.
   - Booleans read as yes/no: `isLoading`, `hasAccess`, `canEdit`.
   - Functions are verbs: `fetchUser`, `calculateTotal`.
   - Collections are plural: `users`, not `userList`.
   - No abbreviations unless industry-standard (`id`, `url`, `html`).

4. **Reusable logic goes in a util, not inline.** If the same transformation appears (or will appear) more than once, extract it to a shared util function. Never copy-paste the logic.
   - Common cases: date/time formatting & conversion, currency/number formatting, string casing/slugify, validation (email, phone), parsing.
   - Put them in a `utils/` (or `lib/`) folder, grouped by concern: `utils/date.ts`, `utils/currency.ts`.
   - Name for what it does: `formatCurrency(amount, "THB")`, `toISODate(date)`, `parseDateInput(text)`.
   - Bad: `new Intl.NumberFormat(...)` copied into three components.
   - Good: one `formatCurrency` in `utils/currency.ts`, imported everywhere.
   - Before writing a new util, check if one already exists — reuse it.

## How to apply

- Writing new code: follow the rules from the start, no cleanup pass needed.
- Refactoring: rename in place, extract literals to constants near the top of the scope (module-level for shared, local for one-off), update all references.
- Reviewing: list violations grouped by rule, most impactful first. Don't rewrite the whole file unless asked.
