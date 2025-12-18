// Configuration
const REFRESH_INTERVAL = 10000; // 10 seconds
let updateTimer;

// Thresholds
const THRESHOLDS = {
    cpu_temp: [60, 75],  // Green <60, Amber 60-75, Red >75
    ram: [70, 85],       // Green <70, Amber 70-85, Red >85
    disk: [70, 85]       // Green <70, Amber 70-85, Red >85
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initialized');
    fetchStats();
    startAutoRefresh();
});

// Start auto-refresh
function startAutoRefresh() {
    updateTimer = setInterval(fetchStats, REFRESH_INTERVAL);
}

// Fetch all stats from API
async function fetchStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        updateDashboard(data);
    } catch (error) {
        console.error('Error fetching stats:', error);
        showError();
    }
}

// Update all dashboard elements
function updateDashboard(data) {
    updateSystemHealth(data.system);
    updateServices(data.services);
    updatePihole(data.pihole);
    updateNetwork(data.network);
    updateTimestamp(data.timestamp);
    updateUptime(data.uptime);
    updateCpuSparkline(data.cpu_trend);
    updateDiskBreakdown(data.disk_breakdown);
}

// Update system health metrics
function updateSystemHealth(system) {
    if (!system) return;
    
    // CPU Usage
    const cpuUsage = document.getElementById('cpu-usage');
    const cpuBar = document.getElementById('cpu-bar');
    if (cpuUsage && cpuBar) {
        cpuUsage.textContent = `${system.cpu_percent}%`;
        cpuBar.style.width = `${system.cpu_percent}%`;
        cpuBar.style.backgroundColor = getColorForPercentage(system.cpu_percent, [50, 75]);
    }
    
    // CPU Temperature with progress bar and thresholds
    const cpuTemp = document.getElementById('cpu-temp');
    const cpuTempBar = document.getElementById('cpu-temp-bar');
    if (cpuTemp && cpuTempBar && system.cpu_temp) {
        cpuTemp.textContent = `${system.cpu_temp}°C`;
        
        // Convert temperature to percentage (0-100°C scale)
        const tempPercent = Math.min(system.cpu_temp, 100);
        cpuTempBar.style.width = `${tempPercent}%`;
        cpuTempBar.style.backgroundColor = getColorForValue(
            system.cpu_temp, 
            THRESHOLDS.cpu_temp
        );
    }
    
    // RAM Usage with thresholds
    const ramUsage = document.getElementById('ram-usage');
    const ramBar = document.getElementById('ram-bar');
    const ramDetail = document.getElementById('ram-detail');
    if (ramUsage && ramBar && ramDetail) {
        ramUsage.textContent = `${system.ram_used_mb} MB`;
        ramBar.style.width = `${system.ram_percent}%`;
        ramBar.style.backgroundColor = getColorForValue(
            system.ram_percent,
            THRESHOLDS.ram
        );
        
        // Add critical warning if RAM usage is very high
        if (system.ram_percent > 85) {
            ramBar.classList.add('critical');
        } else {
            ramBar.classList.remove('critical');
        }
        
        const freePercent = 100 - system.ram_percent;
        ramDetail.textContent = `${system.ram_used_mb} / ${system.ram_total_mb} MB (${freePercent.toFixed(1)}% free)`;
    }
    
    // Disk Usage with thresholds
    const diskUsage = document.getElementById('disk-usage');
    const diskBar = document.getElementById('disk-bar');
    const diskDetail = document.getElementById('disk-detail');
    if (diskUsage && diskBar && diskDetail) {
        diskUsage.textContent = `${system.disk_percent}%`;
        diskBar.style.width = `${system.disk_percent}%`;
        diskBar.style.backgroundColor = getColorForValue(
            system.disk_percent,
            THRESHOLDS.disk
        );
        diskDetail.textContent = `${system.disk_used_gb} / ${system.disk_total_gb} GB used`;
    }
}

// Update services status with uptime
function updateServices(services) {
    if (!services) return;
    
    const servicesGrid = document.getElementById('services-grid');
    if (!servicesGrid) return;
    
    servicesGrid.innerHTML = '';
    
    for (const [serviceName, serviceInfo] of Object.entries(services)) {
        const serviceItem = document.createElement('div');
        serviceItem.className = 'service-item';
        
        const serviceHeader = document.createElement('div');
        serviceHeader.className = 'service-header';
        
        const serviceLabelDiv = document.createElement('div');
        serviceLabelDiv.className = 'service-name';
        serviceLabelDiv.textContent = serviceName;
        
        const statusIndicator = document.createElement('div');
        statusIndicator.className = `service-status ${serviceInfo.active ? 'active' : 'inactive'}`;
        statusIndicator.title = serviceInfo.active ? 'Running' : 'Stopped';
        
        serviceHeader.appendChild(serviceLabelDiv);
        serviceHeader.appendChild(statusIndicator);
        serviceItem.appendChild(serviceHeader);
        
        // Add uptime if available
        if (serviceInfo.uptime) {
            const uptimeDiv = document.createElement('div');
            uptimeDiv.className = 'service-uptime';
            uptimeDiv.textContent = `Up: ${serviceInfo.uptime}`;
            serviceItem.appendChild(uptimeDiv);
        }
        
        servicesGrid.appendChild(serviceItem);
    }
}

// Update Pi-hole stats
function updatePihole(pihole) {
    if (!pihole) return;
    
    const adsBlocked = document.getElementById('ads-blocked');
    const dnsQueries = document.getElementById('dns-queries');
    const blockPercentage = document.getElementById('block-percentage');
    const piholeStatus = document.getElementById('pihole-status');
    
    if (adsBlocked) {
        adsBlocked.textContent = formatNumber(pihole.ads_blocked_today);
    }
    
    if (dnsQueries) {
        dnsQueries.textContent = formatNumber(pihole.dns_queries_today);
    }
    
    if (blockPercentage) {
        blockPercentage.textContent = `${pihole.ads_percentage_today}%`;
    }
    
    if (piholeStatus) {
        piholeStatus.textContent = pihole.status;
        piholeStatus.className = `status-badge ${pihole.status}`;
    }
}

// Update network info
function updateNetwork(network) {
    if (!network) return;
    
    const publicIp = document.getElementById('public-ip');
    const latency = document.getElementById('latency');
    const tailscaleIp = document.getElementById('tailscale-ip');
    
    if (publicIp) {
        publicIp.textContent = network.public_ip;
    }
    
    if (latency) {
        if (network.latency_ms !== null) {
            latency.textContent = `${network.latency_ms.toFixed(1)} ms`;
            latency.style.color = network.latency_ms > 100 ? 'var(--warning)' : 'var(--text-dark)';
        } else {
            latency.textContent = 'N/A';
        }
    }
    
    if (tailscaleIp) {
        tailscaleIp.textContent = network.tailscale_ip;
    }
}

// Update CPU sparkline
function updateCpuSparkline(cpuTrend) {
    const sparklineContainer = document.getElementById('cpu-sparkline-container');
    if (!sparklineContainer || !cpuTrend || cpuTrend.length === 0) return;
    
    const svg = document.getElementById('cpu-sparkline');
    if (!svg) return;
    
    // Extract values
    const values = cpuTrend.map(item => item.value);
    
    // Calculate SVG dimensions
    const width = svg.clientWidth || 300;
    const height = 40;
    const padding = 2;
    
    // Scale values to fit SVG
    const maxValue = Math.max(...values, 100); // At least 0-100 scale
    const minValue = 0;
    
    // Create points for polyline
    const points = values.map((value, index) => {
        const x = padding + (index / (values.length - 1 || 1)) * (width - 2 * padding);
        const y = height - padding - ((value - minValue) / (maxValue - minValue)) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');
    
    // Update polyline
    let polyline = svg.querySelector('polyline');
    if (!polyline) {
        polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        svg.appendChild(polyline);
    }
    
    polyline.setAttribute('points', points);
    
    // Show sparkline container
    sparklineContainer.style.display = 'block';
}

// Update disk breakdown
function updateDiskBreakdown(diskBreakdown) {
    const breakdownContainer = document.getElementById('disk-breakdown-list');
    if (!breakdownContainer) return;
    
    if (!diskBreakdown || diskBreakdown.length === 0) {
        breakdownContainer.innerHTML = '<div class="disk-breakdown-loading">Calculating...</div>';
        return;
    }
    
    breakdownContainer.innerHTML = '';
    
    diskBreakdown.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'disk-breakdown-item';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'disk-breakdown-name';
        nameDiv.textContent = item.name;
        
        const sizeDiv = document.createElement('div');
        sizeDiv.className = 'disk-breakdown-size';
        sizeDiv.textContent = item.size_mb >= 1024 
            ? `${item.size_gb} GB` 
            : `${item.size_mb} MB`;
        
        itemDiv.appendChild(nameDiv);
        itemDiv.appendChild(sizeDiv);
        breakdownContainer.appendChild(itemDiv);
    });
}

// Update timestamp
function updateTimestamp(timestamp) {
    const timestampElement = document.getElementById('timestamp');
    if (timestampElement) {
        timestampElement.textContent = timestamp;
    }
}

// Update uptime
function updateUptime(uptime) {
    const uptimeElement = document.getElementById('uptime');
    if (uptimeElement) {
        uptimeElement.textContent = uptime;
    }
}

// Get color based on value and thresholds [threshold1, threshold2]
function getColorForValue(value, thresholds) {
    if (value < thresholds[0]) {
        return 'var(--success)';
    } else if (value < thresholds[1]) {
        return 'var(--warning)';
    } else {
        return 'var(--danger)';
    }
}

// Legacy function for backward compatibility
function getColorForPercentage(percent, thresholds = [50, 75]) {
    return getColorForValue(percent, thresholds);
}

// Add threshold indicators to progress bars
function addThresholdIndicators(barElement, thresholds) {
    if (!barElement) return;
    
    // Clear existing threshold indicators
    const existingIndicators = barElement.querySelectorAll('.threshold-indicator');
    existingIndicators.forEach(indicator => indicator.remove());
    
    // Add new threshold indicators
    thresholds.forEach(threshold => {
        const indicator = document.createElement('div');
        indicator.className = 'threshold-indicator';
        indicator.style.left = `${threshold}%`;
        barElement.appendChild(indicator);
    });
}

// Initialize threshold indicators after first data load
function initializeThresholds() {
    addThresholdIndicators(
        document.getElementById('cpu-temp-bar')?.parentElement,
        THRESHOLDS.cpu_temp
    );
    addThresholdIndicators(
        document.getElementById('ram-bar')?.parentElement,
        THRESHOLDS.ram
    );
    addThresholdIndicators(
        document.getElementById('disk-bar')?.parentElement,
        THRESHOLDS.disk
    );
}

// Call initialization after first fetch
setTimeout(initializeThresholds, 1000);

// Format large numbers with commas
function formatNumber(num) {
    if (num === 'N/A' || num === undefined || num === null) return 'N/A';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Show error state
function showError() {
    const timestamp = document.getElementById('timestamp');
    if (timestamp) {
        timestamp.textContent = 'Error fetching data';
        timestamp.style.color = 'var(--danger)';
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (updateTimer) {
        clearInterval(updateTimer);
    }
});
