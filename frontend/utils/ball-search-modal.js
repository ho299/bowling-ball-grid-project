// Ball Search Modal — shared across all pages.
// Two-panel dialog: search list → ball detail.
// Exposes window.showBallDetail(ball) so any page can open the detail panel directly.

(function () {
    const IMAGE_BASE = 'https://www.bowwwl.com';
    let allBalls        = [];
    let loaded          = false;
    let loading         = false;
    let lastSearchQuery = '';

    // ── DOM injection ─────────────────────────────────────────────────────────

    function injectModal() {
        const overlay = document.createElement('div');
        overlay.id        = 'bsm-overlay';
        overlay.className = 'bsm-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Ball search');
        overlay.innerHTML = `
            <div class="bsm-dialog">

                <!-- ── Search panel ── -->
                <div id="bsm-search-view" class="bsm-panel">
                    <div class="bsm-header">
                        <svg class="bsm-icon" viewBox="0 0 20 20" fill="none"
                             stroke="currentColor" stroke-width="2.2"
                             stroke-linecap="round" stroke-linejoin="round"
                             aria-hidden="true">
                            <circle cx="8.5" cy="8.5" r="5.5"/>
                            <line x1="13" y1="13" x2="18" y2="18"/>
                        </svg>
                        <input type="text" id="bsm-input" class="bsm-input"
                               placeholder="Search balls by name or brand&hellip;"
                               autocomplete="off" spellcheck="false">
                        <button id="bsm-close" class="bsm-close" aria-label="Close">&times;</button>
                    </div>
                    <div id="bsm-results" class="bsm-results">
                        <p class="bsm-hint">Start typing to search&hellip;</p>
                    </div>
                </div>

                <!-- ── Detail panel (hidden until a ball is picked) ── -->
                <div id="bsm-detail-view" class="bsm-panel" style="display:none">
                </div>

            </div>
        `;
        document.body.appendChild(overlay);
    }

    // ── Data ──────────────────────────────────────────────────────────────────

    async function ensureBalls() {
        if (loaded || loading) return;
        loading = true;
        try {
            const res = await fetch(location.origin + '/api/balls');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            allBalls = await res.json();
            loaded = true;
        } catch (e) {
            console.error('ball-search-modal: failed to load balls', e);
            allBalls = [];
            loaded = true;
        } finally {
            loading = false;
        }
    }

    // ── Open / close ──────────────────────────────────────────────────────────

    function openSearch() {
        showPanel('search');
        document.getElementById('bsm-overlay').classList.add('bsm-open');

        const input = document.getElementById('bsm-input');
        input.value = lastSearchQuery;
        renderResults(lastSearchQuery);
        ensureBalls().then(() => renderResults(document.getElementById('bsm-input').value));
        requestAnimationFrame(() => input.focus());
    }

    function close() {
        document.getElementById('bsm-overlay').classList.remove('bsm-open');
    }

    function showPanel(which) {
        document.getElementById('bsm-search-view').style.display = which === 'search' ? 'flex' : 'none';
        document.getElementById('bsm-detail-view').style.display = which === 'detail' ? 'flex' : 'none';
    }

    // ── Search results ────────────────────────────────────────────────────────

    function renderResults(query) {
        const container = document.getElementById('bsm-results');
        const q = query.toLowerCase().trim();

        if (!loaded) {
            container.innerHTML = '<p class="bsm-hint">Loading&hellip;</p>';
            return;
        }

        const matches = q
            ? allBalls.filter(b =>
                (b.name  || '').toLowerCase().includes(q) ||
                (b.brand || '').toLowerCase().includes(q))
            : allBalls;

        if (matches.length === 0) {
            container.innerHTML = '<p class="bsm-hint">No balls found.</p>';
            return;
        }

        container.innerHTML = '';
        matches.slice(0, 60).forEach(ball => {
            const item = document.createElement('div');
            item.className = 'bsm-item';

            const imgHtml = ball.image
                ? `<img class="bsm-item-img" src="${IMAGE_BASE}${ball.image}"
                       alt="" loading="lazy" onerror="this.style.display='none'">`
                : `<div class="bsm-item-img-placeholder"></div>`;

            item.innerHTML = `
                ${imgHtml}
                <div class="bsm-item-info">
                    <span class="bsm-item-name">${ball.name || ''}</span>
                    ${ball.brand ? `<span class="bsm-item-brand">${ball.brand}</span>` : ''}
                </div>
                <span class="bsm-item-chevron">&#8250;</span>
            `;

            item.addEventListener('mousedown', e => {
                e.preventDefault();
                openDetail(ball, true);
            });

            container.appendChild(item);
        });

        if (matches.length > 60) {
            const note = document.createElement('p');
            note.className = 'bsm-hint bsm-hint-more';
            note.textContent = `${matches.length - 60} more — type to narrow results`;
            container.appendChild(note);
        }
    }

    // ── Arsenal storage ───────────────────────────────────────────────────────
    // Mirrors the format used by arsenal.js so both pages share the same data.

    const ARSENAL_KEY = 'bowliq_arsenal';

    function addToArsenal(ball, weight) {
        try {
            const arsenal = JSON.parse(localStorage.getItem(ARSENAL_KEY) || '[]');
            if (arsenal.some(b => (b.name || '').toLowerCase() === (ball.name || '').toLowerCase())) {
                return 'already_added';
            }
            arsenal.push({
                name:        ball.name  || '',
                brand:       ball.brand || '',
                image:       ball.image || null,
                weight:      parseInt(weight, 10) || 15,
                scores:      [],
                gamesPlayed: 0,
                condition:   '',
                notes:       '',
                dateAdded:   new Date().toISOString().slice(0, 10),
            });
            localStorage.setItem(ARSENAL_KEY, JSON.stringify(arsenal));
            return 'ok';
        } catch { return 'error'; }
    }

    // ── Detail panel ─────────────────────────────────────────────────────────

    function openDetail(ball, fromSearch) {
        const detailView = document.getElementById('bsm-detail-view');
        detailView.innerHTML = buildDetailHTML(ball, fromSearch);

        // Wire back button
        const backBtn = detailView.querySelector('.bsm-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => showPanel('search'));
        }

        // Wire close button
        detailView.querySelector('.bsm-detail-close').addEventListener('click', close);

        // Show on Grid
        detailView.querySelector('.bsm-show-grid-btn').addEventListener('click', () => {
            close();
            if (typeof window.selectBallByName === 'function') {
                window.selectBallByName(ball.name);
            } else {
                window.location.href = 'homepage.html?highlight=' + encodeURIComponent(ball.name);
            }
        });

        // Add to My Arsenal — save to localStorage then navigate
        detailView.querySelector('.bsm-add-arsenal-btn').addEventListener('click', () => {
            const weightSel = detailView.querySelector('.bsm-weight-select');
            const weight    = weightSel ? parseInt(weightSel.value, 10) : 15;
            const result    = addToArsenal(ball, weight);
            const btn       = detailView.querySelector('.bsm-add-arsenal-btn');

            if (result === 'already_added') {
                // Show brief feedback then navigate
                btn.textContent = 'Already in arsenal';
                btn.disabled = true;
                setTimeout(() => { close(); window.location.href = 'arsenal.html'; }, 900);
            } else {
                close();
                window.location.href = 'arsenal.html';
            }
        });

        // Open overlay if called standalone (table click on non-search flow)
        if (!document.getElementById('bsm-overlay').classList.contains('bsm-open')) {
            document.getElementById('bsm-overlay').classList.add('bsm-open');
        }

        showPanel('detail');
    }

    function buildDetailHTML(ball, fromSearch) {
        const year = ball.release_date
            ? new Date(ball.release_date).getFullYear() : null;

        const imgHtml = ball.image
            ? `<img class="bsm-detail-img" src="${IMAGE_BASE}${ball.image}"
                   alt="${ball.name || ''}" onerror="this.style.display='none'">`
            : `<div class="bsm-detail-img-placeholder"></div>`;

        const metaParts = [
            year             ? String(year)          : null,
            ball.coverstock_type                      || null,
            ball.factory_finish                       || null,
        ].filter(Boolean);

        const badges = [
            ball.discontinued ? `<span class="bsm-badge bsm-badge-disc">Discontinued</span>` : '',
            ball.overseas     ? `<span class="bsm-badge bsm-badge-os">Overseas</span>`        : '',
        ].join('');

        // Specs table
        const specs = Array.isArray(ball.specs)
            ? ball.specs.filter(s => s.rg != null || s.diff != null)
            : [];

        const SPEC_FIELDS = [
            { key: 'rg',               label: 'RG',              dec: 3 },
            { key: 'diff',             label: 'Diff',            dec: 3 },
            { key: 'mb_diff',          label: 'MB Diff',         dec: 3 },
            { key: 'hook_potential',   label: 'Hook',            dec: 1 },
            { key: 'early_v_late',     label: 'Early / Late',    dec: 1 },
            { key: 'smooth_v_angular', label: 'Smooth / Angular',dec: 1 },
        ];

        let specsHtml = '';
        if (specs.length > 0) {
            const multiWeight = specs.length > 1;
            const headerCols  = (multiWeight ? '<th>Wt</th>' : '') +
                SPEC_FIELDS.map(f => `<th>${f.label}</th>`).join('');
            const rows = specs.map(s =>
                `<tr>${multiWeight ? `<td>${s.weight} lb</td>` : ''}` +
                SPEC_FIELDS.map(f => {
                    const v = s[f.key];
                    return `<td>${v != null ? Number(v).toFixed(f.dec) : '—'}</td>`;
                }).join('') + `</tr>`
            ).join('');

            specsHtml = `
                <div class="bsm-detail-section">
                    <div class="bsm-detail-section-label">Specifications</div>
                    <div class="bsm-spec-scroll">
                        <table class="bsm-spec-table">
                            <thead><tr>${headerCols}</tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>`;
        }

        // Weight selector: use available spec weights, fall back to standard range
        const specWeights = Array.isArray(ball.specs) && ball.specs.length > 0
            ? [...new Set(ball.specs.map(s => s.weight).filter(Boolean))].sort((a, b) => b - a)
            : [16, 15, 14, 13, 12];
        const weightOptions = specWeights.map(w =>
            `<option value="${w}"${w === 15 ? ' selected' : ''}>${w} lb</option>`
        ).join('');

        const backBtn = fromSearch
            ? `<button class="bsm-back-btn">&#8592; Back</button>`
            : `<span></span>`;

        return `
            <div class="bsm-detail-topbar">
                ${backBtn}
                <button class="bsm-detail-close bsm-close" aria-label="Close">&times;</button>
            </div>
            <div class="bsm-detail-body">
                <div class="bsm-detail-hero">
                    <div class="bsm-detail-img-wrap">${imgHtml}</div>
                    <div class="bsm-detail-headline">
                        <h2 class="bsm-detail-name">${ball.name || 'Unknown Ball'}</h2>
                        ${ball.brand ? `<div class="bsm-detail-brand">${ball.brand}</div>` : ''}
                        ${metaParts.length ? `<div class="bsm-detail-meta">${metaParts.join(' &middot; ')}</div>` : ''}
                        ${badges       ? `<div class="bsm-detail-badges">${badges}</div>`                         : ''}
                    </div>
                </div>
                ${specsHtml}
                <div class="bsm-detail-actions">
                    <button class="bsm-show-grid-btn">Show on Grid</button>
                    <div class="bsm-arsenal-row">
                        <select class="bsm-weight-select">${weightOptions}</select>
                        <button class="bsm-add-arsenal-btn">Add to My Arsenal</button>
                    </div>
                    <a class="bsm-purchase-btn"
                       href="https://www.bowlingball.com/search?q=${encodeURIComponent(ball.name || '')}"
                       target="_blank" rel="noopener noreferrer">Purchase</a>
                </div>
            </div>
        `;
    }

    // ── Init ─────────────────────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', () => {
        injectModal();

        // Expose for table row clicks on any page
        window.showBallDetail = function (ball) {
            openDetail(ball, false);
        };

        const overlay  = document.getElementById('bsm-overlay');
        const input    = document.getElementById('bsm-input');
        const closeBtn = document.getElementById('bsm-close');
        const navBtn   = document.getElementById('nav-search-btn');

        if (navBtn) navBtn.addEventListener('click', openSearch);
        closeBtn.addEventListener('click', close);

        overlay.addEventListener('mousedown', e => {
            if (e.target === overlay) close();
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && overlay.classList.contains('bsm-open')) close();
        });

        input.addEventListener('input', () => {
            lastSearchQuery = input.value;
            renderResults(input.value);
        });
    });
})();