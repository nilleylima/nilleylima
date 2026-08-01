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
| `E` | Apagar |
| `M` | Medir |
| `H` | Pan |
| `F8` | Orto |
| `Ctrl+Z` / `Ctrl+Y` | Desfazer / refazer |
| Roda do mouse | Zoom |
| Botão do meio / Espaço | Pan |

## Recursos

- Grade e eixos com navegação fluida
- Snaps: ponta, meio, centro, interseção, grade e próximo
- Camadas (visível / travada / cor)
- Histórico undo/redo
- Persistência automática no `localStorage`
- Abrir / salvar JSON do desenho
- Exportar PNG

## Escopo

Isto é um CAD web 2D focado em desenho técnico básico. Não cobre DWG nativo, 3D, blocos dinâmicos, cotas anotativas ou o ecossistema completo do AutoCAD — mas serve como base sólida para evoluir nessa direção.
