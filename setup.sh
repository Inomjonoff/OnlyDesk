#!/bin/bash

# OnlyDesk Server Automated Setup Script for Ubuntu/Debian
# Run this script with sudo: sudo bash setup.sh

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "[-] Iltimos, ushbu skriptni sudo yordamida ishga tushiring: sudo bash setup.sh"
  exit 1
fi

# Get the absolute path of the project directory
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "[+] Loyiha manzili aniqlandi: $PROJECT_DIR"

echo "[+] Tizim paketlarini yangilash..."
apt update && apt upgrade -y

echo "[+] Kerakli paketlarni o'rnatish (Python 3, Git)..."
apt install python3 python3-pip git -y

# 1. Create systemd service for onlydesk-signaling
echo "[+] onlydesk-signaling.service yaratilmoqda..."
cat <<EOF > /etc/systemd/system/onlydesk-signaling.service
[Unit]
Description=OnlyDesk Signaling Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/python3 -m server.main --host 0.0.0.0 --port 50000
Restart=always
RestartSec=5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=onlydesk-signaling

[Install]
WantedBy=multi-user.target
EOF

# 2. Create systemd service for onlydesk-relay
echo "[+] onlydesk-relay.service yaratilmoqda..."
cat <<EOF > /etc/systemd/system/onlydesk-relay.service
[Unit]
Description=OnlyDesk Relay Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/python3 -m server.relay --host 0.0.0.0 --port 50002
Restart=always
RestartSec=5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=onlydesk-relay

[Install]
WantedBy=multi-user.target
EOF

# 3. Reload systemd daemon
echo "[+] Systemd xizmatlarini yangilash..."
systemctl daemon-reload

# 4. Enable services
echo "[+] Xizmatlarni avtomatik ishga tushirish rejimiga o'tkazish..."
systemctl enable onlydesk-signaling
systemctl enable onlydesk-relay

# 5. Start services
echo "[+] Xizmatlarni ishga tushirish..."
systemctl start onlydesk-signaling
systemctl start onlydesk-relay

echo "--------------------------------------------------"
echo "[+] O'rnatish yakunlandi!"
echo "--------------------------------------------------"
echo "[*] Signaling Server holati:"
systemctl is-active onlydesk-signaling
echo "[*] Relay Server holati:"
systemctl is-active onlydesk-relay
echo "--------------------------------------------------"
echo "[i] Loglarni ko'rish uchun: journalctl -u onlydesk-signaling -f"
echo "--------------------------------------------------"
