// Configuration
const REFRESH_INTERVAL = 10000; // 10 seconds
let updateTimer;

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
        cpuBar.style.backgroundColor = getColorForPercentage(system.cpu_percent);
    }
    
    // CPU Temperature
    const cpuTemp = document.getElementById('cpu-temp');
    if (cpuTemp && system.cpu_temp) {
        cpuTemp.textContent = `${system.cpu_temp}°C`;
        cpuTemp.style.color = system.cpu_temp > 70 ? 'var(--danger)' : 'var(--text-dark)';
    }
    
    // RAM Usage (Critical for 1GB system)
    const ramUsage = document.getElementById('ram-usage');
    const ramBar = document.getElementById('ram-bar');
    const ramDetail = document.getElementById('ram-detail');
    if (ramUsage && ramBar && ramDetail) {
        ramUsage.textContent = `${system.ram_used_mb} MB`;
        ramBar.style.width = `${system.ram_percent}%`;
        ramBar.style.backgroundColor = getColorForPercentage(system.ram_percent);
        
        // Add critical warning if RAM usage is very high
        if (system.ram_percent > 85) {
            ramBar.classList.add('critical');
        } else {
            ramBar.classList.remove('critical');
        }
        
        const freePercent = 100 - system.ram_percent;
        ramDetail.textContent = `${system.ram_used_mb} / ${system.ram_total_mb} MB (${freePercent.toFixed(1)}% free)`;
    }
    
    // Disk Usage
    const diskUsage = document.getElementById('disk-usage');
    const diskBar = document.getElementById('disk-bar');
    const diskDetail = document.getElementById('disk-detail');
    if (diskUsage && diskBar && diskDetail) {
        diskUsage.textContent = `${system.disk_percent}%`;
        diskBar.style.width = `${system.disk_percent}%`;
        diskBar.style.backgroundColor = getColorForPercentage(system.disk_percent);
        diskDetail.textContent = `${system.disk_used_gb} / ${system.disk_total_gb} GB used`;
    }
}

// Update services status
function updateServices(services) {
    if (!services) return;
    
    const servicesGrid = document.getElementById('services-grid');
    if (!servicesGrid) return;
    
    servicesGrid.innerHTML = '';
    
    for (const [serviceName, isActive] of Object.entries(services)) {
        const serviceItem = document.createElement('div');
        serviceItem.className = 'service-item';
        
        const serviceLabelDiv = document.createElement('div');
        serviceLabelDiv.className = 'service-name';
        serviceLabelDiv.textContent = serviceName;
        
        const statusIndicator = document.createElement('div');
        statusIndicator.className = `service-status ${isActive ? 'active' : 'inactive'}`;
        statusIndicator.title = isActive ? 'Running' : 'Stopped';
        
        serviceItem.appendChild(serviceLabelDiv);
        serviceItem.appendChild(statusIndicator);
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

// Get color based on percentage (green to red gradient)
function getColorForPercentage(percent) {
    if (percent < 50) return 'var(--success)';
    if (percent < 75) return 'var(--warning)';
    return 'var(--danger)';
}

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
