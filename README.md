# Raspberry Pi Monitoring Dashboard

A lightweight, beautiful monitoring dashboard for Raspberry Pi home servers.

## Features

- **System Health**: CPU usage, RAM usage, CPU temperature, disk space, uptime
- **Service Status**: Real-time monitoring of systemd services
- **Pi-hole Stats**: DNS queries and ads blocked
- **Network Info**: Public IP, internet latency, Tailscale IP

## Tech Stack

- **Backend**: Flask, Python 3
- **Frontend**: Vanilla JavaScript, CSS (no frameworks)
- **Deployment**: Gunicorn, systemd
- **Design**: Pastel color palette, responsive grid layout

## Installation

See [INSTALL.md](INSTALL.md) for full deployment instructions.

## Screenshots

[Add screenshots here]

## Requirements

- Raspberry Pi (tested on Pi 4 with 1GB RAM)
- Python 3.7+
- Pi-hole (optional)
- Tailscale (optional)

## Access

- Local: `http://localhost:8011`
- Network: `http://<pi-ip>:8011`
- Tailscale: `http://<tailscale-ip>:8011`

## License

MIT
