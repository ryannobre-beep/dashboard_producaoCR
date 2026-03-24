const branchColors = {
    'Vida': '#00AFA3',
    'Conteúdo': '#6B6B6B',
    'Condomínio': '#2D7C9D',
    'Fiança': '#7C45CB',
    'Capitalização': '#F57A00',
    'Imobiliário': '#5A3182',
    'Geral': '#2563EB',
    'Responsabilidade Civil': '#E11D48',
    'Automóvel': '#16A34A',
    'Garantias': '#D97706',
    'Empresarial': '#4F46E5',
    'Cyber': '#9333EA',
    'Engenharia': '#059669',
    'Equipamentos': '#CA8A04',
    'Viagem': '#0891B2',
    'Residencial': '#0D9488',
    'Outros': '#94A3B8',
    'Meta': '#475569'
};

const metricNames = {
    'pr_total': 'Prêmio Total',
    'vl_com_corretora': 'Comissão',
    'valor_repasse': 'Repasse'
};

Chart.defaults.color = '#64748B';
Chart.defaults.font.family = "'Inter', sans-serif";

let rawData = [];
let currentTab = 'Geral';
let currentMetric = 'pr_total';
let startMonthKey = null;
let endMonthKey = null;
let allMonthKeys = []; // Array of "YYYY-MM"

let mainChartObj = null;
let stackedChartObj = null;
let compositionChartObj = null;
let performanceChartObj = null;

const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
};

const formatCurrencyK = (value) => {
    if (value === 0) return 'R$ 0';
    if (value >= 1000000) return 'R$ ' + (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return 'R$ ' + (value / 1000).toFixed(0) + 'K';
    return 'R$ ' + value;
};

const getMonthName = (monthStr) => {
    const d = new Date(2020, parseInt(monthStr) - 1, 1);
    const m = d.toLocaleString('pt-BR', { month: 'short' });
    return m.charAt(0).toUpperCase() + m.slice(1);
};

const formatMonthKey = (key) => {
    const [y, m] = key.split('-');
    return `${getMonthName(m)}/${y.slice(2)}`;
};

async function initDashboard() {
    try {
        const response = await fetch('data.json');
        rawData = await response.json();
        
        // Build distinct month keys
        const keysSet = new Set(rawData.map(d => `${d.year}-${d.month}`));
        allMonthKeys = Array.from(keysSet).sort();
        
        if (allMonthKeys.length > 0) {
            startMonthKey = allMonthKeys[0]; // Or default to something recent
            endMonthKey = allMonthKeys[allMonthKeys.length - 1];
        }
        
        setupFilters();
        setupTabs();
        
        updateDashboard();
    } catch (e) {
        console.error("Failed to load data", e);
    }
}

function setupFilters() {
    const startSelect = document.getElementById('filter-start-month');
    const endSelect = document.getElementById('filter-end-month');
    const metricSelect = document.getElementById('filter-metric');
    
    allMonthKeys.forEach(k => {
        const opt1 = document.createElement('option');
        opt1.value = k;
        opt1.text = formatMonthKey(k);
        startSelect.appendChild(opt1);
        
        const opt2 = document.createElement('option');
        opt2.value = k;
        opt2.text = formatMonthKey(k);
        endSelect.appendChild(opt2);
    });
    
    startSelect.value = startMonthKey;
    endSelect.value = endMonthKey;
    
    startSelect.addEventListener('change', (e) => {
        if (e.target.value > endMonthKey) {
            alert('A data inicial não pode ser maior que a final.');
            e.target.value = startMonthKey;
            return;
        }
        startMonthKey = e.target.value;
        updateDashboard();
    });
    
    endSelect.addEventListener('change', (e) => {
        if (e.target.value < startMonthKey) {
            alert('A data final não pode ser menor que a inicial.');
            e.target.value = endMonthKey;
            return;
        }
        endMonthKey = e.target.value;
        updateDashboard();
    });
    
    metricSelect.addEventListener('change', (e) => {
        currentMetric = e.target.value;
        updateDashboard();
    });
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            tabs.forEach(t => t.style.color = '');
            tabs.forEach(t => t.style.backgroundColor = '');

            tab.classList.add('active');
            currentTab = tab.getAttribute('data-tab');
            
            const color = branchColors[currentTab] || branchColors['Geral'];
            tab.style.color = color;
            tab.style.backgroundColor = color + '15';
            
            document.getElementById('page-title').innerText = currentTab === 'Geral' ? 'Visão Geral' : currentTab;
            document.getElementById('page-subtitle').innerText = currentTab === 'Geral' 
                ? 'Desempenho consolidado de todos os produtos.'
                : `Análise detalhada do ramo ${currentTab}.`;
            document.getElementById('main-chart-title').innerText = currentTab === 'Geral'
                ? 'Evolução Mensal Total'
                : `Evolução Mensal (${currentTab})`;
            
            document.querySelectorAll('.kpi-icon').forEach(icon => {
                icon.style.color = color;
                icon.style.backgroundColor = color + '1A';
            });
            
            updateDashboard();
        });
    });
}

function updateDashboard() {
    // 1. Filter Data
    let filtered = rawData.filter(d => {
        const k = `${d.year}-${d.month}`;
        return k >= startMonthKey && k <= endMonthKey;
    });
    
    if (currentTab !== 'Geral') {
        filtered = filtered.filter(d => d.ramo_decoded === currentTab);
    }
    
    // 2. Aggregate Data
    const totalMetricValue = filtered.reduce((acc, curr) => acc + curr[currentMetric], 0);
    
    const timeAgg = {}; 
    filtered.forEach(d => {
        const k = `${d.year}-${d.month}`;
        if (!timeAgg[k]) timeAgg[k] = { value: 0 };
        timeAgg[k].value += d[currentMetric];
    });
    
    const sortedTimeKeys = Object.keys(timeAgg).sort();
    
    let bestTime = '-';
    let maxVal = 0;
    sortedTimeKeys.forEach(k => {
        if (timeAgg[k].value > maxVal) {
            maxVal = timeAgg[k].value;
            bestTime = formatMonthKey(k);
        }
    });
    
    document.getElementById('kpi-total').innerText = formatCurrency(totalMetricValue);
    const avgStr = sortedTimeKeys.length ? formatCurrency(totalMetricValue / sortedTimeKeys.length) : 'R$ 0';
    // Render Main Line/Bar Chart (Always)
    renderMainChart(sortedTimeKeys, timeAgg);
    
    // Render Stacked Chart only on Geral
    const stackedRow = document.getElementById('stacked-chart-row');
    if (stackedRow) {
        if (currentTab === 'Geral') {
            stackedRow.style.display = 'block';
            renderStackedChart(sortedTimeKeys, filtered);
        } else {
            stackedRow.style.display = 'none';
        }
    }
    
    renderCompositionChart(filtered, totalMetricValue);
    renderPerformanceChart(filtered);
}

function renderStackedChart(keys, filteredData) {
    const ctx = document.getElementById('stackedChart').getContext('2d');
    if (stackedChartObj) stackedChartObj.destroy();
    
    const labels = keys.map(k => formatMonthKey(k));
    
    const coreBranches = ['Imobiliário', 'Capitalização', 'Fiança', 'Condomínio', 'Conteúdo', 'Vida'];
    
    // Group by branch
    const branchData = {};
    filteredData.forEach(d => {
        let branch = d.ramo_decoded;
        if (!coreBranches.includes(branch)) {
            branch = 'Outros';
        }
        
        if (!branchData[branch]) {
            branchData[branch] = {};
            keys.forEach(k => branchData[branch][k] = 0); // initialize all months
        }
        const k = `${d.year}-${d.month}`;
        if (branchData[branch][k] !== undefined) {
             branchData[branch][k] += d[currentMetric];
        }
    });

    const datasets = Object.keys(branchData).map(branch => {
        return {
            label: branch,
            data: keys.map(k => branchData[branch][k]),
            backgroundColor: branchColors[branch] || branchColors['Outros'],
            borderWidth: 1.5,
            borderColor: '#FFFFFF',
            borderRadius: 4,
            barPercentage: 0.65,
            categoryPercentage: 0.85
        };
    });
    
    // Sort datasets so "Vida" is top, others follow a standard logic
    const orderScore = {
        'Outros': 0,
        'Imobiliário': 1,
        'Capitalização': 2,
        'Fiança': 3,
        'Condomínio': 4,
        'Conteúdo': 5,
        'Vida': 6
    };
    datasets.sort((a,b) => {
        return (orderScore[a.label] || 0) - (orderScore[b.label] || 0);
    });

    stackedChartObj = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    display: true, 
                    position: 'top',
                    labels: { usePointStyle: true, boxWidth: 10, padding: 20 }
                }, 
                tooltip: { 
                    mode: 'index',
                    intersect: false,
                    callbacks: { label: c => ` ${c.dataset.label}: ${formatCurrency(c.raw)}` } 
                } 
            },
            scales: {
                x: { stacked: true, grid: { display: false, drawBorder: true } },
                y: { stacked: true, grid: { color: '#E2E8F0', drawBorder: false }, border: { display: false }, ticks: { callback: v => formatCurrencyK(v) } }
            }
        }
    });
}

function renderMainChart(keys, timeAgg) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    if (mainChartObj) mainChartObj.destroy();
    
    const activeColor = branchColors[currentTab] || branchColors['Geral'];
    const labels = keys.map(k => formatMonthKey(k));
    const dataPoints = keys.map(k => timeAgg[k].value);
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, activeColor + '4D');
    gradient.addColorStop(1, '#FFFFFF00');

    const isGeral = currentTab === 'Geral';
    
    mainChartObj = new Chart(ctx, {
        type: isGeral ? 'line' : 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: metricNames[currentMetric],
                data: dataPoints,
                borderColor: activeColor,
                backgroundColor: isGeral ? gradient : activeColor,
                borderWidth: isGeral ? 3 : 0,
                borderRadius: isGeral ? 0 : 6,
                fill: isGeral,
                tension: 0.3,
                pointBackgroundColor: '#FFF',
                pointBorderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => formatCurrency(c.raw) } } },
            scales: {
                y: { grid: { color: '#E2E8F0', drawBorder: false }, border: { display: false }, ticks: { callback: v => formatCurrencyK(v) } },
                x: { grid: { display: false, drawBorder: true } }
            }
        }
    });
}

function renderCompositionChart(filteredData, totalValue) {
    const ctx = document.getElementById('compositionChart').getContext('2d');
    if (compositionChartObj) compositionChartObj.destroy();
    
    let dLabels = [];
    let dData = [];
    let dColors = [];
    
    if (currentTab === 'Geral') {
        document.getElementById('comp-title').innerText = 'Composição por Ramo';
        const branchAgg = {};
        filteredData.forEach(d => {
            if (!branchAgg[d.ramo_decoded]) branchAgg[d.ramo_decoded] = 0;
            branchAgg[d.ramo_decoded] += d[currentMetric];
        });
        const sortedBranches = Object.keys(branchAgg).sort((a,b) => branchAgg[b] - branchAgg[a]);
        // Top 5 and others
        const top5 = sortedBranches.slice(0, 5);
        let others = 0;
        sortedBranches.slice(5).forEach(b => others += branchAgg[b]);
        
        top5.forEach(b => {
            dLabels.push(b);
            dData.push(branchAgg[b]);
            dColors.push(branchColors[b] || branchColors['Outros']);
        });
        if (others > 0) {
            dLabels.push('Outros');
            dData.push(others);
            dColors.push(branchColors['Outros']);
        }
    } else {
        document.getElementById('comp-title').innerText = 'Volume de Vendas (Prêmio vs Comissão)';
        let p = 0; let c = 0; let r = 0;
        filteredData.forEach(d => {
            p += d.pr_total;
            c += d.vl_com_corretora;
            r += d.valor_repasse;
        });
        dLabels = ['Prêmio Líquido / Outros', 'Comissão', 'Repasse Estimado'];
        // pr_total is usually the gross. This visual just breaks down the available gross numbers roughly.
        // Actually, let's just show Comissão vs Prêmio Total as a ratio.
        dData = [p - c - r > 0 ? p - c - r : p, c, r];
        const baseColor = branchColors[currentTab];
        dColors = [baseColor + '40', baseColor, baseColor + 'B3']; // shades
    }

    compositionChartObj = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: dLabels,
            datasets: [{
                data: dData,
                backgroundColor: dColors,
                borderWidth: 2,
                borderColor: '#FFF',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15, boxWidth: 8, font: {size: 11} } },
                tooltip: { callbacks: { label: c => ` ${c.label}: ${formatCurrency(c.raw)}` } }
            }
        }
    });
}

function renderPerformanceChart(filteredData) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    if (performanceChartObj) performanceChartObj.destroy();
    
    if (currentTab === 'Geral') {
        document.getElementById('rank-title').innerText = 'Ranking de Ramos (Valor Bruto)';
        const branchAgg = {};
        filteredData.forEach(d => {
            if (!branchAgg[d.ramo_decoded]) branchAgg[d.ramo_decoded] = 0;
            branchAgg[d.ramo_decoded] += d[currentMetric];
        });
        const sortedBranches = Object.keys(branchAgg).sort((a,b) => branchAgg[b] - branchAgg[a]).slice(0,8);
        
        performanceChartObj = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedBranches,
                datasets: [{
                    data: sortedBranches.map(b => branchAgg[b]),
                    backgroundColor: sortedBranches.map(b => branchColors[b] || branchColors['Outros']),
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => formatCurrency(c.raw) } } },
                scales: {
                    x: { grid: { color: '#E2E8F0' }, border: {display:false}, ticks: { callback: v => formatCurrencyK(v) } },
                    y: { grid: { display: false } }
                }
            }
        });
    } else {
        document.getElementById('rank-title').innerText = 'Comparativo Ano Contra Ano (YoY)';
        
        // Group by Year and Month
        const years = [...new Set(filteredData.map(d => d.year))].sort();
        const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
        
        const datasets = years.map((y, i) => {
            const dataP = months.map(m => {
                const row = filteredData.find(d => d.year === y && d.month === m);
                return row ? row[currentMetric] : 0;
            });
            
            // Generate some shades of the active color for different years
            const activeColor = branchColors[currentTab];
            const opacity = 1 - (years.length - 1 - i) * 0.3; // Older years are more transparent
            const rgba = opacity > 0 ? opacity : 0.1;
            
            return {
                label: y,
                data: dataP,
                backgroundColor: activeColor + Math.round(rgba * 255).toString(16).padStart(2, '0').toUpperCase(),
                borderRadius: 4
            };
        });

        performanceChartObj = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } },
                    tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${formatCurrency(c.raw)}` } }
                },
                scales: {
                    y: { grid: { color: '#E2E8F0', drawBorder: false }, border: { display: false }, ticks: { callback: v => formatCurrencyK(v) } },
                    x: { grid: { display: false, drawBorder: true } }
                }
            }
        });
    }
}

initDashboard();
