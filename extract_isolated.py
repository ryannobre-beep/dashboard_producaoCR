import pandas as pd
import json
import traceback

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
    'ENG': 'Engenharia', 'RENG': 'Engenharia',
    'EQPO': 'Equipamentos', 'EQUI': 'Equipamentos',
    'CYBE': 'Cyber',
    'VIDA': 'Vida', 'VG': 'Vida', 'CV': 'Vida',
    'VIAG': 'Viagem'
}

target_branches = [
    'Imobiliário', 
    'Capitalização', 
    'Fiança', 
    'Condomínio', 
    'Conteúdo', 
    'Vida'
]

try:
    df = pd.read_csv('Planilha.csv', low_memory=False)

    for col in ['pr_total', 'valor_repasse']:
        if col in df.columns:
            df[col] = df[col].astype(str).str.replace('R$', '', regex=False).str.replace('.', '', regex=False).str.replace(',', '.', regex=False)
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    df['dt_proposta'] = pd.to_datetime(df['dt_proposta'], format='%d/%m/%Y', errors='coerce')
    df['year'] = df['dt_proposta'].dt.year.astype('Int64').astype(str)
    
    # Filter valid dates & years
    df = df.dropna(subset=['year'])
    df = df[df['year'].str.contains('202', na=False)]  # e.g., 2020-2029
    
    df['ramo_decoded'] = df['ramo'].map(branch_mapping).fillna('Outros')
    
    # Only keep the target branches
    df = df[df['ramo_decoded'].isin(target_branches)]
    
    grouped = df.groupby(['year', 'ramo_decoded'])['pr_total'].sum().reset_index()
    
    pivot_df = grouped.pivot(index='year', columns='ramo_decoded', values='pr_total').fillna(0)
    pivot_df = pivot_df.sort_index()
    
    # Ensure all target branches exist
    for b in target_branches:
        if b not in pivot_df.columns:
            pivot_df[b] = 0
            
    # Years list
    years = pivot_df.index.tolist()
    datasets = {}
    
    # Fill dict using the target order (bottom to top for Chart.js)
    for branch in target_branches:
        datasets[branch] = pivot_df[branch].tolist()
        
    data = {
        'labels': years,
        'datasets': datasets
    }

    with open('isolated_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("Isolated data exported successfully.")
except Exception as e:
    print("Error:", e)
    traceback.print_exc()
