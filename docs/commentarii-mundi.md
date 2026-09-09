# Commentarii Mundi

Historia Arcana customisation of the Ghost Source theme.

Commentarii Mundi is a publication area *inside* Historia Arcana, not a separate
site. This document describes what was added, why, and how to operate it.

---

## 1. What was added, and what was touched

Everything Commentarii Mundi needs is in new files. Three upstream Source files
were modified, each for a reason that has no additive alternative.

### New files

```
page-commentarii-mundi.hbs          landing page   /commentarii-mundi/
cm-conflict.hbs                     conflict page  /commentarii-mundi/ukraine/
cm-region.hbs                       region page    /commentarii-mundi/ukraine/mykolaiv/
cm-reports.hbs                      full archive   /commentarii-mundi/berichte/
                                    single report  /commentarii-mundi/ukraine/{slug}/
                                    is post.hbs -> partials/commentarii-mundi/report.hbs

partials/commentarii-mundi/
    hero.hbs              masthead with identity + map
    stats.hbs             the four hero figures
    map.hbs               map panel and integration point
    filters.hbs           conflict filter pills
    breadcrumb.hbs        Historia Arcana → CM → Konflikt → Region
    status.hbs            severity indicator
    access-badge.hbs      free / members / premium
    conflict-label.hbs    "● UKRAINE" on a report
    conflict-severity.hbs resolves a conflict's current severity
    conflict-url.hbs      canonical conflict URL
    report-card.hbs       feed item
    report-type.hbs       Update / Analyse / Hintergrund
    conflict-card.hbs     card in the Konfliktübersichten grid
    section-conflicts.hbs the grid itself
    sidebar.hbs           sidebar assembly
    panel-situation.hbs   "Aktuelle Lage"
    panel-top-conflicts.hbs "Top Konflikte"
    panel-sources.hbs     "Unsere Quellen"
    panel-signup.hbs      newsletter panel
    timeline.hbs          Chronologie
    regions.hbs           Wichtige Regionen
    actors.hbs            Akteure (available, not wired in — see §7)
    report.hbs            the single-report layout (mockup 2)
    panel-facts.hbs       "Auf einen Blick"
    panel-toc.hbs         "Inhaltsverzeichnis"
    panel-topics.hbs      "Mehr zum Thema"
    promo.hbs             CM cross-promotion (available, not wired in — see §7)
    icons/*.hbs           nine icons Source does not ship

assets/css/commentarii-mundi.css    all .cm-* styles
assets/js/commentarii-mundi.js      progressive enhancement
routes.yaml                         Ghost routing (uploaded separately, see §3)
docs/commentarii-mundi.md           this file
```

`assets/js/commentarii-mundi.js` needed **no** build change: `gulpfile.js` already
globs `assets/js/*.js`.

### Modified upstream files

| File | Change | Why it could not be additive |
|---|---|---|
| `assets/css/screen.css` | 1 `@import` + comment, at the top | `postcss-easy-import` rejects `@import` after any other statement, so the bottom of the file was not an option. Load order is harmless: every rule in the imported file is `.cm-*` namespaced, and the only Source classes it touches (`.is-title`, `.is-body`, `.gh-form`) are reached through higher-specificity selectors. |
| `post.hbs` | becomes a router: `{{#has tag="#commentarii-mundi"}}` → CM layout, `{{else}}` → the upstream article | Ghost cannot select a template by tag. The alternative — a `custom-*.hbs` template — must be picked per post in the editor, which does not fit an Admin-API-driven backend. The upstream branch is **wrapped, not re-indented**, so its lines stay byte-identical and future merges apply cleanly. Its related-posts filter reads `{{id}}` rather than `{{post.id}}` because it now sits inside `{{#post}}`. |
| `package.json` | 1 entry in `config.custom` | See §2. |

Everything else in the repository is untouched upstream Source.

---

## 2. Why there is only one theme setting

Ghost caps `config.custom` at **20 settings**. Upstream Source already defines 19.
Exactly one slot was available, and it went to the conflict roster, which has to be
server-rendered because it drives primary navigation.

```json
"commentarii_conflicts": "ukraine,sudan,naher-osten,myanmar,dr-kongo"
```

Set it in **Ghost Admin → Design → Site-wide**. It is a comma-separated list of Ghost
tag slugs, and it is the only thing that has to change when a conflict is added.

Everything else that is genuinely configuration lives on `window.COMMENTARII`, set in
**Ghost Admin → Settings → Code injection → Site header** (or written there by the
OSINT backend):

```html
<script>
  window.COMMENTARII = {
    aboutUrl:       '/commentarii-mundi/ueber/',
    methodologyUrl: '/commentarii-mundi/methodik/',
    mapPageUrl:     '/commentarii-mundi/karte/',
    mapEmbedUrl:    'https://osint.example.org/embed',
    stats: { sources: '1.348', interval: '24h' }
  };
</script>
```

Every one of these is a slot that stays hidden until a value exists. An unconfigured
install shows nothing rather than a dead link or an invented number.

---

## 3. URLs and routes.yaml

Three levels, plus the reports underneath:

| URL | Template | Layout |
|---|---|---|
| `/commentarii-mundi/` | `page-commentarii-mundi.hbs` | mockup 1, global |
| `/commentarii-mundi/ukraine/` | `cm-conflict.hbs` | mockup 1, scoped to Ukraine |
| `/commentarii-mundi/ukraine/{slug}/` | `post.hbs` → `report.hbs` | mockup 2, single report |
| `/commentarii-mundi/ukraine/mykolaiv/` | `cm-region.hbs` | region level (opt-in) |
| `/commentarii-mundi/berichte/` | `cm-reports.hbs` | all reports, cross-conflict |

Ordinary Historia Arcana posts stay at `/{slug}/` on the upstream Source layout.

The landing page needs **no** routing config — it is a Ghost page whose slug is
`commentarii-mundi`, and Ghost resolves `page-commentarii-mundi.hbs` automatically.
Everything below it needs `routes.yaml`, uploaded in **Ghost Admin → Settings → Labs
→ Routes**. A maintained copy lives in the repository root.

### Collections for conflicts, channels for regions

A **collection** owns the permalinks of the posts it matches. That is exactly what
the conflict level needs: reports must live at `/commentarii-mundi/ukraine/{slug}/`.
The usual cost of a collection — moving posts off their existing URLs — is zero
here, because Commentarii Mundi is new content with no published URLs to break.
Historia Arcana's posts stay in the root collection, untouched.

A post can belong to only **one** collection, which has three consequences:

- conflict collections must be listed **before** the root `/` collection, since the
  first match wins
- a report tagged with two conflicts lands in whichever collection is listed first
- regions cannot be collections — they would steal posts from their parent conflict

So regions are **channels**, which own no permalinks and therefore never compete for
posts. Because a channel route is explicit, it resolves ahead of the conflict
collection's `{slug}` permalink pattern — which means a region slug must not collide
with a report slug.

`/commentarii-mundi/berichte/` is a channel for the same reason: those posts already
belong to a conflict collection.

```yaml
collections:
  /commentarii-mundi/ukraine/:
    permalink: /commentarii-mundi/ukraine/{slug}/
    template: cm-conflict
    data: tag.ukraine
    filter: tag:hash-commentarii-mundi+tag:ukraine
  /:                        # must stay last
    permalink: /{slug}/
    template: index
```

Ghost replaces its *entire* routing config with the uploaded file, so `routes.yaml`
also restates the root collection and the taxonomies. Removing those blocks would
break the rest of the site.

**Without routes.yaml** only the landing page works; conflict URLs 404 and reports
stay at `/{slug}/`. The single-report layout still applies, because it is driven by
the tag in `post.hbs` rather than by the route.

---

## 4. Tags

Tags are editorial classification. They are **not** access control — Ghost's own
visibility system does that (§5).

| Tag | Role |
|---|---|
| `#commentarii-mundi` | publication identifier (**internal**, slug `hash-commentarii-mundi`); every CM report carries it |
| `ukraine`, `sudan`, … | the conflict |
| `mykolaiv`, `donetsk`, … | the region |
| `update`, `analyse`, `hintergrund` | report type |
| `#schwerwiegend`, `#ernst`, `#beobachtung` | internal severity marker |

### Why the publication tag is internal

`#commentarii-mundi` is an internal tag (slug `hash-commentarii-mundi`). Three
consequences the theme relies on:

- **`primary_tag` is always the conflict.** Ghost's `primary_tag` is the first
  *public* tag, so the internal tag can never occupy that slot. Tag order needs no
  special handling and `conflict-label.hbs` has no fallback branch.
- **`{{#foreach tags}}` never leaks it.** Foreach defaults to public visibility, so
  the publication tag and the severity markers stay out of derived region lists.
- **There is no public archive.** Ghost does not route internal tags, so
  `/tag/hash-commentarii-mundi/` does not exist. `routes.yaml` is therefore
  **required** for the full report list at `/commentarii-mundi/berichte/` — there is
  no tag-archive fallback for it.

In NQL filters use the slug (`tag:hash-commentarii-mundi`); with the `has` helper use
the display form (`{{#has tag="#commentarii-mundi"}}`).

### Severity

Severity is per-conflict and derived from the internal severity tag on that conflict's
**most recent report**. Internal tags (`#`-prefixed) are invisible to readers and
writable through the Admin API, which makes them the right carrier for machine-written
state. A conflict with no severity tag on its latest report reads as `Beobachtung`.

This costs one query per conflict listed in the Top Konflikte panel.

### Regions

Regions are not configured anywhere. They are derived: `regions.hbs` collects the tags
on a conflict's recent reports, and the JavaScript strips the conflict's own tag, the
editorial vocabulary and duplicates. Tag a report `mykolaiv` and the region appears.

---

## 5. Free / members / premium

The theme reads Ghost's real post visibility and presents it. It implements no
authentication, no payment logic and no gating of its own — Ghost already does all
of that.

| Ghost visibility | Presentation |
|---|---|
| `public` | no badge; a calm, unmarked card |
| `members` | "Mitglieder" badge with a lock |
| `paid` / `tiers` | "Premium" badge, amber |

Readers who already have access see the badge dimmed rather than hidden, so the tier
stays legible as editorial information without becoming an upsell.

`access-badge.hbs` extends the pattern already in Source's `post-card.hbs` rather than
introducing a second mechanism.

---

## 6. What is a placeholder

Per the brief, structured conflict data is a prepared integration point, not an
invention.

- **The map** renders a deliberate graticule surface and the (real) severity legend.
  No pins are ever generated server-side. Set `mapEmbedUrl` and the JavaScript swaps
  in an iframe, scoped to the current conflict via `?conflict={slug}`.
- **"Quellen analysiert" / "Aktualisierung"** are hidden until `window.COMMENTARII.stats`
  provides them.
- **Per-report source counts** ("7 Quellen" in the mockup) are not rendered. Ghost has
  no field for them and the theme will not fabricate one. `report-card.hbs` carries a
  `data-cm-report="{id}"` hook for the backend to fill.
- **"Aktuelle Lage"** counts are computed from severity markers that are already on the
  page. Nothing is authored; the panel hides itself if there is nothing to count.

Counts that *are* real: active conflicts, total reports, and per-conflict report counts
(`count.posts`).

---

## 7. Known deviations from the mockup

Stated plainly rather than papered over.

1. **"128 Berichte diese Woche"** renders as "128 Berichte". Ghost's `count.posts` is a
   lifetime total; NQL cannot express a rolling week in a template. The label matches
   the number.
2. **Map pins** are absent until a real map is embedded — see §6.
3. **Per-report source counts** are absent — see §6.
4. **"Speichern"** from mockup 2 is not rendered. Ghost has no bookmark feature, so
   the button would do nothing. "Teilen" is real and uses Ghost's `#/share`.
5. **The table of contents** is built client-side from the rendered `h2`/`h3`
   headings — Ghost exposes no outline for a post. It needs at least two headings,
   and it is hidden below 992px, where a TOC would sit *after* the text it indexes.
6. **`promo.hbs`** ("Sieh mehr mit Commentarii Mundi") is built but not wired in.
   It belongs on ordinary Historia Arcana posts, which requirement 9 keeps as
   upstream Source; enabling it means one include in `post.hbs`.
7. **Akteure** (`actors.hbs`) exists as a component but is not wired into
   `cm-conflict.hbs`. Actors vary per conflict, and with one theme setting available
   there is no honest way to configure a per-conflict list. To enable it for a single
   conflict, copy `cm-conflict.hbs` to a per-conflict template and pass explicit slugs.
8. **`order="count.posts desc"`** in `panel-top-conflicts.hbs` is the one query option
   worth checking on first load; if your Ghost version rejects it, drop the `order`.

---

## 8. Language

Commentarii Mundi strings are German literals rather than `{{t}}` keys. Adding keys
would mean editing `locales/de.json` and every other upstream locale file, creating
merge conflicts across 16 files for a publication that is German-only. If Commentarii
Mundi is ever translated, that trade-off should be revisited.

---

## 9. Merging upstream Source

```bash
git remote add upstream https://github.com/TryGhost/Source.git
git fetch upstream
git merge upstream/main
```

Expect conflicts only in the three files listed in §1:

- `assets/css/screen.css` — keep the `@import` at the top
- `post.hbs` — keep the guard and the `{{#post}}` wrapper; take upstream's markup inside
- `package.json` — keep `commentarii_conflicts`; watch the 20-setting cap if upstream
  adds settings of its own

Nothing under `partials/commentarii-mundi/`, `assets/css/commentarii-mundi.css`,
`assets/js/commentarii-mundi.js` or the `cm-*.hbs` templates can conflict with upstream.

Then rebuild and revalidate:

```bash
pnpm install --frozen-lockfile
pnpm test:ci
```

---

## 10. Adding a conflict

1. Create the Ghost tag (`ukraine`). Give it a **description** and a **feature image** —
   the theme uses both on the conflict cards.
2. Append its slug to `commentarii_conflicts` in Ghost Admin → Design.
3. Add a channel block to `routes.yaml` and re-upload it.
4. Publish a report tagged `ukraine`, `#commentarii-mundi`, and a severity tag.

The conflict now appears in the filter pills, the Konfliktübersichten grid, the Top
Konflikte panel and the Aktuelle Lage bars, with its own page at
`/commentarii-mundi/ukraine/`.
