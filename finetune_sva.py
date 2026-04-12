import json
import numpy as np
from scipy.optimize import curve_fit
from scipy.stats import spearmanr

# ── Load data ──────────────────────────────────────────────────────
with open('validation_data.json', 'r') as f:
    data = json.load(f)

# ── Extract features ───────────────────────────────────────────────
X_diff, X_rg, X_finish, X_mb_diff, y_sva = [], [], [], [], []

for ball_name, weights in data.items():
    for weight, info in weights.items():
        try:
            sva     = float(info['BALL MOTION']['Backend'])
            rg      = float(info['CORE STATS'][f'{weight}# RG'])
            diff    = float(info['CORE STATS'][f'{weight}# DIFF'])
            mb_diff = float(info['CORE STATS'].get(f'{weight}# INT. DIFF', 0) or 0)

            # extract finish number from coverstock (first numeric value found)
            finish = None
            for k, v in info['COVERSTOCK'].items():
                try:
                    finish = float(v)
                    break
                except:
                    continue
            if finish is None:
                continue

            X_diff.append(diff)
            X_rg.append(rg)
            X_finish.append(finish)
            X_mb_diff.append(mb_diff)
            y_sva.append(sva)

        except Exception as e:
            print(f"Skipping {ball_name} weight {weight}: {e}")

X = (np.array(X_diff), np.array(X_rg), np.array(X_finish), np.array(X_mb_diff))
y = np.array(y_sva)
print(f"\nLoaded {len(y)} data points")

# ── Model ──────────────────────────────────────────────────────────
def sva_model(X, a, b, c,d, bias):
    diff, rg, finish, mb_diff = X
    k = a * diff + b* rg + c * finish + d * mb_diff - bias
    return 100 / (1 + np.exp(-k))

# ── Fit ────────────────────────────────────────────────────────────
try:
    popt, _ = curve_fit(sva_model, X, y, p0=[100, 0.1, 0.003, 5, 6], maxfev=10000)
    print(f"\nBest coefficients:")
    print(f"  a (diff/rg weight) : {popt[0]:.4f}")
    print(f"  b (finish weight)  : {popt[1]:.4f}")
    print(f"  c (mb_diff weight) : {popt[2]:.4f}")
    print(f"  d (rg weight)      : {popt[3]:.4f}")
    print(f"  bias               : {popt[4]:.4f}")
except Exception as e:
    print(f"Curve fit failed: {e}")
    popt = [20, 30, 0.003, 5, 6]

# ── Evaluate ───────────────────────────────────────────────────────
y_pred = sva_model(X, *popt)
r, p = spearmanr(y_pred, y)
print(f"\nSpearman correlation: r = {r:.3f}, p = {p:.4f}")

# ── Compare to original ────────────────────────────────────────────
print(f"\nOriginal SVA Spearman : r = 0.13")
print(f"New SVA Spearman      : r = {r:.3f}")
print(f"Improvement           : {r - 0.13:+.3f}")