const branchColors = {
    'Vida': '#00AFA3',
    'Conteúdo': '#6B6B6B',
    'Condomínio': '#2D7C9D',
    'Fiança': '#7C45CB',
    'Capitalização': '#E67E22', 
    'Imobiliário': '#5A3182',
    'Geral': '#502896',         
    'Ramos Elementares': '#94A3B8',
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
let currentMetric = 'pr_liquido';
let dateSource = 'proposta';
let startMonthKey = null;
let endMonthKey = null;
let allMonthKeys = []; // Array of "YYYY-MM"

let mainChartObj = null;
let stackedChartObj = null;
let compositionChartObj = null;
let performanceChartObj = null;
let areaChartObj = null;

let selectedOverviewBranches = [];

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
        rebuildMonthKeys();
        
        // Initial selected branches
        const filterCategories = ['Vida', 'Condomínio', 'Capitalização', 'Fiança', 'Imobiliário', 'Conteúdo', 'Ramos Elementares'];
        selectedOverviewBranches = [...filterCategories];
        
        setupFilters();
        setupTabs();
        
        updateDashboard();
    } catch (e) {
        console.error("Failed to load data", e);
    }
}

function rebuildMonthKeys() {
    const keysSet = new Set();
    rawData.forEach(d => {
        if (dateSource === 'proposta') {
            keysSet.add(`${d.year}-${d.month}`);
        } else {
            keysSet.add(`${d.vig_year}-${d.vig_month}`);
        }
    });
    allMonthKeys = Array.from(keysSet)
        .filter(k => k && !k.includes('null') && !k.includes('undefined'))
        .sort();
        
    if (allMonthKeys.length > 0) {
        startMonthKey = allMonthKeys[0]; 
        endMonthKey = allMonthKeys[allMonthKeys.length - 1];
    } else {
        startMonthKey = null;
        endMonthKey = null;
    }
}

function setupFilters() {
    const startSelect = document.getElementById('filter-start-month');
    const endSelect = document.getElementById('filter-end-month');
    const metricSelect = document.getElementById('filter-metric');
    const sourceSelect = document.getElementById('filter-date-source');

    function setupProductFilters() {
        const container = document.getElementById('product-pills');
        if (!container) return;
        container.innerHTML = '';
        
        const filterCategories = ['Imobiliário', 'Fiança', 'Capitalização', 'Conteúdo', 'Condomínio', 'Vida', 'Ramos Elementares'];
        
        filterCategories.forEach(b => {
            const pill = document.createElement('div');
            pill.className = 'product-pill' + (selectedOverviewBranches.includes(b) ? ' active' : '');
            pill.innerText = b;
            
            pill.addEventListener('click', () => {
                if (selectedOverviewBranches.includes(b)) {
                    selectedOverviewBranches = selectedOverviewBranches.filter(x => x !== b);
                    pill.classList.remove('active');
                } else {
                    selectedOverviewBranches.push(b);
                    pill.classList.add('active');
                }
                updateDashboard();
            });
            container.appendChild(pill);
        });
    }
    setupProductFilters();
    
    function populateDateDropdowns() {
        startSelect.innerHTML = '';
        endSelect.innerHTML = '';
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
        
        if (startMonthKey) startSelect.value = startMonthKey;
        if (endMonthKey) endSelect.value = endMonthKey;
    }
    
    populateDateDropdowns();
    
    sourceSelect.addEventListener('change', (e) => {
        dateSource = e.target.value;
        rebuildMonthKeys();
        populateDateDropdowns();
        updateDashboard();
    });
    
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
    if (!startMonthKey || !endMonthKey) return;
    
    // 1. Filter Data
    let filtered = rawData.filter(d => {
        const k = dateSource === 'proposta' ? `${d.year}-${d.month}` : `${d.vig_year}-${d.vig_month}`;
        return k >= startMonthKey && k <= endMonthKey;
    });
    
    if (currentTab !== 'Geral') {
        filtered = filtered.filter(d => d.ramo_decoded === currentTab);
    } else {
        const coreBranches = ['Vida', 'Condomínio', 'Capitalização', 'Fiança', 'Imobiliário', 'Conteúdo'];
        filtered = filtered.filter(d => {
            let cat = d.ramo_decoded;
            if (!coreBranches.includes(cat)) cat = 'Ramos Elementares';
            return selectedOverviewBranches.includes(cat);
        });
    }
    
    // 2. Aggregate Data
    const totalMetricValue = filtered.reduce((acc, curr) => acc + curr[currentMetric], 0);
    
    const timeAgg = {}; 
    filtered.forEach(d => {
        const k = dateSource === 'proposta' ? `${d.year}-${d.month}` : `${d.vig_year}-${d.vig_month}`;
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
    
    // Render Main Line/Bar Chart (Always)
    renderMainChart(sortedTimeKeys, timeAgg, filtered);
    
    // Render Stacked Chart only on Geral
    const stackedRow = document.getElementById('stacked-chart-row');
    const areaRow = document.getElementById('area-chart-row');
    const customFilters = document.getElementById('overview-filters-container');
    
    if (stackedRow && areaRow) {
        if (currentTab === 'Geral') {
            stackedRow.style.display = 'block';
            areaRow.style.display = 'block';
            if(customFilters) customFilters.style.display = 'block';
            renderStackedChart(sortedTimeKeys, filtered);
            renderAreaChart(sortedTimeKeys, filtered);
        } else {
            stackedRow.style.display = 'none';
            areaRow.style.display = 'none';
            if(customFilters) customFilters.style.display = 'none';
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
            branch = 'Ramos Elementares';
        }
        
        if (!branchData[branch]) {
            branchData[branch] = {};
            keys.forEach(k => branchData[branch][k] = 0); // initialize all months
        }
        const k = dateSource === 'proposta' ? `${d.year}-${d.month}` : `${d.vig_year}-${d.vig_month}`;
        if (branchData[branch][k] !== undefined) {
             branchData[branch][k] += d[currentMetric];
        }
    });

    const datasets = Object.keys(branchData).map(branch => {
        return {
            label: branch,
            data: keys.map(k => branchData[branch][k]),
            backgroundColor: branchColors[branch] || branchColors['Ramos Elementares'],
            borderWidth: 1.5,
            borderColor: '#FFFFFF',
            borderRadius: 4,
            barPercentage: 0.65,
            categoryPercentage: 0.85
        };
    });
    
    // Sort datasets so "Vida" is top, others follow a standard logic
    const orderScore = {
        'Ramos Elementares': 0,
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
            onClick: (e, activeElements) => {
                if (activeElements.length > 0) {
                    const dsIdx = activeElements[0].datasetIndex;
                    const idx = activeElements[0].index;
                    const clickedKey = keys[idx];
                    const clickedBranch = datasets[dsIdx].label;
                    const drillData = filteredData.filter(d => {
                        const k = dateSource === 'proposta' ? `${d.year}-${d.month}` : `${d.vig_year}-${d.vig_month}`;
                        let b = d.ramo_decoded;
                        const coreBranches = ['Vida', 'Condomínio', 'Capitalização', 'Fiança', 'Imobiliário', 'Conteúdo'];
                        if (!coreBranches.includes(b)) b = 'Ramos Elementares';
                        return k === clickedKey && b === clickedBranch;
                    });
                    openDrilldownModal(`${formatMonthKey(clickedKey)} - ${clickedBranch}`, drillData);
                }
            },
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

function openDrilldownModal(title, drillData) {
    document.getElementById('drilldown-title').innerText = `Detalhamento: ${title} (${drillData.length} registros)`;
    const tbody = document.getElementById('drilldown-table-body');
    tbody.innerHTML = '';
    
    // Process and sort highest to lowest metric
    drillData.sort((a,b) => b[currentMetric] - a[currentMetric]);
    
    // Prevent DOM overload if too many rows, though 15k is technically fine, 
    // let's cap at 5000 just in case. They usually won't click a block with >5000 rows.
    const renderLimit = Math.min(drillData.length, 5000);
    
    const renderDate = (dstr) => {
        if (!dstr || dstr === 'nan' || dstr === 'NaT' || dstr === 'undefined') return '-';
        if (dstr.includes(' ')) return dstr.split(' ')[0];
        return dstr;
    };
    
    const safeStr = (str) => {
        if (!str || str === 'nan' || str === 'NaN' || str === 'undefined' || str === 'None') return '-';
        return str;
    };

    let html = '';
    for (let i = 0; i < renderLimit; i++) {
        const d = drillData[i];
        html += `
            <tr>
                <td>${safeStr(d.nno)}</td>
                <td>${safeStr(d.seg)}</td>
                <td><span class="product-pill" style="font-size:11px; padding:2px 8px; border:1px solid var(--border-color);">${safeStr(d.ramo_decoded)}</span></td>
                <td><div style="max-width:200px; overflow:hidden; text-overflow:ellipsis;" title="${safeStr(d.cliente)}">${safeStr(d.cliente)}</div></td>
                <td>${safeStr(d.cpf_cnpj)}</td>
                <td>${safeStr(d.no_apolice)}</td>
                <td>${safeStr(d.no_renovacao)}</td>
                <td>${renderDate(d.dt_proposta)}</td>
                <td style="font-weight:600;">${formatCurrency(d.pr_liquido)}</td>
                <td style="color:#E67E22;">${formatCurrency(d.vl_com_corretora)}</td>
                <td style="color:#502896;">${formatCurrency(d.valor_repasse)}</td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
    document.getElementById('drilldown-modal').style.display = 'flex';
}

function closeDrilldown() {
    document.getElementById('drilldown-modal').style.display = 'none';
}

function renderMainChart(keys, timeAgg, filteredData) {
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
                label: metricNames[currentMetric] || 'Valor',
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
            onClick: (e, activeElements) => {
                if (activeElements.length > 0) {
                    const idx = activeElements[0].index;
                    const clickedKey = keys[idx];
                    const drillData = filteredData.filter(d => {
                        const k = dateSource === 'proposta' ? `${d.year}-${d.month}` : `${d.vig_year}-${d.vig_month}`;
                        return k === clickedKey;
                    });
                    openDrilldownModal(`${formatMonthKey(clickedKey)} (${currentTab})`, drillData);
                }
            },
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
        const coreBranches = ['Vida', 'Condomínio', 'Capitalização', 'Fiança', 'Imobiliário', 'Conteúdo'];
        
        filteredData.forEach(d => {
            let b = d.ramo_decoded;
            if (!coreBranches.includes(b)) b = 'Ramos Elementares';
            if (!branchAgg[b]) branchAgg[b] = 0;
            branchAgg[b] += d[currentMetric];
        });
        const sortedBranches = Object.keys(branchAgg).sort((a,b) => branchAgg[b] - branchAgg[a]);
        
        sortedBranches.forEach(b => {
            if (branchAgg[b] > 0) {
                dLabels.push(b);
                dData.push(branchAgg[b]);
                dColors.push(branchColors[b] || branchColors['Ramos Elementares']);
            }
        });
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
        const coreBranches = ['Vida', 'Condomínio', 'Capitalização', 'Fiança', 'Imobiliário', 'Conteúdo'];
        filteredData.forEach(d => {
            let b = d.ramo_decoded;
            if (!coreBranches.includes(b)) b = 'Ramos Elementares';
            if (!branchAgg[b]) branchAgg[b] = 0;
            branchAgg[b] += d[currentMetric];
        });
        const sortedBranches = Object.keys(branchAgg).sort((a,b) => branchAgg[b] - branchAgg[a]);
        
        performanceChartObj = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedBranches,
                datasets: [{
                    data: sortedBranches.map(b => branchAgg[b]),
                    backgroundColor: sortedBranches.map(b => branchColors[b] || branchColors['Ramos Elementares']),
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
        let years;
        if (dateSource === 'proposta') {
            years = [...new Set(filteredData.map(d => d.year))].sort();
        } else {
            years = [...new Set(filteredData.map(d => d.vig_year))].sort();
        }
        const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
        
        const datasets = years.map((y, i) => {
            const dataP = months.map(m => {
                const row = filteredData.find(d => {
                    if (dateSource === 'proposta') {
                        return d.year === y && d.month === m;
                    } else {
                        return d.vig_year === y && d.vig_month === m;
                    }
                });
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

function renderAreaChart(keys, filteredData) {
    const canvas = document.getElementById('areaChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (areaChartObj) areaChartObj.destroy();
    
    const premiumData = [];
    const rebateData = [];
    const labels = keys.map(formatMonthKey);
    
    keys.forEach(k => {
        let p = 0; let r = 0;
        filteredData.forEach(d => {
            const dk = dateSource === 'proposta' ? `${d.year}-${d.month}` : `${d.vig_year}-${d.vig_month}`;
            if (dk === k) {
                p += d.pr_total;
                r += d.valor_repasse;
            }
        });
        premiumData.push(p);
        rebateData.push(r);
    });
    
    areaChartObj = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Premium Total',
                    data: premiumData,
                    borderColor: '#2D7C9D', // Clean Blue
                    backgroundColor: 'rgba(45, 124, 157, 0.4)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3
                },
                {
                    label: 'Comissão / Rebate',
                    data: rebateData,
                    borderColor: '#E67E22', // Tertiary Palette
                    backgroundColor: 'rgba(230, 126, 34, 0.6)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            onClick: (e, activeElements) => {
                if (activeElements.length > 0) {
                    const idx = activeElements[0].index;
                    const clickedKey = keys[idx];
                    const drillData = filteredData.filter(d => {
                        const k = dateSource === 'proposta' ? `${d.year}-${d.month}` : `${d.vig_year}-${d.vig_month}`;
                        return k === clickedKey;
                    });
                    openDrilldownModal(`${formatMonthKey(clickedKey)} (Volume Total)`, drillData);
                }
            },
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { family: "'Inter', sans-serif" } } },
                tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${formatCurrency(c.raw)}` } }
            },
            scales: {
                x: { grid: { display: false, drawBorder: true } },
                y: { stacked: false, grid: { color: '#E2E8F0', drawBorder: false }, border: { display: false }, ticks: { callback: v => formatCurrencyK(v) } }
            }
        }
    });
}

initDashboard();
