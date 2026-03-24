import pandas as pd
import glob

f = glob.glob('Restante*.csv')[0]
df2 = pd.read_csv(f)

# The first row contains the month/year headers
headers = df2.iloc[0].values
# We drop the first row
df2 = df2.iloc[1:].copy()
# Set the columns
df2.columns = headers

# The first column name is probably NaN or something. Let's rename it to 'Produto'
df2 = df2.rename(columns={df2.columns[0]: 'Produto'})

# Melt the dataframe
melted = df2.melt(id_vars=['Produto'], var_name='mes_ano', value_name='pr_total')

# Filter out empty or "SEM DADO" or NaN
melted = melted.dropna(subset=['pr_total'])
melted = melted[~melted['pr_total'].astype(str).str.contains('SEM DADO', na=False, case=False)]
melted = melted[melted['mes_ano'].notna()]

print(melted.head(10))

# Convert mes_ano like "jan. 2024" to "2024-01"
month_map = {
    'jan.': '01', 'fev.': '02', 'mar.': '03', 'abr.': '04',
    'mai.': '05', 'jun.': '06', 'jul.': '07', 'ago.': '08',
    'set.': '09', 'out.': '10', 'nov.': '11', 'dez.': '12'
}

def parse_date(date_str):
    try:
        parts = date_str.lower().strip().split(' ')
        m = month_map.get(parts[0], '00')
        y = parts[1]
        return f"{y}-{m}"
    except:
        return None

melted['year_month'] = melted['mes_ano'].apply(parse_date)
melted = melted.dropna(subset=['year_month'])
print("\nParsed Dates:")
print(melted.head(10))
