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
    article-header.hbs    CM strip above a report
    article-footer.hbs    methodology + conflict-scoped related reports
    promo.hbs             CM cross-promotion for Historia Arcana posts
    icons/*.hbs           seven icons Source does not ship

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
| `post.hbs` | guarded include at the top; related-posts block wrapped | Ghost has no tag-conditional post template. The alternative — a `custom-*.hbs` template — must be picked per post in the editor, which does not fit an Admin-API-driven backend. The related block moved inside `{{#post}}` because `{{#has}}` needs a post context; its markup is otherwise byte-identical to upstream. |
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

`/commentarii-mundi/` works with **no** routing config: it is a Ghost page whose slug
is `commentarii-mundi`, and Ghost picks up `page-commentarii-mundi.hbs` automatically.

The deeper levels need `routes.yaml`, uploaded in **Ghost Admin → Settings → Labs →
Routes**. A copy lives in the repository root as the maintained reference.

### Channels, not collections

This matters, so it is worth being explicit.

A **collection** owns the permalinks of the posts it matches, and a post can belong to
exactly one collection. Routing Commentarii Mundi through collections would move every
CM post off its current `/{slug}/` URL, and a later region collection would compete
with its parent conflict collection for the same posts.

A **channel** is a filtered view that owns no permalinks. So:

- every existing Historia Arcana URL is untouched
- conflict and region levels coexist without stealing posts from each other
- adding a conflict is three lines of YAML and no content migration

```yaml
/commentarii-mundi/ukraine/:
  controller: channel
  template: cm-conflict
  data: tag.ukraine
  filter: tag:hash-commentarii-mundi
```

Ghost replaces its *entire* routing config with the uploaded file, so `routes.yaml`
also restates Ghost's default collection and taxonomies. Removing those blocks would
break the rest of the site.

**Without routes.yaml:** conflict links 404. To run in that mode, edit the single line
in `partials/commentarii-mundi/conflict-url.hbs` to emit `{{url}}` instead, and
conflicts fall back to Ghost's native `/tag/{slug}/` pages — those are *public*
conflict tags, so they route fine.

The full report archive has no such fallback: `#commentarii-mundi` is internal and
Ghost does not route internal tags, so `/commentarii-mundi/berichte/` needs the
channel.

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
4. **Akteure** (`actors.hbs`) exists as a component but is not wired into
   `cm-conflict.hbs`. Actors vary per conflict, and with one theme setting available
   there is no honest way to configure a per-conflict list. To enable it for a single
   conflict, copy `cm-conflict.hbs` to a per-conflict template and pass explicit slugs.
5. **`order="count.posts desc"`** in `panel-top-conflicts.hbs` is the one query option
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
