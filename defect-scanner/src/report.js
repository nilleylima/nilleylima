import { similarityLabel } from './embeddings.js'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function buildReportHtml(item) {
  const when = new Date(item.createdAt).toLocaleString('pt-BR')
  const rows = (item.defects || [])
    .map(
      (d) => `<tr>
      <td>${escapeHtml(d.label)}</td>
      <td>${Math.round((d.confidence || 0) * 100)}%</td>
      <td>${((d.areaRatio || 0) * 100).toFixed(2)}%</td>
      <td>${d.fromReference ? 'Sim' : 'Não'}</td>
    </tr>`,
    )
    .join('')

  const thumb = item.thumbnail
    ? `<img class="thumb" src="${item.thumbnail}" alt="Miniatura da inspeção" />`
    : ''

  const emb =
    item.embeddingSimilarity == null
      ? '—'
      : similarityLabel(item.embeddingSimilarity)

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório Inspex — ${escapeHtml(when)}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: "IBM Plex Sans", Segoe UI, sans-serif; margin: 32px; color: #12202c; }
    h1 { font-family: Syne, sans-serif; margin: 0 0 4px; letter-spacing: -0.03em; }
    .meta { color: #5b6b78; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: 120px 1fr; gap: 20px; margin-bottom: 28px; }
    .thumb { width: 120px; height: 120px; object-fit: cover; border-radius: 12px; background: #e8eef4; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #d7e0e8; font-size: 14px; }
    th { color: #5b6b78; font-weight: 600; }
    .score { font-size: 28px; font-weight: 700; }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <h1>Inspex</h1>
  <p class="meta">Relatório de inspeção · ${escapeHtml(when)}</p>
  <div class="grid">
    ${thumb}
    <div>
      <p><strong>Preset:</strong> ${escapeHtml(item.presetLabel || item.presetId)}</p>
      <p><strong>Qualidade:</strong> <span class="score">${escapeHtml(item.qualityScore)}</span>/100 — ${escapeHtml(item.qualityLabel)}</p>
      <p><strong>Defeitos:</strong> ${escapeHtml(item.defectCount)}</p>
      <p><strong>Referência:</strong> ${item.usedReference ? 'Sim' : 'Não'}</p>
      <p><strong>Similaridade (MobileNet):</strong> ${escapeHtml(emb)}</p>
      <p><strong>Modo:</strong> ${escapeHtml(item.mode)}</p>
    </div>
  </div>
  <table>
    <thead>
      <tr><th>Defeito</th><th>Confiança</th><th>Área</th><th>Vs referência</th></tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="4">Nenhum defeito registrado</td></tr>'}
    </tbody>
  </table>
</body>
</html>`
}

export function openReport(item) {
  const html = buildReportHtml(item)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  if (!win) {
    // Popup blocked — download instead
    downloadReport(item)
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function downloadReport(item) {
  const html = buildReportHtml(item)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `inspex-relatorio-${item.id}.html`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function downloadHistoryJson(items) {
  const blob = new Blob([JSON.stringify(items, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `inspex-historico-${Date.now()}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
