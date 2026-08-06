# Inspex

Detecção de defeitos pela câmera do celular, com presets, referência (peça boa), histórico, relatório e similaridade MobileNet.

## Como usar

```bash
cd defect-scanner
npm install
npm run dev
```

1. Escolha o **tipo de superfície**.
2. Abra a câmera → **Salvar peça boa**.
3. Analise a peça sob inspeção.
4. Abra o **relatório** ou consulte o **Histórico**.
5. **Demo com referência** testa o fluxo sem câmera.

A câmera exige HTTPS (ou localhost). O modelo MobileNet é baixado sob demanda na primeira comparação com referência.

## Evolução

| Passo | Recurso |
|-------|---------|
| 1 | Câmera + anomalias clássicas (bordas/variância) |
| 2 | Presets por material + golden sample |
| 3 | Histórico, relatório HTML e embeddings MobileNet (TF.js) |

## Scripts

| Comando           | Descrição                     |
|-------------------|-------------------------------|
| `npm run dev`     | Servidor de desenvolvimento   |
| `npm run build`   | Build de produção             |
| `npm run preview` | Preview do build              |
| `npm test`        | Testes do núcleo              |
