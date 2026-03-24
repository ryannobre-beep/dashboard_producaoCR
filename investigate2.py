import pandas as pd

df = pd.read_csv('Planilha.csv', low_memory=False)

# Look at rows for VG, META, REPC, COND, CTDR in 2025/2026
print("Unique Ramos:", df['ramo'].unique()[:20])

# Let's see raw dt_proposta for VG, META, REPC
mask_ramos = df['ramo'].isin(['VG', 'META', 'REPC', 'COND', 'CTDR', 'CTDE'])
df_ramos = df[mask_ramos]

print(f"\nTotal rows for these ramos: {len(df_ramos)}")
print("Sample of dt_proposta (raw strings):")
print(df_ramos['dt_proposta'].dropna().head())
print(df_ramos['dt_proposta'].dropna().tail())

# Let's count how many dt_proposta end in /2025 or /2026
dt_str = df_ramos['dt_proposta'].astype(str)
y2025 = dt_str[dt_str.str.contains('2025', na=False)]
y2026 = dt_str[dt_str.str.contains('2026', na=False)]

print(f"\nRaw dt_proposta containing 2025: {len(y2025)}")
print(f"Raw dt_proposta containing 2026: {len(y2026)}")

# Also let's check dt_inclusao, dt_emissao, inicio_de_vig just in case
print("\nChecking dt_inclusao containing 2025:", len(df_ramos['dt_inclusao'].astype(str)[df_ramos['dt_inclusao'].astype(str).str.contains('2025', na=False)]))
print("Checking dt_inclusao containing 2026:", len(df_ramos['dt_inclusao'].astype(str)[df_ramos['dt_inclusao'].astype(str).str.contains('2026', na=False)]))

print("\nChecking inicio_de_vig containing 2025:", len(df_ramos['inicio_de_vig'].astype(str)[df_ramos['inicio_de_vig'].astype(str).str.contains('2025', na=False)]))
print("Checking inicio_de_vig containing 2026:", len(df_ramos['inicio_de_vig'].astype(str)[df_ramos['inicio_de_vig'].astype(str).str.contains('2026', na=False)]))


# Let's look at 29/12/2025 exactly
exact_date = df[df['dt_proposta'].astype(str).str.contains('29/12/2025', na=False)]
print(f"\nRows with dt_proposta precisely '29/12/2025': {len(exact_date)}")
if len(exact_date) > 0:
    print(exact_date[['dt_proposta', 'dt_inclusao', 'inicio_de_vig', 'ramo', 'status']].head())
else:
    # Check if we can find it in inicio_de_vig or dt_inclusao
    exact_date2 = df[df['inicio_de_vig'].astype(str).str.contains('29/12/2025', na=False)]
    print(f"Rows with inicio_de_vig precisely '29/12/2025': {len(exact_date2)}")
    if len(exact_date2) > 0:
         print(exact_date2[['dt_proposta', 'dt_inclusao', 'inicio_de_vig', 'ramo', 'status']].head())
