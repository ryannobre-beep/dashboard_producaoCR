import pandas as pd

branch_mapping = {
    'COND': 'Condomínio',
    'CTDR': 'Conteúdo', 'CTDE': 'Conteúdo'
}

df = pd.read_csv('Planilha.csv', low_memory=False)

df['ramo_decoded'] = df['ramo'].map(branch_mapping)
df = df[df['ramo_decoded'].isin(['Condomínio', 'Conteúdo'])]

print(f"Total rows for Condomínio/Conteúdo: {len(df)}")

df['dt_proposta_dt'] = pd.to_datetime(df['dt_proposta'], format='%d/%m/%Y', errors='coerce')
df['dt_inclusao_dt'] = pd.to_datetime(df['dt_inclusao'], format='%d/%m/%Y', errors='coerce')

missing_proposta = df['dt_proposta_dt'].isna().sum()
print(f"Rows missing dt_proposta: {missing_proposta}")

recent = df[df['dt_inclusao_dt'] >= '2024-09-01']
print(f"Rows included after 2024-09-01 (by dt_inclusao): {len(recent)}")

if len(recent) > 0:
    print("\nSample of rows included after 2024-09-01:")
    cols = ['nno', 'dt_inclusao', 'dt_proposta', 'dt_emissao', 'ramo', 'pr_total', 'status']
    print(recent[cols].head(10).to_string())
    
    # Try grouping the recent ones by dt_inclusao
    recent['month'] = recent['dt_inclusao_dt'].dt.to_period('M')
    print("\nRecent rows by dt_inclusao:")
    print(recent.groupby('month').size())

