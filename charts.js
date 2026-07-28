// ============================================================
// CHARTS.JS — Chart.js bilan grafiklar
// ============================================================

const Charts = {
  instances: {},

  destroy(id) {
    if (this.instances[id]) {
      this.instances[id].destroy();
      delete this.instances[id];
    }
  },

  // Donut chart — umumiy funksiya
  renderDonut(canvasId, labels, data, colors) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    const inst = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels || ['Keldi', 'Kelmadi'],
        datasets: [{
          data: data,
          backgroundColor: colors || ['#00D4AA', '#FF4757'],
          borderColor: 'transparent',
          borderWidth: 0,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '80%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'var(--bg-card)',
            titleColor: 'var(--text-primary)',
            bodyColor: 'var(--text-secondary)',
            borderColor: 'var(--border)',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw} ta`,
            },
          },
        },
        animation: { animateScale: true, animateRotate: true, duration: 800 },
      },
    });
    this.instances[canvasId] = inst;
    return inst;
  },

  // Donut eski metod nomi ham ishlashi uchun
  donut(canvasId, came, notCame, labels, colors) {
    return this.renderDonut(canvasId, labels, [came, notCame], colors);
  },

  // Oylik davomat bar chart
  renderMonthly(canvasId, monthData, personName) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    const labels = monthData.days.filter(d => !d.isWeekend).map(d => `${d.day}-${d.dayName}`);
    const data = monthData.days.filter(d => !d.isWeekend).map(d => d.came ? 1 : 0);

    const inst = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Keldi',
          data,
          backgroundColor: data.map(v => v ? 'rgba(0,212,170,0.6)' : 'rgba(255,71,87,0.5)'),
          borderColor: data.map(v => v ? '#00D4AA' : '#FF4757'),
          borderWidth: 2,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: (personName || '') + ' — Oylik davomat',
            color: 'var(--text-primary)',
            font: { size: 14, family: 'Inter', weight: '600' },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ctx.raw ? '✅ Keldi' : '❌ Kelmadi',
            },
            backgroundColor: 'var(--bg-card)',
            titleColor: 'var(--text-primary)',
            bodyColor: 'var(--text-secondary)',
            borderColor: 'var(--border)',
            borderWidth: 1
          },
        },
        scales: {
          x: { grid: { color: 'var(--border)' }, ticks: { color: 'var(--text-secondary)', font: { size: 10 } } },
          y: {
            grid: { color: 'var(--border)' },
            ticks: { color: '#8B8DA0', stepSize: 1, callback: v => v ? '✅' : '❌' },
            min: 0, max: 1,
          },
        },
        animation: { duration: 600 },
      },
    });
    this.instances[canvasId] = inst;
    return inst;
  },
};

window.updateChartColors = function() {
  const style = getComputedStyle(document.body);
  const textColor = style.getPropertyValue('--text-primary').trim() || '#111827';
  const textMuted = style.getPropertyValue('--text-secondary').trim() || '#6B7280';
  const gridColor = style.getPropertyValue('--border').trim() || '#E5E7EB';
  const bgCard = style.getPropertyValue('--bg-card').trim() || '#ffffff';

  Chart.defaults.color = textColor;
  
  for(let id in Chart.instances) {
     const chart = Chart.instances[id];
     if(chart.options.plugins && chart.options.plugins.tooltip) {
       chart.options.plugins.tooltip.backgroundColor = bgCard;
       chart.options.plugins.tooltip.titleColor = textColor;
       chart.options.plugins.tooltip.bodyColor = textMuted;
       chart.options.plugins.tooltip.borderColor = gridColor;
     }
     if(chart.options.scales) {
       if(chart.options.scales.x) {
         if(chart.options.scales.x.grid) chart.options.scales.x.grid.color = gridColor;
         if(chart.options.scales.x.ticks) chart.options.scales.x.ticks.color = textMuted;
       }
       if(chart.options.scales.y) {
         if(chart.options.scales.y.grid) chart.options.scales.y.grid.color = gridColor;
         if(chart.options.scales.y.ticks) chart.options.scales.y.ticks.color = textMuted;
       }
     }
     if(chart.options.plugins && chart.options.plugins.legend && chart.options.plugins.legend.labels) {
       chart.options.plugins.legend.labels.color = textMuted;
     }
     chart.update();
  }
};
