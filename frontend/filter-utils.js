/**
 * FilterPanel — reusable collapsible filter panel for bowling ball lists.
 *
 * Usage:
 *   const fp = new FilterPanel(containerEl, { onChange: () => {} });
 *   fp.build(balls);             // call once after data loads
 *   fp.passes(ball, weight);     // true if ball passes all active filters
 *   fp.reset();                  // reset all filters to defaults
 */
class FilterPanel {
    /**
     * @param {HTMLElement} containerEl
     * @param {object}      options
     * @param {function}    [options.onChange]     - called on every filter change
     * @param {object}      [options.weightConfig] - if provided, renders a Weight
     *   selector as the first control inside the panel.
     *   Shape: { id: string, options: [{value, label}], selected: string|number }
     */
    constructor(containerEl, { onChange, weightConfig } = {}) {
        this._el = containerEl;
        this._onChange = onChange || (() => {});
        this._weightConfig = weightConfig || null;
        this.filters = {};
        this._ranges = {};
        this._resetFns = [];
        this._details = null;
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    build(balls) {
        this._resetFns = [];
        this._computeRanges(balls);
        this._deriveCategoricals(balls);
        this._render();
    }

    passes(ball, weight) {
        const f = this.filters;
        if (!f || !Object.keys(f).length) return true;

        // Text search (name + brand)
        if (f.brand) {
            const hay = `${ball.name || ''} ${ball.brand || ''}`.toLowerCase();
            if (!hay.includes(f.brand)) return false;
        }

        // Categorical dropdowns
        if (f.core_type      && (ball.core_type      || '') !== f.core_type)      return false;
        if (f.coverstock_type && (ball.coverstock_type || '') !== f.coverstock_type) return false;

        // Boolean toggles
        if (f.discontinued !== null && f.discontinued !== undefined &&
            Boolean(ball.discontinued) !== f.discontinued) return false;
        if (f.overseas !== null && f.overseas !== undefined &&
            Boolean(ball.overseas) !== f.overseas) return false;

        // Non-spec numeric ranges
        const nonSpec = [
            { key: 'release_year',     val: ball.release_date ? new Date(ball.release_date).getFullYear() : null },
            { key: 'hook_potential',   val: ball.hook_potential },
            { key: 'early_v_late',     val: ball.early_v_late },
            { key: 'smooth_v_angular', val: ball.smooth_v_angular },
        ];
        for (const { key, val } of nonSpec) {
            const r = f[key];
            if (!r || !r.active) continue;
            if (val == null) return false;
            if (val < r.min || val > r.max) return false;
        }

        // Spec numeric ranges (weight-dependent)
        const spec = weight != null && Array.isArray(ball.specs)
            ? (ball.specs.find(s => s.weight === weight) || null) : null;
        const specVals = [
            { key: 'rg',      val: spec ? spec.rg      : null },
            { key: 'diff',    val: spec ? spec.diff    : null },
            { key: 'mb_diff', val: spec ? spec.mb_diff : null },
        ];
        for (const { key, val } of specVals) {
            const r = f[key];
            if (!r || !r.active) continue;
            if (val == null) return false;
            if (val < r.min || val > r.max) return false;
        }

        return true;
    }

    reset() {
        this._resetFns.forEach(fn => fn());
        this._notify();
    }

    // ── Data analysis ──────────────────────────────────────────────────────────

    _computeRanges(balls) {
        const numRange = vals => {
            const v = vals.filter(x => x != null && !isNaN(x));
            return v.length ? { min: Math.min(...v), max: Math.max(...v) } : null;
        };

        this._ranges = {
            release_year:     numRange(balls.map(b => b.release_date ? new Date(b.release_date).getFullYear() : null)),
            hook_potential:   numRange(balls.map(b => b.hook_potential)),
            early_v_late:     numRange(balls.map(b => b.early_v_late)),
            smooth_v_angular: numRange(balls.map(b => b.smooth_v_angular)),
        };

        // Spec ranges across all weights
        const allRg = [], allDiff = [], allMb = [];
        balls.forEach(b => {
            if (!Array.isArray(b.specs)) return;
            b.specs.forEach(s => {
                if (s.rg      != null) allRg.push(s.rg);
                if (s.diff    != null) allDiff.push(s.diff);
                if (s.mb_diff != null) allMb.push(s.mb_diff);
            });
        });
        this._ranges.rg      = numRange(allRg);
        this._ranges.diff    = numRange(allDiff);
        this._ranges.mb_diff = numRange(allMb);
    }

    _deriveCategoricals(balls) {
        this._coreTypes = [...new Set(balls.map(b => b.core_type).filter(Boolean))].sort();
        this._csTypes   = [...new Set(balls.map(b => b.coverstock_type).filter(Boolean))].sort();
    }

    // ── Rendering ──────────────────────────────────────────────────────────────

    _render() {
        this._el.innerHTML = '';
        this.filters = {};

        const details = document.createElement('details');
        details.className = 'fp-panel';

        const summary = document.createElement('summary');
        summary.className = 'fp-summary';
        summary.innerHTML = 'Filters <span class="fp-count"></span>';
        details.appendChild(summary);

        const body = document.createElement('div');
        body.className = 'fp-body';

        const grid = document.createElement('div');
        grid.className = 'fp-grid';

        // ── Weight (optional) ──
        if (this._weightConfig) {
            grid.appendChild(this._weightControl());
        }

        // ── Categorical ──
        grid.appendChild(this._textControl('Brand / Name', 'brand'));
        grid.appendChild(this._selectControl('Core Type', 'core_type', this._coreTypes));
        grid.appendChild(this._selectControl('Coverstock Type', 'coverstock_type', this._csTypes));
        grid.appendChild(this._toggleControl('Discontinued', 'discontinued'));
        grid.appendChild(this._toggleControl('Overseas', 'overseas'));

        // ── Numeric ranges ──
        const numFields = [
            { key: 'release_year',     label: 'Release Year',         step: 1,     dec: 0 },
            { key: 'hook_potential',   label: 'Hook Potential',        step: 0.1,   dec: 1 },
            { key: 'early_v_late',     label: 'Early vs. Late',        step: 0.1,   dec: 1 },
            { key: 'smooth_v_angular', label: 'Smooth vs. Angular',    step: 0.1,   dec: 1 },
            { key: 'rg',               label: 'Radius of Gyration',    step: 0.001, dec: 3 },
            { key: 'diff',             label: 'Differential',          step: 0.001, dec: 3 },
            { key: 'mb_diff',          label: 'MB Differential',       step: 0.001, dec: 3 },
        ];
        numFields.forEach(({ key, label, step, dec }) => {
            const r = this._ranges[key];
            if (!r) return;
            grid.appendChild(r.min === r.max
                ? this._staticNumControl(label, key, r.min, dec)
                : this._rangeControl(label, key, r, step, dec));
        });

        body.appendChild(grid);

        // Reset button
        const resetRow = document.createElement('div');
        resetRow.className = 'fp-reset-row';
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset All Filters';
        resetBtn.className = 'fp-reset-btn';
        resetBtn.addEventListener('click', () => this.reset());
        resetRow.appendChild(resetBtn);
        body.appendChild(resetRow);

        details.appendChild(body);
        this._el.appendChild(details);
        this._details = details;
        this._updateBadge();
    }

    // ── Control builders ──────────────────────────────────────────────────────

    _weightControl() {
        const { id, options, selected } = this._weightConfig;
        const w = this._wrap('Weight');
        const sel = document.createElement('select');
        sel.id = id;
        sel.className = 'fp-select';
        options.forEach(({ value, label }) => {
            const o = document.createElement('option');
            o.value = value;
            o.textContent = label;
            if (String(value) === String(selected)) o.selected = true;
            sel.appendChild(o);
        });
        w.appendChild(sel);
        return w;
    }

    _wrap(label, extraClass) {
        const w = document.createElement('div');
        w.className = 'fp-item' + (extraClass ? ' ' + extraClass : '');
        const l = document.createElement('div');
        l.className = 'fp-label';
        l.textContent = label;
        w.appendChild(l);
        return w;
    }

    _textControl(label, key) {
        this.filters[key] = '';
        const w = this._wrap(label);
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'fp-text';
        inp.placeholder = 'Any';
        inp.addEventListener('input', () => {
            this.filters[key] = inp.value.toLowerCase().trim();
            this._notify();
        });
        this._resetFns.push(() => { inp.value = ''; this.filters[key] = ''; });
        w.appendChild(inp);
        return w;
    }

    _selectControl(label, key, options) {
        this.filters[key] = null;
        const w = this._wrap(label);
        const sel = document.createElement('select');
        sel.className = 'fp-select';
        const any = document.createElement('option');
        any.value = ''; any.textContent = 'Any';
        sel.appendChild(any);
        options.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt; o.textContent = opt;
            sel.appendChild(o);
        });
        sel.addEventListener('change', () => {
            this.filters[key] = sel.value || null;
            this._notify();
        });
        this._resetFns.push(() => { sel.value = ''; this.filters[key] = null; });
        w.appendChild(sel);
        return w;
    }

    _toggleControl(label, key) {
        this.filters[key] = null;
        const w = this._wrap(label);
        const grp = document.createElement('div');
        grp.className = 'fp-toggle-group';
        [['Any', null], ['No', false], ['Yes', true]].forEach(([text, val], i) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.className = 'fp-toggle' + (i === 0 ? ' active' : '');
            btn.addEventListener('click', () => {
                grp.querySelectorAll('.fp-toggle').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filters[key] = val;
                this._notify();
            });
            grp.appendChild(btn);
        });
        this._resetFns.push(() => {
            grp.querySelectorAll('.fp-toggle').forEach(b => b.classList.remove('active'));
            grp.querySelector('.fp-toggle').classList.add('active');
            this.filters[key] = null;
        });
        w.appendChild(grp);
        return w;
    }

    _staticNumControl(label, key, value, dec) {
        // No range to filter — show the single value as read-only info
        this.filters[key] = { min: value, max: value, dataMin: value, dataMax: value, active: false };
        const w = this._wrap(label);
        const span = document.createElement('span');
        span.className = 'fp-static-val';
        span.textContent = value.toFixed(dec);
        w.appendChild(span);
        this._resetFns.push(() => {
            this.filters[key] = { min: value, max: value, dataMin: value, dataMax: value, active: false };
        });
        return w;
    }

    _rangeControl(label, key, dataRange, step, dec) {
        const { min: dMin, max: dMax } = dataRange;
        this.filters[key] = { min: dMin, max: dMax, dataMin: dMin, dataMax: dMax, active: false };

        const w = this._wrap(label, 'fp-item-wide');

        // Number inputs row
        const numRow = document.createElement('div');
        numRow.className = 'fp-num-row';

        const numMin = document.createElement('input');
        numMin.type = 'number'; numMin.className = 'fp-num';
        numMin.value = dMin.toFixed(dec); numMin.step = step; numMin.min = dMin; numMin.max = dMax;

        const sep = document.createElement('span');
        sep.className = 'fp-sep'; sep.textContent = '–';

        const numMax = document.createElement('input');
        numMax.type = 'number'; numMax.className = 'fp-num';
        numMax.value = dMax.toFixed(dec); numMax.step = step; numMax.min = dMin; numMax.max = dMax;

        numRow.appendChild(numMin);
        numRow.appendChild(sep);
        numRow.appendChild(numMax);

        // Dual slider
        const sliderWrap = document.createElement('div');
        sliderWrap.className = 'fp-dual-slider';

        const track = document.createElement('div'); track.className = 'fp-track';
        const fill  = document.createElement('div'); fill.className  = 'fp-fill';
        track.appendChild(fill);

        const thumbLo = document.createElement('input');
        thumbLo.type = 'range'; thumbLo.className = 'fp-thumb fp-thumb-lo';
        thumbLo.min = dMin; thumbLo.max = dMax; thumbLo.step = step; thumbLo.value = dMin;

        const thumbHi = document.createElement('input');
        thumbHi.type = 'range'; thumbHi.className = 'fp-thumb fp-thumb-hi';
        thumbHi.min = dMin; thumbHi.max = dMax; thumbHi.step = step; thumbHi.value = dMax;

        sliderWrap.appendChild(track);
        sliderWrap.appendChild(thumbLo);
        sliderWrap.appendChild(thumbHi);

        const totalRange = dMax - dMin;

        const sync = () => {
            const lo = parseFloat(thumbLo.value);
            const hi = parseFloat(thumbHi.value);
            // Update fill bar
            fill.style.left  = (totalRange > 0 ? (lo - dMin) / totalRange * 100 : 0) + '%';
            fill.style.width = (totalRange > 0 ? (hi - lo)  / totalRange * 100 : 100) + '%';
            // Sync number inputs
            numMin.value = lo.toFixed(dec);
            numMax.value = hi.toFixed(dec);
            // Update filter state
            this.filters[key].min = lo;
            this.filters[key].max = hi;
            this.filters[key].active = (lo > dMin || hi < dMax);
            // Give lo thumb higher z-index when it reaches hi so it can still be dragged back
            thumbLo.style.zIndex = lo >= hi ? 3 : 1;
        };

        thumbLo.addEventListener('input', () => {
            if (parseFloat(thumbLo.value) > parseFloat(thumbHi.value))
                thumbLo.value = thumbHi.value;
            sync();
            this._notify();
        });
        thumbHi.addEventListener('input', () => {
            if (parseFloat(thumbHi.value) < parseFloat(thumbLo.value))
                thumbHi.value = thumbLo.value;
            sync();
            this._notify();
        });

        numMin.addEventListener('change', () => {
            const clamp = Math.max(dMin, Math.min(parseFloat(numMin.value) || dMin, parseFloat(thumbHi.value)));
            thumbLo.value = clamp;
            sync();
            this._notify();
        });
        numMax.addEventListener('change', () => {
            const clamp = Math.min(dMax, Math.max(parseFloat(numMax.value) || dMax, parseFloat(thumbLo.value)));
            thumbHi.value = clamp;
            sync();
            this._notify();
        });

        sync(); // initialise fill on first render

        this._resetFns.push(() => {
            thumbLo.value = dMin; thumbHi.value = dMax;
            numMin.value = dMin.toFixed(dec); numMax.value = dMax.toFixed(dec);
            this.filters[key] = { min: dMin, max: dMax, dataMin: dMin, dataMax: dMax, active: false };
            sync();
        });

        w.appendChild(numRow);
        w.appendChild(sliderWrap);
        return w;
    }

    // ── Internals ──────────────────────────────────────────────────────────────

    _notify() {
        this._updateBadge();
        this._onChange();
    }

    _updateBadge() {
        if (!this._details) return;
        const badge = this._details.querySelector('.fp-count');
        if (badge) {
            const n = this._countActive();
            badge.textContent = n > 0 ? `(${n} active)` : '';
        }
    }

    _countActive() {
        const f = this.filters;
        let n = 0;
        if (f.brand)         n++;
        if (f.core_type)     n++;
        if (f.coverstock_type) n++;
        if (f.discontinued !== null && f.discontinued !== undefined) n++;
        if (f.overseas     !== null && f.overseas     !== undefined) n++;
        ['release_year','hook_potential','early_v_late','smooth_v_angular','rg','diff','mb_diff']
            .forEach(k => { if (f[k] && f[k].active) n++; });
        return n;
    }
}
