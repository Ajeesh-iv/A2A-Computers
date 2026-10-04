/**
 * AV Computers Dashboard - Custom SVG Charting Engine
 * Zero dependencies. Renders fully responsive SVG graphics with animated transitions and tooltips.
 */

const Charts = {
  // 1. AREA CHART (Sales Trend)
  createAreaChart(containerId, dataPoints, labels) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 280;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxVal = Math.max(...dataPoints, 1000) * 1.15;
    const minVal = 0;

    // Helper coordinates
    const getX = (index) => padding.left + (index / (dataPoints.length - 1)) * chartWidth;
    const getY = (val) => padding.top + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;

    // Create Tooltip
    let tooltip = container.querySelector(".chart-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "chart-tooltip";
      container.appendChild(tooltip);
    }

    // SVG elements setup
    let svg = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow: visible;">
      <!-- Gradients -->
      <defs>
        <linearGradient id="areaGrad-${containerId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent-cyan)" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="var(--accent-cyan)" stop-opacity="0.0"/>
        </linearGradient>
        <linearGradient id="strokeGrad-${containerId}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="var(--accent-cyan)"/>
          <stop offset="100%" stop-color="var(--accent-purple)"/>
        </linearGradient>
      </defs>

      <!-- Y Grid Lines & Labels -->
      ${[0, 0.25, 0.5, 0.75, 1].map(ratio => {
        const val = minVal + ratio * (maxVal - minVal);
        const y = getY(val);
        return `
          <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--glass-border)" stroke-width="1" stroke-dasharray="4"/>
          <text x="${padding.left - 10}" y="${y + 4}" fill="var(--text-secondary)" font-size="10" font-weight="600" text-anchor="end">
            ₹${Math.round(val).toLocaleString('en-IN')}
          </text>
        `;
      }).join("")}

      <!-- X Axis Labels -->
      ${labels.map((label, idx) => {
        const x = getX(idx);
        return `
          <text x="${x}" y="${height - padding.bottom + 20}" fill="var(--text-secondary)" font-size="10" font-weight="600" text-anchor="middle">
            ${label}
          </text>
        `;
      }).join("")}
    `;

    // Path definitions
    let areaPath = `M ${getX(0)} ${padding.top + chartHeight} `;
    let linePath = `M ${getX(0)} ${getY(dataPoints[0])} `;

    for (let i = 0; i < dataPoints.length; i++) {
      const x = getX(i);
      const y = getY(dataPoints[i]);
      areaPath += `L ${x} ${y} `;
      if (i > 0) linePath += `L ${x} ${y} `;
    }

    areaPath += `L ${getX(dataPoints.length - 1)} ${padding.top + chartHeight} Z`;

    // Add path tags
    svg += `
      <!-- Area Path -->
      <path d="${areaPath}" fill="url(#areaGrad-${containerId})">
        <animate attributeName="opacity" from="0" to="1" dur="0.8s" begin="0.1s" fill="freeze"/>
      </path>

      <!-- Line Path -->
      <path d="${linePath}" fill="none" stroke="url(#strokeGrad-${containerId})" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <animate attributeName="stroke-dashoffset" from="1000" to="0" dur="1s" fill="freeze"/>
      </path>

      <!-- Interactive Circles -->
      ${dataPoints.map((val, idx) => {
        const x = getX(idx);
        const y = getY(val);
        return `
          <circle cx="${x}" cy="${y}" r="6" fill="var(--bg-primary)" stroke="var(--accent-cyan)" stroke-width="3" 
                  style="cursor: pointer; transition: r 0.2s;" 
                  data-val="${val}" data-lbl="${labels[idx]}"
                  onmouseover="Charts.showTooltip(this, '${labels[idx]}', '₹${Math.round(val).toLocaleString('en-IN')}', '${containerId}')" 
                  onmouseout="Charts.hideTooltip('${containerId}')"/>
        `;
      }).join("")}
    </svg>`;

    container.innerHTML += svg;
  },

  // 2. BAR CHART (Revenue or Comparison)
  createBarChart(containerId, values, labels) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 280;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxVal = Math.max(...values, 1000) * 1.1;
    const barWidth = (chartWidth / values.length) * 0.6;
    const gap = (chartWidth / values.length) * 0.4;

    const getY = (val) => padding.top + chartHeight - (val / maxVal) * chartHeight;

    // Create Tooltip
    let tooltip = container.querySelector(".chart-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "chart-tooltip";
      container.appendChild(tooltip);
    }

    let svg = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
      <!-- Defs for Gradient -->
      <defs>
        <linearGradient id="barGrad-${containerId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent-purple)"/>
          <stop offset="100%" stop-color="var(--accent-cyan)"/>
        </linearGradient>
      </defs>

      <!-- Y Grid Lines & Labels -->
      ${[0, 0.25, 0.5, 0.75, 1].map(ratio => {
        const val = ratio * maxVal;
        const y = getY(val);
        return `
          <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--glass-border)" stroke-width="1" stroke-dasharray="4"/>
          <text x="${padding.left - 10}" y="${y + 4}" fill="var(--text-secondary)" font-size="10" font-weight="600" text-anchor="end">
            ${Math.round(val)}
          </text>
        `;
      }).join("")}

      <!-- Bars -->
      ${values.map((val, idx) => {
        const x = padding.left + idx * (barWidth + gap) + gap/2;
        const y = getY(val);
        const barHeight = padding.top + chartHeight - y;
        return `
          <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="url(#barGrad-${containerId})" rx="4"
                style="cursor: pointer; transition: opacity 0.2s;"
                onmouseover="Charts.showTooltip(this, '${labels[idx]}', '${val}', '${containerId}')" 
                onmouseout="Charts.hideTooltip('${containerId}')">
            <animate attributeName="height" from="0" to="${barHeight}" dur="0.8s" fill="freeze"/>
            <animate attributeName="y" from="${padding.top + chartHeight}" to="${y}" dur="0.8s" fill="freeze"/>
          </rect>
          <text x="${x + barWidth/2}" y="${height - padding.bottom + 20}" fill="var(--text-secondary)" font-size="10" font-weight="600" text-anchor="middle">
            ${labels[idx]}
          </text>
        `;
      }).join("")}
    </svg>`;

    container.innerHTML += svg;
  },

  // 3. DONUT CHART (Selling Ratios)
  createDonutChart(containerId, values, labels) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 280;
    const radius = Math.min(width, height) * 0.35;
    const cx = width / 2;
    const cy = height / 2 - 10;
    const strokeWidth = 24;

    const total = values.reduce((sum, v) => sum + v, 0);

    // Create Tooltip
    let tooltip = container.querySelector(".chart-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "chart-tooltip";
      container.appendChild(tooltip);
    }

    const colors = [
      "var(--accent-cyan)",
      "var(--accent-purple)",
      "var(--accent-green)",
      "var(--accent-orange)",
      "var(--accent-red)"
    ];

    let currentAngle = -Math.PI / 2; // Start from top

    const paths = values.map((val, idx) => {
      const percentage = val / total;
      const angleSweep = percentage * Math.PI * 2;

      // Start Coordinates
      const x1 = cx + radius * Math.cos(currentAngle);
      const y1 = cy + radius * Math.sin(currentAngle);

      currentAngle += angleSweep;

      // End Coordinates
      const x2 = cx + radius * Math.cos(currentAngle);
      const y2 = cy + radius * Math.sin(currentAngle);

      const largeArc = percentage > 0.5 ? 1 : 0;

      const pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
      const color = colors[idx % colors.length];

      return `
        <path d="${pathData}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"
              style="cursor: pointer; transition: stroke-width 0.2s;"
              onmouseover="Charts.showDonutTooltip(this, '${labels[idx]}', '${val} units (${Math.round(percentage * 100)}%)', '${containerId}')" 
              onmouseout="Charts.hideDonutTooltip(this, '${containerId}')"/>
      `;
    }).join("");

    const svg = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}">
      <!-- Inner text -->
      <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="16" font-weight="700" fill="var(--text-primary)">
        Total Sales
      </text>
      <text x="${cx}" y="${cy + 24}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--text-muted)">
        ${total} Units
      </text>

      <!-- Draw Donut Slices -->
      ${paths}

      <!-- Legend -->
      <g transform="translate(10, ${height - 35})">
        ${labels.map((lbl, idx) => {
          const x = (width - 20) / labels.length * idx;
          const color = colors[idx % colors.length];
          return `
            <g transform="translate(${x}, 0)">
              <rect width="10" height="10" rx="2" fill="${color}"/>
              <text x="15" y="9" font-size="10" font-weight="600" fill="var(--text-secondary)">${lbl}</text>
            </g>
          `;
        }).join("")}
      </g>
    </svg>`;

    container.innerHTML += svg;
  },

  // 4. ACTIVITY HEATMAP (Revenue Heatmap)
  createHeatmap(containerId, daysActivity) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    // Generate elements for a 7x7 grid representing 49 slots of activity
    let cells = "";
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Tooltip helper
    let tooltip = container.querySelector(".chart-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "chart-tooltip";
      container.appendChild(tooltip);
    }

    daysActivity.forEach((lvl, idx) => {
      // lvl is between 0 and 4
      const dayName = days[idx % 7];
      const weekNum = Math.floor(idx / 7) + 1;
      const count = lvl * 2 + Math.round(Math.random() * 2); // Simulated sales count
      cells += `
        <div class="heatmap-cell level-${lvl}" 
             data-tooltip="${dayName} (Week ${weekNum}): ${count} Completed Operations"
             onmouseover="Charts.showHeatmapTooltip(this, '${containerId}')"
             onmouseout="Charts.hideHeatmapTooltip('${containerId}')">
        </div>
      `;
    });

    const labelHeaders = days.map(d => `<div class="calendar-day-header">${d.substring(0, 1)}</div>`).join("");

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; width: 100%; height: 100%;">
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 4px;">
          ${labelHeaders}
        </div>
        <div class="heatmap-grid" style="grid-grow: 1;">
          ${cells}
        </div>
      </div>
    `;
  },

  // --- Tooltip Event Handlers ---
  showTooltip(elem, label, value, containerId) {
    const container = document.getElementById(containerId);
    const tooltip = container.querySelector(".chart-tooltip");
    if (!tooltip) return;

    elem.setAttribute("r", "8");
    tooltip.innerHTML = `<strong>${label}</strong><br/>${value}`;
    tooltip.style.opacity = "1";

    const cx = parseFloat(elem.getAttribute("cx") || elem.getAttribute("x"));
    const cy = parseFloat(elem.getAttribute("cy") || elem.getAttribute("y"));

    tooltip.style.left = `${cx + 10}px`;
    tooltip.style.top = `${cy - 20}px`;
  },

  hideTooltip(containerId) {
    const container = document.getElementById(containerId);
    const tooltip = container.querySelector(".chart-tooltip");
    if (!tooltip) return;

    tooltip.style.opacity = "0";
    const circles = container.querySelectorAll("circle");
    circles.forEach(c => c.setAttribute("r", "6"));
  },

  showDonutTooltip(elem, label, value, containerId) {
    const container = document.getElementById(containerId);
    const tooltip = container.querySelector(".chart-tooltip");
    if (!tooltip) return;

    elem.setAttribute("stroke-width", "30");
    tooltip.innerHTML = `<strong>${label}</strong><br/>${value}`;
    tooltip.style.opacity = "1";
    tooltip.style.left = `calc(50% - 60px)`;
    tooltip.style.top = `40%`;
  },

  hideDonutTooltip(elem, containerId) {
    const container = document.getElementById(containerId);
    const tooltip = container.querySelector(".chart-tooltip");
    if (!tooltip) return;

    elem.setAttribute("stroke-width", "24");
    tooltip.style.opacity = "0";
  },

  showHeatmapTooltip(elem, containerId) {
    const container = document.getElementById(containerId);
    const tooltip = container.querySelector(".chart-tooltip");
    if (!tooltip) return;

    const rect = elem.getBoundingClientRect();
    const parentRect = container.getBoundingClientRect();

    tooltip.innerHTML = elem.getAttribute("data-tooltip");
    tooltip.style.opacity = "1";
    tooltip.style.left = `${rect.left - parentRect.left}px`;
    tooltip.style.top = `${rect.top - parentRect.top - 35}px`;
  },

  hideHeatmapTooltip(containerId) {
    const container = document.getElementById(containerId);
    const tooltip = container.querySelector(".chart-tooltip");
    if (tooltip) tooltip.style.opacity = "0";
  }
};

window.Charts = Charts; // Expose globally
