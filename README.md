# Fluxa — Sistema de Gestão Financeira v1.0

Gestão financeira completa para PME e autônomos: contas, lançamentos, pagar/receber, dashboard e relatórios com exportação CSV.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind
- **Prisma** + SQLite
- **Auth** JWT (cookie httpOnly) com bcrypt
- **Recharts** para gráficos

## Funcionalidades (v1.0)

- Cadastro / login
- Dashboard com saldo, receitas, despesas e gráficos
- Contas e carteiras (corrente, poupança, cartão, dinheiro, digital)
- Lançamentos de receita e despesa com categorias
- Contas a pagar e a receber (baixa gera lançamento)
- Relatórios por categoria + exportação CSV
- Dados demo prontos

## Como rodar

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Conta demo

- **E-mail:** `demo@fluxa.app`
- **Senha:** `demo1234`

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Sobe build de produção |
| `npm run db:seed` | Popula usuário demo |
| `npm run db:reset` | Recria banco e seed |

## Estrutura

```
src/app/
  page.tsx              # Landing
  login / register      # Auth
  app/                  # Área logada
    contas/
    lancamentos/
    pagar-receber/
    relatorios/
  api/                  # REST API
prisma/
  schema.prisma
  seed.ts
```

## Próximas versões

- Orçamentos por categoria
- Lançamentos recorrentes / parcelados
- Anexos de comprovantes
- Multi-usuário com permissões
- Open Banking / conciliação
