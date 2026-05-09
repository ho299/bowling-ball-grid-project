"""
Bowling Ball Motion Algorithm
─────────────────────────────
Three production models: Hook Potential, Early vs Late, Smooth vs Angular
Each outputs a score 0-100.

Production input: Feat1 (RG), Feat2 (DIFF), Feat3 (INT_DIFF), Feat4 (Finish num)

Proxy grid search is commented out — best params are hardcoded from prior run.
"""

import json
import re
import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from sklearn.model_selection import LeaveOneOut
from sklearn.preprocessing import MinMaxScaler
from interpret.glassbox import ExplainableBoostingRegressor
import joblib
import os

# ─────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────

ALGO_CONFIG = {
    "hook_potential":    {"target": "hook",    "proxy": "flare_potential_range_mid"},
    "early_vs_late":     {"target": "length",  "proxy": "hook_length_range_mid"},
    "smooth_vs_angular": {"target": "backend", "proxy": "ball_shape_range_mid"},
}

BASE_PROD_FEATURES = ["rg", "diff", "int_diff", "finish"]

# Best proxy hyperparameters from prior grid search on D2 (85 rows)
# To re-run the search, uncomment tune_proxy_hyperparameters in __main__
BEST_PROXY_PARAMS = {
    "flare_potential_range_mid": {"max_bins": 32, "interactions": 0, "min_samples_leaf": 3},
    "hook_length_range_mid":     {"max_bins": 16, "interactions": 2, "min_samples_leaf": 10},
    "ball_shape_range_mid":      {"max_bins": 16, "interactions": 1, "min_samples_leaf": 5},
}


BEST_ALGO_PARAMS = {
    "hook_potential":        {"max_bins": 64, "interactions": 2, "min_samples_leaf": 5},
    "early_vs_late":         {"max_bins": 32, "interactions": 2, "min_samples_leaf": 10},
    "smooth_vs_angular":     {"max_bins": 64, "interactions": 2, "min_samples_leaf": 10}
}


# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────

def parse_range(value):
    if value is None:
        return np.nan, np.nan
    s = str(value).replace('"', '').replace('+', '').strip()
    if '-' in s:
        parts = s.split('-')
        try:
            lo, hi = float(parts[0]), float(parts[1])
            return (lo + hi) / 2.0, hi - lo
        except ValueError:
            return np.nan, np.nan
    try:
        return float(s), 0.0
    except ValueError:
        return np.nan, np.nan

def parse_numeric(value):
    if value is None:
        return np.nan
    try:
        return float(str(value).replace('"', '').replace('+', '').strip())
    except ValueError:
        return np.nan

def impute_median(df, cols):
    out = df.copy()
    for c in cols:
        if c in out.columns:
            out[c] = out[c].fillna(out[c].median())
    return out


# ─────────────────────────────────────────────────────────────
# COVERSTOCK / FINISH CONVERTER
# ─────────────────────────────────────────────────────────────

def finish_name_to_number(coverstock_name: str, finish_name: str) -> float:
    if not coverstock_name or not finish_name:
        return np.nan
    name_lower = coverstock_name.lower()
    if any(k in name_lower for k in ("polyester", "polythane", "plastic")):
        return 90000
    finish = finish_name.lower()
    finish = finish.replace("35 micron", "330")
    finish = finish.replace("4k", "4000")
    last_digit_index = -1
    for i, ch in enumerate(finish):
        if ch.isdigit():
            last_digit_index = i
    if last_digit_index == -1:
        return 9000
    part_before = finish[: last_digit_index + 1]
    part_after  = finish[last_digit_index + 1:]
    polished = any(k in part_after for k in
                   ("polish", "gloss", "lsp", "shine", "factory finish"))
    numbers_cleaned = part_before.replace(",", "").replace("/", " ")
    tokens = numbers_cleaned.split()
    number_tokens = [t for t in tokens if re.search(r"\d", t)]
    if not number_tokens:
        return 9000
    value = 0.0
    first_pass = True
    total = len(number_tokens)
    for i in range(total - 1, -1, -1):
        token_val = float(re.sub(r"[^\d.]", "", number_tokens[i]))
        if first_pass:
            value = token_val
            first_pass = False
        else:
            value = value - token_val * 0.1 * (total - 1 - i)
    if polished:
        value = min(value + 5000, 9000)
    return value


# ─────────────────────────────────────────────────────────────
# DATASET LOADING
# ─────────────────────────────────────────────────────────────

TM = re.compile(r'[™®©]')

def load_dataset1(path_or_dict):
    data = json.load(open(path_or_dict)) if isinstance(path_or_dict, str) else path_or_dict
    rows = []
    for ball_name, weights in data.items():
        if not isinstance(weights, dict):
            continue
        for weight, info in weights.items():
            if not isinstance(info, dict):
                continue
            motion = info.get("BALL MOTION", {})
            core   = info.get("CORE STATS", {})
            cover  = info.get("COVERSTOCK", {})
            entries = [item for item in cover.items() if item[0] or item[1]]
            if len(entries) < 2:
                finish_val = np.nan
            else:
                key0, val0 = entries[0]
                key1, val1 = entries[1]
                coverstock_name   = TM.sub('', f"{val0} {re.sub(r'(?i)\\s*Reactive\\s*', '', key0).strip()}").strip()
                coverstock_finish = TM.sub('', f"{val1} {re.sub(r'(?i)\\s*Grit\\s*',     '', key1).strip()}").strip()
                finish_val = finish_name_to_number(coverstock_name, coverstock_finish)
            w = str(weight)
            rows.append({
                "ball_name": ball_name,
                "weight":    int(weight),
                "length":    parse_numeric(motion.get("Length")),
                "backend":   parse_numeric(motion.get("Backend")),
                "hook":      parse_numeric(motion.get("Hook")),
                "rg":        parse_numeric(core.get(f"{w}# RG")        or core.get("RG")),
                "diff":      parse_numeric(core.get(f"{w}# DIFF")      or core.get("DIFF")),
                "int_diff":  parse_numeric(core.get(f"{w}# INT. DIFF") or core.get("INT. DIFF")),
                "finish":    finish_val,
            })
    if not rows:
        raise ValueError("load_dataset1 produced 0 rows — check your JSON structure")
    return pd.DataFrame(rows)


def load_dataset2(path_or_dict):
    data = json.load(open(path_or_dict)) if isinstance(path_or_dict, str) else path_or_dict
    RANGE_FIELDS = [
        "flare_potential_range", "ball_shape_range", "hook_length_range",
        "oil_volume_range", "pattern_length_range", "lane_condition_range",
    ]
    rows = []
    for ball_name, weights in data.items():
        for weight, info in weights.items():
            ff  = info.get("factory_finish")
            rc  = info.get("reactive_coverstock")
            row = {
                "ball_name": ball_name,
                "weight":    int(weight),
                "rg":        parse_numeric(info.get("rg")),
                "diff":      parse_numeric(info.get("differential")),
                "int_diff":  parse_numeric(info.get("psa")),
                "finish":    finish_name_to_number(ff, rc) if ff and rc else np.nan,
            }
            for field in RANGE_FIELDS:
                mid, width = parse_range(info.get(field))
                row[f"{field}_mid"]   = mid
                row[f"{field}_width"] = width
            rows.append(row)
    return pd.DataFrame(rows)


# ─────────────────────────────────────────────────────────────
# PROXY — TUNE (grid search on D2) - commented out — best params are hardcoded in BEST_PROXY_PARAMS 
# ─────────────────────────────────────────────────────────────

def tune_proxy_hyperparameters(df2, feature_cols):
    """
    LOO grid search over proxy model hyperparameters on D2.
    Best results are printed — copy them into BEST_PROXY_PARAMS above.
    Returns dict: {proxy_col: best_params}
    """
    from itertools import product as iproduct

    param_grid = {
        "max_bins":         [16, 32, 64],
        "interactions":     [0, 1, 2],
        "min_samples_leaf": [3, 5, 10],
    }

    best_proxy_params = {}
    for algo_name, cfg in ALGO_CONFIG.items():
        proxy_col = cfg["proxy"]
        sub = df2[feature_cols + [proxy_col]].dropna()
        if len(sub) < 5:
            print(f"  [Proxy tune | {proxy_col}]  not enough rows — skipping")
            continue

        X = impute_median(sub[feature_cols], feature_cols)
        y = sub[proxy_col].values

        print(f"\nTuning proxy: {proxy_col}  (n={len(y)}, "
              f"{len(param_grid['max_bins'])*len(param_grid['interactions'])*len(param_grid['min_samples_leaf'])} combos)...")
        print(f"  {'max_bins':>10}  {'interactions':>14}  {'min_leaf':>10}  {'spearman':>10}")

        best_r, best_params = -np.inf, {}
        for bins, inter, min_leaf in iproduct(
            param_grid["max_bins"], param_grid["interactions"], param_grid["min_samples_leaf"]
        ):
            loo_preds = np.zeros(len(y))
            for tr, te in LeaveOneOut().split(X):
                tmp = ExplainableBoostingRegressor(
                    max_bins=bins, interactions=inter,
                    min_samples_leaf=min_leaf, random_state=42
                )
                tmp.fit(X.iloc[tr], y[tr])
                loo_preds[te] = tmp.predict(X.iloc[te])
            r, _ = spearmanr(y, loo_preds)
            flag = " <-- best" if r > best_r else ""
            print(f"  {bins:>10}  {inter:>14}  {min_leaf:>10}  {r:>10.3f}{flag}")
            if r > best_r:
                best_r = r
                best_params = {"max_bins": bins, "interactions": inter, "min_samples_leaf": min_leaf}

        print(f"\n  Best params : {best_params}")
        print(f"  Best Spearman: {best_r:.3f}")
        best_proxy_params[proxy_col] = best_params

    return best_proxy_params


# ─────────────────────────────────────────────────────────────
# PROXY — BUILD, SAVE, LOAD
# ─────────────────────────────────────────────────────────────

def build_and_save_proxy_models(df2, feature_cols, proxy_params, output_dir="models"):
    """
    Trains proxy models on D2 using the given params, saves them to disk.
    Call this once; afterwards use load_proxy_models().
    """
    os.makedirs(output_dir, exist_ok=True)
    proxy_models = {}

    for algo_name, cfg in ALGO_CONFIG.items():
        proxy_col = cfg["proxy"]
        sub = df2[feature_cols + [proxy_col]].dropna()
        if len(sub) < 5:
            print(f"  [Proxy | {proxy_col}]  not enough D2 rows — skipping")
            continue

        X = impute_median(sub[feature_cols], feature_cols)
        y = sub[proxy_col].values
        params = proxy_params.get(proxy_col, {"max_bins": 32, "interactions": 1, "min_samples_leaf": 3})

        model = ExplainableBoostingRegressor(**params, random_state=42)
        model.fit(X, y)

        # LOO on D2 — shows how reliable this proxy is
        loo_preds = np.zeros(len(y))
        for tr, te in LeaveOneOut().split(X):
            tmp = ExplainableBoostingRegressor(**params, random_state=42)
            tmp.fit(X.iloc[tr], y[tr])
            loo_preds[te] = tmp.predict(X.iloc[te])
        r, _ = spearmanr(y, loo_preds)
        print(f"  [Proxy | {proxy_col}]  D2 n={len(y)}  LOO Spearman={r:.3f}  params={params}")

        proxy_models[proxy_col] = {"model": model, "params": params, "spearman": r}

    path = os.path.join(output_dir, "proxy_models.joblib")
    joblib.dump({"proxy_models": proxy_models, "feature_cols": feature_cols}, path)
    print(f"\nProxy models saved to {path}")
    return proxy_models


def load_proxy_models(output_dir="models"):
    """Load previously saved proxy models."""
    path = os.path.join(output_dir, "proxy_models.joblib")
    payload = joblib.load(path)
    print(f"Proxy models loaded from {path}")
    for proxy_col, pm in payload["proxy_models"].items():
        print(f"  {proxy_col:35s}  Spearman={pm['spearman']:.3f}  params={pm['params']}")
    return payload["proxy_models"], payload["feature_cols"]


def apply_proxy_features(df1, proxy_models, feature_cols):
    """
    Given loaded proxy models, generate proxy feature columns for all D1 rows.
    Returns augmented df1.
    """
    df1 = df1.copy()
    X_d1 = impute_median(df1[feature_cols], feature_cols)
    for proxy_col, pm in proxy_models.items():
        df1[f"{proxy_col}_proxy"] = pm["model"].predict(X_d1)
    return df1


# ─────────────────────────────────────────────────────────────
# TRAIN (single algo)
# ─────────────────────────────────────────────────────────────

MONOTONE_CONSTRAINTS = {
    "early_vs_late": {
        "rg":      1,
        "diff":   -1,
        "int_diff": -1,
        "finish":  1,
    }
    # add others later
}

def train_algo(df, algo_name, prod_features, verbose=True,
               max_bins=64, interactions=2, min_samples_leaf=3):
    cfg    = ALGO_CONFIG[algo_name]
    target = cfg["target"]
    feats  = [f for f in prod_features if f in df.columns]

    sub = df[feats + [target]].dropna(subset=[target])
    X   = impute_median(sub[feats], feats)
    y   = sub[target].values



    # Build monotone constraint list aligned to feature order
    algo_constraints = MONOTONE_CONSTRAINTS.get(algo_name, {})
    monotone = [algo_constraints.get(f, 0) for f in feats]  # 0 = unconstrained

        # ── Inspect column order ──────────────────────────────────────
    print("X columns (order matters for monotone_constraints):")
    for i, col in enumerate(X.columns):
        constraint = algo_constraints.get(col, 0)
        marker = {1: "↑ +1", -1: "↓ -1", 0: "  (unconstrained)"}.get(constraint, "")
        print(f"  [{i:2d}] {col:<30} {marker}")

    ebm_kwargs = dict(
        max_bins=max_bins,
        interactions=interactions,
        min_samples_leaf=min_samples_leaf,
        random_state=42,
        monotone_constraints=monotone,   # <-- list must match feats order
    )

    loo_preds = np.zeros(len(y))
    for tr, te in LeaveOneOut().split(X):
        tmp = ExplainableBoostingRegressor(**ebm_kwargs)
        tmp.fit(X.iloc[tr], y[tr])
        loo_preds[te] = tmp.predict(X.iloc[te])

    r, _  = spearmanr(y, loo_preds)
    mae   = np.mean(np.abs(y - loo_preds))

    if verbose:
        constrained = [f for f, c in zip(feats, monotone) if c != 0]
        print(f"  LOO Spearman={r:.3f}  MAE={mae:.2f}")
        print(f"  Constrained features: {constrained}")

    ebm = ExplainableBoostingRegressor(**ebm_kwargs)
    ebm.fit(X, y)
    scaler = MinMaxScaler(feature_range=(0, 100))
    scaler.fit(y.reshape(-1, 1))

    return {"model": ebm, "scaler": scaler, "features": feats, "spearman": r, "mae": mae}

# ─────────────────────────────────────────────────────────────
# TUNE (grid search on D1 for a single algo)
# ─────────────────────────────────────────────────────────────

def tune_hyperparameters(df, algo_name, prod_features):
    """
    LOO grid search over max_bins, interactions, min_samples_leaf.
    Returns the best param dict found.
    Warning: slow — 27 combos x n_rows fits per algo.
    """
    from itertools import product as iproduct

    param_grid = {
        "max_bins":         [32, 64, 128],
        "interactions":     [0, 2, 4],
        "min_samples_leaf": [3, 5, 10],
    }

    cfg    = ALGO_CONFIG[algo_name]
    target = cfg["target"]
    feats  = [f for f in prod_features if f in df.columns]
    sub    = df[feats + [target]].dropna(subset=[target])
    X      = impute_median(sub[feats], feats)
    y      = sub[target].values

    n_combos = len(param_grid["max_bins"]) * len(param_grid["interactions"]) * len(param_grid["min_samples_leaf"])
    print(f"\nTuning {algo_name}  (n={len(y)}, {n_combos} combos)...")
    print(f"  {'max_bins':>10}  {'interactions':>14}  {'min_leaf':>10}  {'spearman':>10}")

    best_r, best_params = -np.inf, {}
    for bins, inter, min_leaf in iproduct(
        param_grid["max_bins"], param_grid["interactions"], param_grid["min_samples_leaf"]
    ):
        loo_preds = np.zeros(len(y))
        for tr, te in LeaveOneOut().split(X):
            tmp = ExplainableBoostingRegressor(
                max_bins=bins, interactions=inter,
                min_samples_leaf=min_leaf, random_state=42
            )
            tmp.fit(X.iloc[tr], y[tr])
            loo_preds[te] = tmp.predict(X.iloc[te])
        r, _ = spearmanr(y, loo_preds)
        flag = " <-- best" if r > best_r else ""
        print(f"  {bins:>10}  {inter:>14}  {min_leaf:>10}  {r:>10.3f}{flag}")
        if r > best_r:
            best_r = r
            best_params = {"max_bins": bins, "interactions": inter, "min_samples_leaf": min_leaf}

    print(f"\n  Best params : {best_params}")
    print(f"  Best Spearman: {best_r:.3f}")
    return best_params


# ─────────────────────────────────────────────────────────────
# COMPARE: tuned baseline vs tuned proxy (fair — same params)
# ─────────────────────────────────────────────────────────────

def compare_proxy_vs_baseline(df_with_proxy, prod_features_with_proxy, algo_params):
    """
    Uses the same tuned algo_params for both baseline and proxy models.
    The only variable between the two is whether proxy features are present.
    This is a fair comparison — any difference is purely from the proxy features.
    """
    print("\n" + "=" * 65)
    print("  COMPARISON: tuned baseline (Feat1-4) vs tuned proxy models")
    print("  (same hyperparameters for both — only proxy features differ)")
    print("=" * 65)
    print(f"  {'algo':<22}  {'baseline':>10}  {'with proxy':>10}  {'delta':>8}")
    print(f"  {'-'*22}  {'-'*10}  {'-'*10}  {'-'*8}")

    baseline_models = {}
    for algo_name in ALGO_CONFIG:
        params = algo_params.get(algo_name, {})

        base_result  = train_algo(df_with_proxy, algo_name, BASE_PROD_FEATURES,
                                  verbose=False, **params)
        proxy_result = train_algo(df_with_proxy, algo_name, prod_features_with_proxy,
                                  verbose=False, **params)

        baseline_models[algo_name] = base_result

        delta = proxy_result["spearman"] - base_result["spearman"]
        flag  = "✓" if delta > 0 else "✗"
        print(f"  {algo_name:<22}  {base_result['spearman']:>10.3f}  "
              f"{proxy_result['spearman']:>10.3f}  {delta:>+8.3f}  {flag}")

    print()
    return baseline_models


# ─────────────────────────────────────────────────────────────
# TRAIN ALL
# ─────────────────────────────────────────────────────────────

def train_all(df, prod_features, algo_params=None, verbose=True):
    """
    algo_params: {algo_name: {max_bins, interactions, min_samples_leaf}}
    Falls back to defaults for any algo not in dict.
    """
    algo_params = algo_params or {}
    
    models = {}
    ACTIVE_ALGOS = ["early_vs_late"]  # toggle this at the top of your script

    # Then anywhere you loop over ALGO_CONFIG, filter it:
    for algo_name in [a for a in ALGO_CONFIG if a in ACTIVE_ALGOS]:
    
    # for algo_name in ALGO_CONFIG:
        if verbose:
            print(f"\n{'='*55}\n  {algo_name.upper()}  |  "
                  f"target={ALGO_CONFIG[algo_name]['target']}  n={len(df)}\n{'='*55}")
        params = algo_params.get(algo_name, {})
        models[algo_name] = train_algo(df, algo_name, prod_features, verbose, **params)
    return models


# ─────────────────────────────────────────────────────────────
# SAVE / LOAD  (main models)
# ─────────────────────────────────────────────────────────────

def save_models(models, proxy_models=None, prod_features=None,
                baseline_models=None, algo_params=None, output_dir="models"):
    """
    Saves production models, proxy models reference, baseline models, and hyperparams.
    Note: proxy models are also saved separately via build_and_save_proxy_models()
          so they can be loaded independently without retraining.
    """
    os.makedirs(output_dir, exist_ok=True)
    joblib.dump({
        "models":          models,
        "proxy_models":    proxy_models,
        "prod_features":   prod_features,
        "baseline_models": baseline_models,
        "base_features":   BASE_PROD_FEATURES,
        "algo_params":     algo_params,
    }, os.path.join(output_dir, "contraint_eva_models.joblib"))

    print(f"\nModels saved to {output_dir}/contraint_eva_models.joblib")
    if algo_params:
        print("\n  Saved hyperparameters:")
        for algo, params in algo_params.items():
            r = models[algo]["spearman"]
            print(f"    {algo:22s}: {params}  →  Spearman={r:.3f}")


def load_models(output_dir="models"):
    payload = joblib.load(os.path.join(output_dir, "ball_algo_models.joblib"))
    return (
        payload["models"],
        payload["proxy_models"],
        payload["prod_features"],
        payload["baseline_models"],
        payload["base_features"],
        payload.get("algo_params"),
    )


# ─────────────────────────────────────────────────────────────
# FEATURE IMPORTANCE
# ─────────────────────────────────────────────────────────────

def print_feature_importance(models):
    for algo_name, result in models.items():
        ebm = result["model"]
        df_imp = pd.DataFrame({
            "feature":    ebm.term_names_,
            "importance": ebm.term_importances(),
        }).sort_values("importance", ascending=False)
        print(f"\n-- {algo_name} --")
        print(df_imp.to_string(index=False))


# ─────────────────────────────────────────────────────────────
# PRODUCTION PREDICT
# ─────────────────────────────────────────────────────────────

def predict_ball(models, proxy_models, feat1_rg, feat2_diff, feat3_int_diff, feat4_finish):
    """
    Production entry point — only Feat1-4 needed externally.
    Proxy values are computed internally from the four base features.
    """
    base = {"rg": feat1_rg, "diff": feat2_diff, "int_diff": feat3_int_diff, "finish": feat4_finish}
    # X_base = pd.DataFrame([base])
    # for proxy_col, pm in proxy_models.items():
    #     base[f"{proxy_col}_proxy"] = pm["model"].predict(X_base)[0]

    X = pd.DataFrame([base])
    scores = {}
    for algo_name, result in models.items():
        X_in  = X[result["features"]]
        raw   = result["model"].predict(X_in)[0]
        score = float(np.clip(result["scaler"].transform([[raw]])[0][0], 0, 100))
        scores[algo_name] = round(score, 1)
    return scores


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":

    DS1_PATH    = "validation_data.json"
    # DS2_PATH    = "storm_bowling_data.json"
    MODEL_DIR   = "models"
    PROXY_PATH  = os.path.join(MODEL_DIR, "proxy_models.joblib")

    df1 = load_dataset1(DS1_PATH).dropna(
        subset=["length", "backend", "hook", "rg", "diff", "int_diff", "finish"]
    ).reset_index(drop=True)

    # df2 = load_dataset2(DS2_PATH).dropna(
    #     subset=["rg", "diff", "int_diff", "finish",
    #             "ball_shape_range_mid", "hook_length_range_mid", "flare_potential_range_mid"]
    # ).reset_index(drop=True)

    print(f"Dataset 1 : {len(df1)} rows")
    # print(f"Dataset 2 : {len(df2)} rows")

    # ── Proxy models ──────────────────────────────────────────
    # Grid search is commented out — best params already in BEST_PROXY_PARAMS.
    # To re-run the search, uncomment the block below and copy results into BEST_PROXY_PARAMS.
    #
    # print("\nRunning proxy hyperparameter grid search on D2...")
    # found_proxy_params = tune_proxy_hyperparameters(df2, BASE_PROD_FEATURES)
    # print("\nCopy these into BEST_PROXY_PARAMS at the top of the file:")
    # print(found_proxy_params)

    # if os.path.exists(PROXY_PATH):
    #     # Load previously trained proxy models — no retraining needed
    #     print("\nLoading saved proxy models...")
    #     proxy_models, proxy_feature_cols = load_proxy_models(MODEL_DIR)
    # else:
    #     # First run — train and save proxy models using best known params
    #     print("\nNo saved proxy models found. Training and saving proxy models...")
    #     proxy_models = build_and_save_proxy_models(
    #         df2, BASE_PROD_FEATURES, BEST_PROXY_PARAMS, MODEL_DIR
    #     )

    # # Generate proxy feature columns for all D1 rows
    # df1_with_proxy = apply_proxy_features(df1, proxy_models, BASE_PROD_FEATURES)

    # PROD_FEATURES = BASE_PROD_FEATURES + [
    #     f"{cfg['proxy']}_proxy" for cfg in ALGO_CONFIG.values()
    # ]
    # print(f"\nProduction features: {PROD_FEATURES}")

    # # ── Main model grid search ────────────────────────────────
    # # Tune all three algos on proxy-augmented D1
    # print("\nRunning main model hyperparameter grid search on D1...")
    # algo_params = {}
    # for algo_name in ALGO_CONFIG:
    #     algo_params[algo_name] = tune_hyperparameters(df1_with_proxy, algo_name, PROD_FEATURES)

    # # ── Fair comparison ───────────────────────────────────────
    # # Both sides use same tuned params — only variable is proxy features
    # baseline_models = compare_proxy_vs_baseline(df1_with_proxy, PROD_FEATURES, algo_params)

    # # ── Train final models ────────────────────────────────────
    # print("\nTraining final production models with tuned hyperparameters...")
    # models = train_all(df1_with_proxy, PROD_FEATURES, algo_params=algo_params, verbose=True)
    models = train_all(df1, BASE_PROD_FEATURES, algo_params=BEST_ALGO_PARAMS, verbose=True)
    # ── Feature importance ────────────────────────────────────
    print("\n" + "=" * 55)
    print_feature_importance(models)
    joblib.dump(models, os.path.join(MODEL_DIR, "constraint_eva_models.joblib"))
    # ── Save ─────────────────────────────────────────────────
    # save_models(models = models,algo_params = BEST_ALGO_PARAMS, output_dir=MODEL_DIR)

    # ── Example prediction ────────────────────────────────────
    scores = predict_ball(
        models, None,

        feat1_rg       = 2.58,
        feat2_diff     = 0.031,
        feat3_int_diff = 0.009,
        feat4_finish   = 1000.0,
    )
    print("\n-- Example prediction --")
    for algo, score in scores.items():
        print(f"  {algo:22s}: {score} / 100")
