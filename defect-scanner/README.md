# Inspex

Detecção de defeitos pela câmera do celular.

App web mobile-first que abre a câmera do celular, analisa a superfície no quadro de leitura e destaca possíveis defeitos (riscos, trincas, manchas, amassados e lascas).

## Como usar

```bash
cd defect-scanner
npm install
npm run dev
```

Abra o endereço no **celular** (mesma rede) via HTTPS ou use um túnel. A API de câmera exige contexto seguro (`https://` ou `localhost`).

1. Toque em **Abrir câmera** e permita o acesso.
2. Enquadre a superfície no retângulo âmbar.
3. Ajuste a **sensibilidade** se precisar.
4. Toque em **Analisar**, ou ative **Ao vivo** para varredura contínua.
5. Use **Ver demo com amostra** para testar sem câmera.

## O que o algoritmo faz

Processamento 100% no dispositivo (sem upload de imagens):

- conversão para luminância + desfoque
- mapa de bordas (Sobel)
- anomalias locais (variância / cor / brilho)
- componentes conectados e classificação por geometria

É um detector de **anomalias de superfície** por visão clássica — útil como protótipo de inspeção. Para produtos específicos (solda, PCB, tecido, etc.), o próximo passo seria um modelo treinado (TensorFlow.js / API de visão) com amostras rotuladas.

## Scripts

| Comando        | Descrição              |
|----------------|------------------------|
| `npm run dev`  | Servidor de desenvolvimento |
| `npm run build`| Build de produção      |
| `npm run preview` | Preview do build    |
