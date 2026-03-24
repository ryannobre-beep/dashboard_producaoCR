import pandas as pd
import traceback
import numpy as np

branch_mapping = {
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

core_branches = [
    'Imobiliário', 
    'Capitalização', 
    'Fiança', 
    'Condomínio', 
    'Conteúdo', 
    'Vida'
]

def format_currency(val):
    return f"R$ {val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

try:
    df = pd.read_csv('Planilha.csv', low_memory=False)

    df['pr_total'] = df['pr_total'].astype(str).str.replace('R$', '', regex=False).str.replace('.', '', regex=False).str.replace(',', '.', regex=False)
    df['pr_total'] = pd.to_numeric(df['pr_total'], errors='coerce').fillna(0)

    # Intelligent Date Parsing for dt_proposta
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
    
    # Filter 2024 onwards
    df = df.dropna(subset=['date_base'])
    df = df[df['date_base'].dt.year >= 2024]
    
    df['month_year'] = df['date_base'].dt.to_period('M').astype(str)
    
    df['ramo_decoded'] = df['ramo'].map(branch_mapping).fillna(df['ramo'])
    df = df[df['ramo_decoded'].isin(core_branches)]
    
    # Group by month_year and branch
    grouped = df.groupby(['month_year', 'ramo_decoded'])['pr_total'].sum().unstack(fill_value=0)
    grouped = grouped.sort_index()
    
    # Reorder columns to ensure consistent display
    cols = [b for b in core_branches if b in grouped.columns]
    grouped = grouped[cols]
    
    # Generate Markdown Table
    print("| Mês/Ano | " + " | ".join(cols) + " | Total |")
    print("|---|" + "|".join(["---" for _ in cols]) + "|---|")
    
    total_row = {col: 0 for col in cols}
    total_absolute = 0
    
    for idx, row in grouped.iterrows():
        row_str = f"| {idx} |"
        row_total = 0
        for col in cols:
            val = row[col]
            row_total += val
            total_row[col] += val
            row_str += f" {format_currency(val)} |"
            
        total_absolute += row_total
        row_str += f" **{format_currency(row_total)}** |"
        print(row_str)
        
    # Print Totals Row
    tot_str = "| **TOTAL** |"
    for col in cols:
        tot_str += f" **{format_currency(total_row[col])}** |"
    tot_str += f" **{format_currency(total_absolute)}** |"
    print(tot_str)
        
except Exception as e:
    print("Error:", e)
    traceback.print_exc()
