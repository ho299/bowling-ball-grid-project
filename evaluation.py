import pandas as pd
from scipy.stats import spearmanr

df = pd.read_csv('output.csv')
clean = df[['Length', 'eVL']].dropna()
clean = clean[clean['Length'] != 0]
corrE, pvalueE = spearmanr(clean['Length'], clean['eVL'])
# print (clean.sort_values('Length'))
print(f"Correlation between EarlyvLate = {corrE:.2f}, p = {pvalueE:.3f}")
clean = df[['Backend', 'sVA']].dropna()
clean = clean[clean['Backend'] != 0]
corrS, pvalueS = spearmanr(clean['Backend'], clean['sVA'])
print(f"Correlation between SmoothvAngular = {corrS:.2f}, p = {pvalueS:.3f}")
clean = df[['Hook', 'HookPotential']].dropna()
clean = clean[clean['Hook'] != 0]
corrH, pvalueH = spearmanr(clean['Hook'], clean['HookPotential'])
print(f"Correlation between Hook Potential = {corrH:.2f}, p = {pvalueH:.3f}")