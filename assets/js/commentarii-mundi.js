/* Commentarii Mundi
 *
 * Historia Arcana customisation — NOT part of upstream Ghost Source.
 *
 * Picked up automatically by the existing gulp glob (assets/js/*.js), so adding
 * this file required no change to gulpfile.js.
 *
 * Everything here is progressive enhancement over server-rendered markup:
 *   - marks the active conflict filter
 *   - tallies conflict severity into the "Aktuelle Lage" bars
 *   - dedupes derived region tags
 *   - swaps the map placeholder for a configured embed
 *
 * All of it no-ops cleanly when the relevant markup is absent, so it costs
 * nothing on ordinary Historia Arcana pages.
 */

(function () {
    'use strict';

    /* Integration config.
       Lives on window rather than in theme settings because Ghost caps
       config.custom at 20 entries and upstream Source already uses 19 — the one
       remaining slot went to the conflict roster, which must be server-rendered.
       Set this in Ghost Admin → Code injection → Site header, or have the OSINT
       backend write it there:

         window.COMMENTARII = {
           aboutUrl:       '/commentarii-mundi/ueber/',
           methodologyUrl: '/commentarii-mundi/methodik/',
           mapPageUrl:     '/commentarii-mundi/karte/',
           mapEmbedUrl:    'https://osint.example.org/embed',
           stats: { sources: '1.348', interval: '24h' }
         };

       Every consumer below is a slot that stays hidden until a value exists, so an
       unconfigured install shows nothing rather than a broken link or a fake number. */
    var CONFIG = window.COMMENTARII || {};

    function reveal(el) {
        el.hidden = false;
        el.removeAttribute('hidden');
    }

    /* Auxiliary links (Über / Methodik / Karte). */
    var LINK_KEYS = {about: 'aboutUrl', methodology: 'methodologyUrl', map: 'mapPageUrl'};

    function fillLinks() {
        document.querySelectorAll('[data-cm-link]').forEach(function (link) {
            var url = CONFIG[LINK_KEYS[link.getAttribute('data-cm-link')]];
            if (!url) return;

            link.setAttribute('href', url);
            reveal(link);
        });
    }

    /* Hero stats the theme cannot derive from Ghost. */
    function fillStats() {
        var stats = CONFIG.stats || {};

        document.querySelectorAll('[data-cm-stat]').forEach(function (stat) {
            var value = stats[stat.getAttribute('data-cm-stat')];
            var valueEl = stat.querySelector('[data-cm-stat-value]');
            if (!value || !valueEl) return;

            valueEl.textContent = value;
            reveal(stat);
        });
    }

    /* Active filter pill.
       Resolved here rather than in Handlebars: comparing the current slug against
       a partial parameter would need a parent-scope lookup across two nested block
       frames, whose depth differs between {{#get}} and {{#foreach}}. */
    function markActiveFilter() {
        document.querySelectorAll('[data-cm-filters]').forEach(function (nav) {
            var active = nav.getAttribute('data-cm-active') || 'all';
            var pill = nav.querySelector('[data-cm-filter="' + CSS.escape(active) + '"]');
            if (!pill) return;

            pill.classList.add('is-active');
            pill.setAttribute('aria-current', 'page');
        });
    }

    /* "Aktuelle Lage" — count the severity markers the Top Konflikte panel already
       rendered. Nothing is invented client-side; if there are no markers the panel
       stays hidden rather than showing three zeroes. */
    function fillSituationPanel() {
        var panel = document.querySelector('[data-cm-situation]');
        if (!panel) return;

        var markers = document.querySelectorAll('.cm-rank-list [data-cm-severity]');
        if (!markers.length) return;

        var counts = {critical: 0, serious: 0, watch: 0};
        markers.forEach(function (marker) {
            var severity = marker.getAttribute('data-cm-severity');
            if (Object.prototype.hasOwnProperty.call(counts, severity)) {
                counts[severity] += 1;
            }
        });

        var max = Math.max(counts.critical, counts.serious, counts.watch);
        if (max === 0) return;

        panel.querySelectorAll('[data-cm-situation-row]').forEach(function (row) {
            var value = counts[row.getAttribute('data-cm-situation-row')] || 0;
            var valueEl = row.querySelector('[data-cm-situation-value]');
            var barEl = row.querySelector('[data-cm-situation-bar]');

            if (valueEl) valueEl.textContent = value;
            if (barEl) barEl.style.width = Math.round((value / max) * 100) + '%';
        });

        reveal(panel);
    }

    /* Derived regions.
       regions.hbs renders every tag from the conflict's recent reports, duplicates
       and all, because Handlebars cannot dedupe. Strip the editorial vocabulary and
       the conflict's own tag, keep first occurrences, and reveal the section only if
       anything is left.

       Internal tags (#commentarii-mundi, the severity markers) are already excluded
       by {{#foreach tags}}, which defaults to public visibility; the hash- guard
       below is belt and braces. */
    var EDITORIAL_TAGS = [
        'update',
        'analyse',
        'analysis',
        'hintergrund',
        'background'
    ];

    function dedupeRegions() {
        document.querySelectorAll('[data-cm-regions]').forEach(function (section) {
            var conflict = section.getAttribute('data-cm-region-conflict');
            var list = section.querySelector('[data-cm-region-list]');
            if (!list) return;

            var seen = Object.create(null);
            var kept = 0;

            list.querySelectorAll('[data-cm-region]').forEach(function (item) {
                var slug = item.getAttribute('data-cm-region');
                var drop = !slug ||
                    slug === conflict ||
                    EDITORIAL_TAGS.indexOf(slug) !== -1 ||
                    slug.indexOf('hash-') === 0 ||
                    seen[slug];

                if (drop) {
                    item.remove();
                    return;
                }

                seen[slug] = true;
                kept += 1;
            });

            if (kept > 0) reveal(section);
        });
    }

    /* Nested region URLs, matching the /commentarii-mundi/{conflict}/{region}/
       channels in routes.yaml. Regions are the one level whose URL is assembled
       client-side, because the conflict slug and the region slug live in different
       Handlebars block frames. */
    function nestRegionUrls() {
        document.querySelectorAll('[data-cm-regions]').forEach(function (section) {
            var conflict = section.getAttribute('data-cm-region-conflict');
            if (!conflict) return;

            section.querySelectorAll('[data-cm-region]').forEach(function (item) {
                var link = item.querySelector('a');
                var slug = item.getAttribute('data-cm-region');
                if (!link || !slug) return;

                link.setAttribute('href', '/commentarii-mundi/' + conflict + '/' + slug + '/');
            });
        });
    }

    /* Conflict map.
       The server never renders pins. When an embed URL is configured, replace the
       placeholder surface with the external map; otherwise leave the placeholder. */
    function mountMap() {
        var src = CONFIG.mapEmbedUrl;
        if (!src) return;

        document.querySelectorAll('[data-cm-map]').forEach(function (map) {
            var surface = map.querySelector('[data-cm-map-surface]');
            if (!surface) return;

            var scope = map.getAttribute('data-cm-map-scope');
            var url;

            try {
                url = new URL(src, window.location.origin);
            } catch (e) {
                return;
            }

            if (scope) url.searchParams.set('conflict', scope);

            var frame = document.createElement('iframe');
            frame.src = url.toString();
            frame.loading = 'lazy';
            frame.title = 'Interaktive Konfliktkarte';
            frame.setAttribute('referrerpolicy', 'no-referrer');

            surface.replaceWith(frame);
        });
    }

    function init() {
        markActiveFilter();
        dedupeRegions();
        nestRegionUrls();
        fillSituationPanel();
        fillLinks();
        fillStats();
        mountMap();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
