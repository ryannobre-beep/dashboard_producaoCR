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
        melted['pr_liquido'] = melted['pr_total'] # Fallback
        melted['nno'] = ''
        melted['seg'] = ''
        melted['cliente'] = 'DADO SUPLEMENTAR'
        melted['cpf_cnpj'] = ''
        melted['no_apolice'] = ''
        melted['no_renovacao'] = ''
        melted['dt_proposta'] = ''
        
        return melted[['year', 'month', 'vig_year', 'vig_month', 'ramo_decoded', 'pr_total', 'vl_com_corretora', 'valor_repasse', 'pr_liquido', 'nno', 'seg', 'cliente', 'cpf_cnpj', 'no_apolice', 'no_renovacao', 'dt_proposta']]
    except Exception as e:
        print("Could not load supplementary data:", e)
        return pd.DataFrame()

try:
    # 1. Load Main Data
    df = pd.read_csv('Planilha.csv', low_memory=False)

    money_cols = ['pr_total', 'vl_com_corretora', 'valor_repasse', 'pr_liquido']
    for col in money_cols:
        if col in df.columns:
            df[col] = df[col].astype(str).str.replace('R$', '', regex=False)\
                             .str.replace('.', '', regex=False)\
                             .str.replace(',', '.', regex=False)\
                             .str.replace(' ', '', regex=False)
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    s_br = pd.to_datetime(df['dt_proposta'], errors='coerce', dayfirst=True)
    inclusao = pd.to_datetime(df['dt_inclusao'], errors='coerce', dayfirst=True)
    
    df['date_base'] = s_br.fillna(inclusao)
    
    df['year'] = df['date_base'].dt.year.astype('Int64').astype(str)
    df['month'] = df['date_base'].dt.month.astype('Int64').astype(str).str.zfill(2)
    
    # --- Parse Inicio de Vigencia ---
    v_br = pd.to_datetime(df['inicio_de_vig'], errors='coerce', dayfirst=True)
    df['date_vig'] = v_br
    
    # Fallback to date_base if missing
    df['date_vig'] = df['date_vig'].fillna(df['date_base'])
    
    df['vig_year'] = df['date_vig'].dt.year.astype('Int64').astype(str)
    df['vig_month'] = df['date_vig'].dt.month.astype('Int64').astype(str).str.zfill(2)
    
    df = df.dropna(subset=['year', 'month', 'vig_year', 'vig_month'])
    
    # Hard bounds for dashboard limits based on user instructions
    df = df[(df['year'] >= '2020') & (df['year'] <= '2026')]
    df = df[df['date_base'] <= pd.Timestamp('2026-02-28')]
    
    # Ensure core mapping
    df['ramo_decoded'] = df['ramo'].map(branch_mapping_main).fillna(df['ramo'])
    
    cols_to_keep = ['year', 'month', 'vig_year', 'vig_month', 'ramo_decoded', 'pr_total', 'vl_com_corretora', 'valor_repasse', 'pr_liquido', 'nno', 'seg', 'cliente', 'cpf_cnpj', 'no_apolice', 'no_renovacao', 'dt_proposta']
    
    # Fill missing strings
    str_cols = ['nno', 'seg', 'cliente', 'cpf_cnpj', 'no_apolice', 'no_renovacao', 'dt_proposta']
    for c in str_cols:
        if c not in df.columns:
            df[c] = ''
        else:
            df[c] = df[c].fillna('').astype(str)

    df_flat = df[cols_to_keep].copy()

    # 2. Append Supplementary Data
    supp_df = get_supplementary_data()
    if not supp_df.empty:
        df_flat = pd.concat([df_flat, supp_df], ignore_index=True)
    
    # Fill numeric NaNs
    for c in ['pr_total', 'vl_com_corretora', 'valor_repasse', 'pr_liquido']:
        df_flat[c] = pd.to_numeric(df_flat[c], errors='coerce').fillna(0.0)
    
    df_flat = df_flat.sort_values(by=['year', 'month'])
    records = df_flat.to_dict(orient='records')

    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print("Data combined and exported successfully.")

except Exception as e:
    print("Error:", e)
    traceback.print_exc()
