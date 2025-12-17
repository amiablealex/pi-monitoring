from flask import Flask, render_template, jsonify
import psutil
import subprocess
import requests
import socket
import os
from datetime import datetime

app = Flask(__name__)

# Configuration
PIHOLE_API = None  # Using direct database access instead
SERVICES_TO_MONITOR = [
    'pihole-FTL',
    'tailscaled',
    'cloudflared',
    'nginx',
    'kitsniff',
    'kitchentable',
    'prism',
    'vantix'
]

def get_system_stats():
    """Get CPU, RAM, Temperature, and Disk stats"""
    try:
        # CPU Usage
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # RAM Usage (Critical for 1GB system)
        ram = psutil.virtual_memory()
        ram_used_mb = ram.used / (1024 * 1024)
        ram_free_mb = ram.available / (1024 * 1024)
        ram_total_mb = ram.total / (1024 * 1024)
        ram_percent = ram.percent
        
        # CPU Temperature
        try:
            with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                temp = float(f.read().strip()) / 1000.0
        except:
            temp = None
        
        # Disk Usage
        disk = psutil.disk_usage('/')
        disk_used_gb = disk.used / (1024 ** 3)
        disk_total_gb = disk.total / (1024 ** 3)
        disk_percent = disk.percent
        
        return {
            'cpu_percent': round(cpu_percent, 1),
            'ram_used_mb': round(ram_used_mb, 1),
            'ram_free_mb': round(ram_free_mb, 1),
            'ram_total_mb': round(ram_total_mb, 1),
            'ram_percent': round(ram_percent, 1),
            'cpu_temp': round(temp, 1) if temp else None,
            'disk_used_gb': round(disk_used_gb, 2),
            'disk_total_gb': round(disk_total_gb, 2),
            'disk_percent': round(disk_percent, 1)
        }
    except Exception as e:
        print(f"Error getting system stats: {e}")
        return None

def check_service_status(service_name):
    """Check if a systemd service is active"""
    try:
        result = subprocess.run(
            ['systemctl', 'is-active', service_name],
            capture_output=True,
            text=True,
            timeout=2
        )
        return result.stdout.strip() == 'active'
    except Exception as e:
        print(f"Error checking service {service_name}: {e}")
        return False

def get_service_statuses():
    """Get status of all monitored services"""
    statuses = {}
    for service in SERVICES_TO_MONITOR:
        statuses[service] = check_service_status(service)
    return statuses

def get_pihole_stats():
    """Fetch Pi-hole statistics from FTL database"""
    try:
        import sqlite3
        from datetime import datetime, timedelta
        
        db_path = '/etc/pihole/pihole-FTL.db'
        
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get timestamp for 24 hours ago
        yesterday = int((datetime.now() - timedelta(days=1)).timestamp())
        
        # Total queries today
        cursor.execute(
            "SELECT COUNT(*) FROM queries WHERE timestamp > ?",
            (yesterday,)
        )
        dns_queries_today = cursor.fetchone()[0]
        
        # Blocked queries today (status 1, 4, 5, 6, 7, 8, 9, 10, 11 are blocked)
        cursor.execute(
            "SELECT COUNT(*) FROM queries WHERE timestamp > ? AND status IN (1,4,5,6,7,8,9,10,11)",
            (yesterday,)
        )
        ads_blocked_today = cursor.fetchone()[0]
        
        conn.close()
        
        # Calculate percentage
        if dns_queries_today > 0:
            ads_percentage = (ads_blocked_today / dns_queries_today) * 100
        else:
            ads_percentage = 0
        
        return {
            'ads_blocked_today': ads_blocked_today,
            'dns_queries_today': dns_queries_today,
            'ads_percentage_today': round(ads_percentage, 2),
            'status': 'enabled'
        }
        
    except Exception as e:
        print(f"Error fetching Pi-hole stats from database: {e}")
        return {
            'ads_blocked_today': 'N/A',
            'dns_queries_today': 'N/A',
            'ads_percentage_today': 'N/A',
            'status': 'unavailable'
        }

def get_network_info():
    """Get network information"""
    network_info = {}
    
    # Public IP (masked for privacy)
    try:
        response = requests.get('https://api.ipify.org?format=json', timeout=5)
        if response.status_code == 200:
            public_ip = response.json().get('ip', 'Unknown')
            # Mask IP (show only first two octets)
            ip_parts = public_ip.split('.')
            if len(ip_parts) == 4:
                network_info['public_ip'] = f"{ip_parts[0]}.{ip_parts[1]}.xxx.xxx"
            else:
                network_info['public_ip'] = 'Unknown'
        else:
            network_info['public_ip'] = 'Unknown'
    except Exception as e:
        print(f"Error getting public IP: {e}")
        network_info['public_ip'] = 'Unknown'
    
    # Internet Latency (ping Cloudflare DNS)
    try:
        result = subprocess.run(
            ['ping', '-c', '1', '-W', '2', '1.1.1.1'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            # Extract time from ping output
            for line in result.stdout.split('\n'):
                if 'time=' in line:
                    time_str = line.split('time=')[1].split()[0]
                    network_info['latency_ms'] = float(time_str)
                    break
            if 'latency_ms' not in network_info:
                network_info['latency_ms'] = None
        else:
            network_info['latency_ms'] = None
    except Exception as e:
        print(f"Error getting latency: {e}")
        network_info['latency_ms'] = None
    
    # Tailscale IP - try multiple methods
    try:
        # Method 1: Try tailscale ip command
        result = subprocess.run(
            ['/usr/bin/tailscale', 'ip', '-4'],
            capture_output=True,
            text=True,
            timeout=3
        )
        if result.returncode == 0 and result.stdout.strip():
            network_info['tailscale_ip'] = result.stdout.strip()
        else:
            # Method 2: Try getting from tailscale0 interface
            result = subprocess.run(
                ['ip', 'addr', 'show', 'tailscale0'],
                capture_output=True,
                text=True,
                timeout=2
            )
            if result.returncode == 0:
                import re
                match = re.search(r'inet (\d+\.\d+\.\d+\.\d+)', result.stdout)
                if match:
                    network_info['tailscale_ip'] = match.group(1)
                else:
                    network_info['tailscale_ip'] = 'Not connected'
            else:
                network_info['tailscale_ip'] = 'Not connected'
    except Exception as e:
        print(f"Error getting Tailscale IP: {e}")
        network_info['tailscale_ip'] = 'Unknown'
    
    return network_info

def get_uptime():
    """Get system uptime"""
    try:
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.now() - boot_time
        days = uptime.days
        hours, remainder = divmod(uptime.seconds, 3600)
        minutes, _ = divmod(remainder, 60)
        
        if days > 0:
            return f"{days}d {hours}h {minutes}m"
        elif hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m"
    except:
        return "Unknown"

@app.route('/')
def index():
    """Render the main dashboard page"""
    return render_template('index.html')

@app.route('/api/stats')
def api_stats():
    """API endpoint for all dashboard stats"""
    try:
        stats = {
            'system': get_system_stats(),
            'services': get_service_statuses(),
            'pihole': get_pihole_stats(),
            'network': get_network_info(),
            'uptime': get_uptime(),
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        return jsonify(stats)
    except Exception as e:
        print(f"Error in api_stats: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health():
    """Simple health check endpoint"""
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8011, debug=False)
