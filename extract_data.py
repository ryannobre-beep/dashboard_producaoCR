import pandas as pd
import json
import traceback
import numpy as np
import glob

branch_mapping_main = {
    'AUTO': 'Automóvel',
    'CAP': 'Capitalização', 'CAPI': 'Capitalização',
    'COND': 'Condomínio',
    'RESI': 'Residencial',
    'EMP': 'Empresarial',
    'IMOR': 'Imobiliário', 'IMOE': 'Imobiliário',
    'CTDR': 'Conteúdo', 'CTDE': 'Conteúdo',
    'FIAN': 'Fiança',
    'GART': 'Garantias', 'GLOB': 'Garantias',
    'RC A': 'Responsabilidade Civil', 'RC G': 'Responsabilidade Civil', 
    'RC P': 'Responsabilidade Civil', 'E&O': 'Responsabilidade Civil',
    'REPC': 'Responsabilidade Civil',
    'ENG': 'Engenharia', 'RENG': 'Engenharia',
    'EQPO': 'Equipamentos', 'EQUI': 'Equipamentos',
    'CYBE': 'Cyber',
    'VIDA': 'Vida', 'VG': 'Vida', 'CV': 'Vida',
    'VIAG': 'Viagem',
    'META': 'Meta'
}

# Mapping for the supplementary spreadsheet
supp_mapping = {
    'Seguros Condomínios': 'Condomínio',
    'Seguros Conteúdo': 'Conteúdo',
    'Seguros Vida Condomínio': 'Vida'
}

month_map = {
    'jan.': '01', 'fev.': '02', 'mar.': '03', 'abr.': '04',
    'mai.': '05', 'jun.': '06', 'jul.': '07', 'ago.': '08',
    'set.': '09', 'out.': '10', 'nov.': '11', 'dez.': '12'
}

def parse_supp_date(date_str):
    try:
        parts = date_str.lower().strip().split(' ')
        m = month_map.get(parts[0], '00')
        y = parts[1]
        return y, m
    except:
        return None, None

def get_supplementary_data():
    try:
        f = glob.glob('Restante*.csv')[0]
        df2 = pd.read_csv(f)
        headers = df2.iloc[0].values
        df2 = df2.iloc[1:].copy()
        df2.columns = headers
        df2 = df2.rename(columns={df2.columns[0]: 'Produto'})
        
        melted = df2.melt(id_vars=['Produto'], var_name='mes_ano', value_name='pr_total')
        melted = melted.dropna(subset=['pr_total'])
        melted = melted[~melted['pr_total'].astype(str).str.contains('SEM DADO', na=False, case=False)]
        melted = melted[melted['mes_ano'].notna()]
        
        # Parse Dates
        dates = melted['mes_ano'].apply(parse_supp_date)
        melted['year'] = [d[0] for d in dates]
        melted['month'] = [d[1] for d in dates]
        melted = melted.dropna(subset=['year', 'month'])
        
        # Vigência for supplementary data is just the same as proposal
        melted['vig_year'] = melted['year']
        melted['vig_month'] = melted['month']
        
        # Decode Branch
        melted['ramo_decoded'] = melted['Produto'].map(supp_mapping)
        melted = melted.dropna(subset=['ramo_decoded'])
        
        # Clean Val
        melted['pr_total'] = melted['pr_total'].astype(str).str.replace('R$', '', regex=False).str.replace('.', '', regex=False).str.replace(',', '.', regex=False)
        melted['pr_total'] = pd.to_numeric(melted['pr_total'], errors='coerce').fillna(0)
        
        # Add missing columns
        melted['vl_com_corretora'] = 0.0
        melted['valor_repasse'] = 0.0
        melted['pr_liquido'] = 0.0
        
        return melted[['year', 'month', 'vig_year', 'vig_month', 'ramo_decoded', 'pr_total', 'vl_com_corretora', 'valor_repasse', 'pr_liquido']]
    except Exception as e:
        print("Could not load supplementary data:", e)
        return pd.DataFrame()

try:
    # 1. Load Main Data
    df = pd.read_csv('Planilha.csv', low_memory=False)

    money_cols = ['pr_total', 'vl_com_corretora', 'valor_repasse', 'pr_liquido']
    for col in money_cols:
        if col in df.columns:
            df[col] = df[col].astype(str).str.replace('R$', '', regex=False).str.replace('.', '', regex=False).str.replace(',', '.', regex=False)
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

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
    
    # --- Parse Inicio de Vigencia ---
    v_br = pd.to_datetime(df['inicio_de_vig'], format='%d/%m/%Y', errors='coerce')
    v_us = pd.to_datetime(df['inicio_de_vig'], format='%m/%d/%Y', errors='coerce')
    
    diff_v_br = (v_br - inclusao).dt.days.abs()
    diff_v_us = (v_us - inclusao).dt.days.abs()
    
    mask_v_us_better = (diff_v_br > 60) & (diff_v_us <= 60)
    mask_v_br_nat_us_ok = v_br.isna() & ~v_us.isna()
    
    final_vig = np.where(mask_v_us_better | mask_v_br_nat_us_ok, v_us, v_br)
    df['date_vig'] = pd.Series(final_vig, index=df.index)
    
    # Fallback to date_base if missing
    df['date_vig'] = df['date_vig'].fillna(df['date_base'])
    
    df['vig_year'] = df['date_vig'].dt.year.astype('Int64').astype(str)
    df['vig_month'] = df['date_vig'].dt.month.astype('Int64').astype(str).str.zfill(2)
    
    df = df.dropna(subset=['year', 'month', 'vig_year', 'vig_month'])
    df = df[(df['year'] >= '2020') & (df['year'] <= '2030')]
    
    df['ramo_decoded'] = df['ramo'].map(branch_mapping_main).fillna(df['ramo'])
    
    # 2. Append Supplementary Data
    supp_df = get_supplementary_data()
    if not supp_df.empty:
        df = pd.concat([df, supp_df], ignore_index=True)
    
    # 3. Group and Export
    grouped = df.groupby(['year', 'month', 'vig_year', 'vig_month', 'ramo_decoded'])[
        ['pr_total', 'vl_com_corretora', 'valor_repasse', 'pr_liquido']
    ].sum().reset_index()
    
    grouped = grouped.sort_values(by=['year', 'month'])

    records = grouped.to_dict(orient='records')

    for r in records:
        r['pr_total'] = float(r['pr_total'])
        r['vl_com_corretora'] = float(r['vl_com_corretora'])
        r['valor_repasse'] = float(r['valor_repasse'])
        r['pr_liquido'] = float(r['pr_liquido'])

    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print("Data combined and exported successfully.")

except Exception as e:
    print("Error:", e)
    traceback.print_exc()
