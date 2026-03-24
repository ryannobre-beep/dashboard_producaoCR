import pandas as pd
import json

with open('data.json', 'r') as f:
    data = json.load(f)

# Filter for year == '2023' and month == '01'
jan23 = [d for d in data if d['year'] == '2023' and d['month'] == '01']

if not jan23:
    print("No data for Jan/2023 found in data.json!")
else:
    # Sort by 'pr_total'
    jan23 = sorted(jan23, key=lambda x: x['pr_total'], reverse=True)
    
    print("| Ramo | Prêmio Total | Comissão | Repasse |")
    print("|---|---|---|---|")
    total_p = 0
    total_c = 0
    total_r = 0
    for d in jan23:
        p = d['pr_total']
        c = d['vl_com_corretora']
        r = d['valor_repasse']
        total_p += p
        total_c += c
        total_r += r
        
        fmt_p = f"R$ {p:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
        fmt_c = f"R$ {c:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
        fmt_r = f"R$ {r:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
        
        print(f"| {d['ramo_decoded']} | {fmt_p} | {fmt_c} | {fmt_r} |")
        
    fmt_tp = f"R$ {total_p:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    fmt_tc = f"R$ {total_c:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    fmt_tr = f"R$ {total_r:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    print(f"| **TOTAL** | **{fmt_tp}** | **{fmt_tc}** | **{fmt_tr}** |")
