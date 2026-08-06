# Inspex

Detecção de defeitos pela câmera do celular, com presets, referência (peça boa), histórico, relatório e similaridade MobileNet.

## Rodar no XAMPP (Windows)

### 1. Pré-requisitos
- [XAMPP](https://www.apachefriends.org/) instalado
- [Node.js](https://nodejs.org/) instalado (só para gerar o build uma vez)

### 2. Forma automática
1. Baixe o projeto e abra a pasta `defect-scanner`
2. Se o XAMPP **não** estiver em `C:\xampp`, edite `deploy-xampp.bat` e ajuste `XAMPP_DIR`
3. Clique duas vezes em **`deploy-xampp.bat`**
4. No XAMPP Control Panel, inicie o **Apache**
5. Abra no navegador: **http://localhost/inspex/**

### 3. Forma manual
No Prompt (dentro de `defect-scanner`):

```bat
npm install
npm run build
```

Copie **todo o conteúdo** da pasta `dist` para:

```text
C:\xampp\htdocs\inspex\
```

Depois abra: **http://localhost/inspex/**

### Câmera no XAMPP
- Use **http://localhost/inspex/** — funciona
- **Não use** `http://192.168.x.x/...` no celular sem HTTPS — o navegador bloqueia a câmera
- Se pedir permissão, clique em **Permitir**
- Sem câmera: use **Demo com referência**

## Desenvolvimento (sem XAMPP)

```bash
cd defect-scanner
npm install
npm run dev
```

Abra `http://localhost:5173`.

## Evolução

| Passo | Recurso |
|-------|---------|
| 1 | Câmera + anomalias clássicas (bordas/variância) |
| 2 | Presets por material + golden sample |
| 3 | Histórico, relatório HTML e embeddings MobileNet (TF.js) |

## Scripts

| Comando              | Descrição                          |
|----------------------|------------------------------------|
| `npm run dev`        | Servidor de desenvolvimento        |
| `npm run build`      | Build para XAMPP / produção        |
| `deploy-xampp.bat`   | Build + copia para `htdocs\inspex` |
| `npm run preview`    | Preview do build                   |
| `npm test`           | Testes do núcleo                   |
