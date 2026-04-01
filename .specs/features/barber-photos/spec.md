# Barber Photos on Step 2 – Specification

## Problem Statement

The barber selection step (step 2 of the booking flow) currently shows a generic 💈 emoji for every barber instead of their actual photo. Users can't visually identify the barber they're choosing, which reduces trust and makes the experience feel impersonal. All barber photos already exist as static assets in `packages/web/public/`.

## Goals

- [ ] Display each barber's real photo on their selection card in step 2
- [ ] Populate `avatarUrl` in the database for the 3 existing barbers
- [ ] Gracefully fall back to a placeholder when no `avatarUrl` is available

## Out of Scope

| Feature | Reason |
|---------|--------|
| Photo upload via admin panel | Separate admin feature, not needed now |
| Cropping / image optimization | Images are already production-ready JPEGs |
| Showing the photo elsewhere (sticky bar, confirmation) | Only step 2 is in scope |

---

## User Stories

### P1: Display barber photo on selection card ⭐ MVP

**User Story**: As a customer, I want to see the barber's photo on their card so that I can recognize who I'm booking with.

**Why P1**: Core visual change — everything else is just enabling infrastructure.

**Acceptance Criteria**:

1. WHEN step 2 loads and `avatarUrl` is set THEN the card SHALL render an `<img>` with the barber's photo instead of the 💈 emoji
2. WHEN the image loads successfully THEN it SHALL be circular, matching the current 56×56px container (`w-14 h-14 rounded-full`)
3. WHEN the barber is selected THEN the photo container SHALL show the gold border (same as current emoji container behavior)
4. WHEN `avatarUrl` is `null` THEN the card SHALL fall back to the 💈 emoji (no broken image icon)

**Independent Test**: Open booking flow → step 2 → see real photos instead of emoji for all 3 barbers.

---

### P1: Populate `avatarUrl` in the database ⭐ MVP

**User Story**: As a developer, I want the existing barbers to have `avatarUrl` set in the DB so that the frontend can display their photos.

**Why P1**: Without DB data, the frontend change has nothing to display.

**Acceptance Criteria**:

1. WHEN the update script runs THEN `avatarUrl` for each barber SHALL be set to the correct public path:
   - `matheus` (Matheus Kemp) → `/matheus-kemp.jpeg`
   - `adenilson` (Adenilson Fogaça) → `/adenilson.jpeg`
   - `vandson` (Vandson Metélo) → `/vandson.jpeg`
2. WHEN the seed is re-run THEN the `avatarUrl` values SHALL be preserved (upsert `update` block includes `avatarUrl`)

**Independent Test**: Query `SELECT slug, avatar_url FROM barbers` and confirm all 3 rows have non-null values.

---

## Edge Cases

- WHEN a barber has `avatarUrl = null` THEN the card SHALL render the emoji fallback, not a broken `<img>` tag
- WHEN the image file is missing or 404 THEN the `onError` handler SHALL swap to the emoji fallback
- WHEN a new barber is added without a photo THEN the fallback SHALL apply automatically (no code change needed)

---

## Requirement Traceability

| Requirement ID | Story | Status |
|----------------|-------|--------|
| BPHOTO-01 | P1: Display photo on card | Pending |
| BPHOTO-02 | P1: Circular crop + gold border on select | Pending |
| BPHOTO-03 | P1: Emoji fallback when no avatarUrl | Pending |
| BPHOTO-04 | P1: Populate avatarUrl in DB | Pending |
| BPHOTO-05 | P1: Seed preserves avatarUrl on re-run | Pending |

---

## Success Criteria

- [ ] All 3 barber cards show photos in step 2 in production
- [ ] Selecting a barber still shows gold border on the photo container
- [ ] Re-seeding the DB does not wipe the `avatarUrl` values
- [ ] No broken image icons under any condition
