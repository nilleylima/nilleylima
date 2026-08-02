#!/usr/bin/env bash
# Instala o build do Drafter em um Linux com Apache.
# Uso (na pasta cad-web):
#   chmod +x deploy/install-apache.sh
#   sudo ./deploy/install-apache.sh
#   sudo ./deploy/install-apache.sh /var/www/drafter cad.exemplo.local

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-/var/www/drafter}"
SERVER_NAME="${2:-}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Execute com sudo: sudo $0 [destino] [ServerName]"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não encontrado. Instale Node 20+ (ex.: nodesource ou nvm) e rode de novo."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm não encontrado."
  exit 1
fi

echo "==> Instalando dependências e gerando build..."
cd "$ROOT_DIR"
npm install
npm run build

echo "==> Publicando em $DEST"
mkdir -p "$DEST"
rsync -a --delete "$ROOT_DIR/dist/" "$DEST/"

# Usuário do Apache
WEB_USER="www-data"
if id apache >/dev/null 2>&1; then
  WEB_USER="apache"
elif id www-data >/dev/null 2>&1; then
  WEB_USER="www-data"
fi
chown -R "$WEB_USER:$WEB_USER" "$DEST"
find "$DEST" -type d -exec chmod 755 {} \;
find "$DEST" -type f -exec chmod 644 {} \;

# MIME wasm global (idempotente)
MIME_FILE=""
if [[ -d /etc/apache2/conf-available ]]; then
  MIME_FILE="/etc/apache2/conf-available/drafter-wasm.conf"
  cat > "$MIME_FILE" <<'EOF'
AddType application/wasm .wasm
EOF
  a2enconf drafter-wasm >/dev/null 2>&1 || true
elif [[ -d /etc/httpd/conf.d ]]; then
  MIME_FILE="/etc/httpd/conf.d/drafter-wasm.conf"
  cat > "$MIME_FILE" <<'EOF'
AddType application/wasm .wasm
EOF
fi

if [[ -n "$SERVER_NAME" ]]; then
  if [[ -d /etc/apache2/sites-available ]]; then
    SITE="/etc/apache2/sites-available/drafter.conf"
    sed "s|cad.exemplo.local|$SERVER_NAME|g; s|/var/www/drafter|$DEST|g" \
      "$ROOT_DIR/deploy/apache-drafter.conf" > "$SITE"
    # Remove comentários de APACHE_LOG_DIR problemáticos no Debian: ok
    a2enmod headers rewrite >/dev/null 2>&1 || true
    a2ensite drafter >/dev/null 2>&1 || true
  elif [[ -d /etc/httpd/conf.d ]]; then
    SITE="/etc/httpd/conf.d/drafter.conf"
    sed "s|cad.exemplo.local|$SERVER_NAME|g; s|/var/www/drafter|$DEST|g; s|\${APACHE_LOG_DIR}|/var/log/httpd|g" \
      "$ROOT_DIR/deploy/apache-drafter.conf" > "$SITE"
  fi
  echo "==> Site configurado para ServerName=$SERVER_NAME"
fi

if command -v apache2ctl >/dev/null 2>&1; then
  apache2ctl configtest
  systemctl reload apache2
elif command -v apachectl >/dev/null 2>&1; then
  apachectl configtest
  systemctl reload httpd
else
  echo "Apache não encontrado via systemctl; arquivos publicados em $DEST"
fi

echo
echo "Pronto."
echo "  DocumentRoot: $DEST"
echo "  Abra no navegador: http://${SERVER_NAME:-SEU_IP_OU_DOMINIO}/"
echo "  Teste DWG: o arquivo /wasm/libredwg-web.wasm precisa retornar 200."
