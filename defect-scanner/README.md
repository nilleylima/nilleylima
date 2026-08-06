# Inspex

Detecção de defeitos pela câmera do celular, com presets por material e comparação com peça boa (referência).

## Como usar

```bash
cd defect-scanner
npm install
npm run dev
```

1. Escolha o **tipo de superfície** (Metal, Plástico, Pintura, Tecido, PCB).
2. Abra a câmera e toque em **Salvar peça boa** com uma amostra íntegra.
3. Enquadre a peça sob inspeção e toque em **Analisar** (ou **Ao vivo**).
4. Sem referência, o app ainda detecta anomalias de superfície.
5. **Demo com referência** mostra peça boa vs peça com defeitos sem câmera.

A câmera exige HTTPS (ou localhost).

## O que há de novo (passo 2)

- Presets que afinam bordas/cor/variância por material
- Modo **golden sample**: diferença normalizada contra a peça boa salva no `localStorage`
- Demo automática com referência limpa + amostra defeituosa

## Scripts

| Comando           | Descrição                    |
|-------------------|------------------------------|
| `npm run dev`     | Servidor de desenvolvimento  |
| `npm run build`   | Build de produção            |
| `npm run preview` | Preview do build             |
| `npm test`        | Testes do detector/referência|
