# Inspex

Detecção de defeitos pela câmera do celular, com presets, referência (peça boa), histórico, relatório e similaridade MobileNet.

## Rodar no XAMPP (Windows) — instalação pronta

**Não precisa de Node.js.** A pasta `xampp-htdocs/inspex` já vem compilada.

### Instalação em 1 clique
1. Baixe a branch e abra `defect-scanner`
2. Clique duas vezes em **`instalar-xampp.bat`**
3. No XAMPP Control Panel → **Start** no Apache
4. Abra **http://localhost/inspex/**

Guia completo: `INSTALAR-XAMPP.txt`

### Instalação manual (copiar pasta)
Copie `defect-scanner/xampp-htdocs/inspex` para:

```text
C:\xampp\htdocs\inspex
```

### Câmera no XAMPP
- Use **http://localhost/inspex/** — funciona
- **Não use** `http://192.168.x.x/...` no celular sem HTTPS
- Sem câmera: use **Demo com referência**

### Regenerar o build (opcional, precisa Node.js)
`deploy-xampp.bat` ou `npm run build` e copie `dist` de novo.

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
