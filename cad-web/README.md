# Drafter — CAD Web 2D

Editor CAD 2D no navegador, inspirado em fluxos do AutoCAD: desenho preciso com grade, snaps, camadas, orto, zoom/pan e exportação.

## Como rodar

```bash
cd cad-web
npm install
npm run dev
```

Abra o endereço local indicado pelo Vite (geralmente `http://localhost:5173`).

```bash
npm run build    # build de produção
npm run test     # testes unitários
npm run preview  # servir o build
```

## Instalar no Linux com Apache

O Drafter é um app estático: gera HTML/JS/CSS/WASM em `dist/` e o Apache só serve esses arquivos.

### Opção rápida (script)

No servidor (Debian/Ubuntu ou RHEL/CentOS), com Node.js 20+ e Apache:

```bash
cd cad-web
chmod +x deploy/install-apache.sh
sudo ./deploy/install-apache.sh /var/www/drafter cad.seudominio.com
```

### Passo a passo manual

```bash
# 1) Dependências do sistema (Ubuntu/Debian)
sudo apt update
sudo apt install -y apache2 rsync

# Node 20+ (exemplo com NodeSource ou nvm)
# https://nodejs.org/ — ou: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
# sudo apt install -y nodejs

# 2) Build
cd cad-web
npm install
npm run build

# 3) Publicar
sudo mkdir -p /var/www/drafter
sudo rsync -a --delete dist/ /var/www/drafter/
sudo chown -R www-data:www-data /var/www/drafter
```

Ative o site (exemplo em `deploy/apache-drafter.conf`):

```bash
sudo cp deploy/apache-drafter.conf /etc/apache2/sites-available/drafter.conf
# Edite ServerName e DocumentRoot
sudo a2enmod headers rewrite
sudo a2ensite drafter
sudo systemctl reload apache2
```

Importante: o MIME `application/wasm` precisa estar ativo (o `.htaccess` em `dist/` e o vhost de exemplo já tratam isso). Sem isso, a importação DWG falha.

### HTTPS

```bash
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d cad.seudominio.com
```

## Ferramentas

| Atalho | Ferramenta |
|--------|------------|
| `V` | Selecionar / mover |
| `L` | Linha |
| `P` | Polilinha (`Enter` finaliza, `C` fecha) |
| `R` | Retângulo |
| `C` | Círculo |
| `A` | Arco |
| `D` | Cota linear |
| `B` | Inserir bloco |
| `E` | Apagar |
| `M` | Medir |
| `H` | Pan |
| `F8` | Orto |
| `F11` | Maximizar / restaurar área de desenho |
| `Ctrl+Z` / `Ctrl+Y` | Desfazer / refazer |
| Roda do mouse | Zoom |
| Botão do meio / Espaço | Pan |

## Recursos

- Grade e eixos com navegação fluida
- Snaps: ponta, meio, centro, interseção, grade e próximo
- Cotas lineares com texto e setas
- Blocos: criar da seleção e reinserir
- Camadas (visível / travada / cor)
- Histórico undo/redo
- Persistência automática no `localStorage`
- Abrir / salvar JSON do desenho
- Importar / exportar DXF (LINE, CIRCLE, ARC, LWPOLYLINE)
- **Importar DWG nativo** no navegador via LibreDWG (WebAssembly)
- Exportar PNG

## DWG

| Operação | Status |
|----------|--------|
| Importar `.dwg` | Sim (LibreDWG WASM) — LINE, CIRCLE, ARC, LWPOLYLINE, DIMENSION, INSERT/blocos |
| Exportar `.dwg` | Não no build padrão — use **Exportar DXF** |

O motor DWG (`@mlightcad/libredwg-web`) é **GPL-3.0**. Ao distribuir o app com essa dependência, a licença GPL se aplica ao conjunto.

## Escopo

CAD web 2D com desenho técnico, cotas, blocos, DXF e importação DWG.  
**3D** e **exportação DWG** nativa ficam para etapas futuras.
