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
