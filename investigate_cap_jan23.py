import pandas as pd
import numpy as np

branch_mapping_main = {
    'CAP': 'Capitalização', 'CAPI': 'Capitalização'
}

df = pd.read_csv('Planilha.csv', low_memory=False)

s_br = pd.to_datetime(df['dt_proposta'], format='%d/%m/%Y', errors='coerce')
s_us = pd.to_datetime(df['dt_proposta'], format='%m/%d/%Y', errors='coerce')
inclusao = pd.to_datetime(df['dt_inclusao'], format='%d/%m/%Y', errors='coerce')

diff_br = (s_br - inclusao).dt.days.abs()
diff_us = (s_us - inclusao).dt.days.abs()

mask_us_better = (diff_br > 60) & (diff_us <= 60)
mask_br_nat_us_ok = s_br.isna() & ~s_us.isna()

final_proposta = np.where(mask_us_better | mask_br_nat_us_ok, s_us, s_br)
df['date_base'] = pd.Series(final_proposta, index=df.index)
df['date_base'] = df['date_base'].fillna(inclusao)

df['year'] = df['date_base'].dt.year.astype('Int64').astype(str)
df['month'] = df['date_base'].dt.month.astype('Int64').astype(str).str.zfill(2)

df['ramo_decoded'] = df['ramo'].map(branch_mapping_main)

# Filter Capitalização in Jan 2023
cap_jan23 = df[(df['ramo_decoded'] == 'Capitalização') & (df['year'] == '2023') & (df['month'] == '01')].copy()

if cap_jan23.empty:
    print("Nenhum dado encontrado.")
else:
    # Format pr_total
    cap_jan23['pr_total_num'] = cap_jan23['pr_total'].astype(str).str.replace('R$', '', regex=False).str.replace('.', '', regex=False).str.replace(',', '.', regex=False)
    cap_jan23['pr_total_num'] = pd.to_numeric(cap_jan23['pr_total_num'], errors='coerce').fillna(0)
    
    # Sort by pr_total_num desc
    cap_jan23 = cap_jan23.sort_values(by='pr_total_num', ascending=False)
    
    cols = ['nno', 'dt_inclusao', 'dt_proposta', 'inicio_de_vig', 'ramo', 'pr_total_num']
    print(cap_jan23[cols].head(20).to_string())
    print("\nSoma Local:", cap_jan23['pr_total_num'].sum())
