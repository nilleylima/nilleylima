import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/app");

  return (
    <div className="relative min-h-screen overflow-hidden bg-sand-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#d8f3ea_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_#e2dbcf_0%,_transparent_50%)]" />
        <div className="absolute -left-20 top-24 h-[28rem] w-[28rem] animate-drift rounded-full bg-mint-400/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[32rem] w-[32rem] animate-pulse-soft rounded-full bg-ink-900/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between animate-rise">
          <span className="font-display text-3xl font-extrabold tracking-tight text-ink-900 md:text-4xl">
            Fluxa
          </span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary">
              Entrar
            </Link>
            <Link href="/register" className="btn-primary hidden sm:inline-flex">
              Criar conta
            </Link>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-16 md:py-20">
          <div className="max-w-3xl">
            <h1 className="font-display animate-rise text-4xl font-extrabold leading-[1.05] tracking-tight text-ink-900 sm:text-5xl md:text-6xl">
              Seu dinheiro sob controle, do caixa ao relatório.
            </h1>
            <p className="mt-6 max-w-xl animate-rise-delay text-lg text-ink-800/75 md:text-xl">
              Contas, lançamentos, pagar e receber e visão clara do mês — em um
              sistema financeiro feito para PME e autônomos.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 animate-rise-late">
              <Link href="/register" className="btn-primary px-6 py-3 text-base">
                Começar agora
              </Link>
              <Link href="/login" className="btn-secondary px-6 py-3 text-base">
                Ver demo
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-800/55">
              Demo: demo@fluxa.app · senha demo1234
            </p>
          </div>

          <div className="mt-16 animate-rise-late overflow-hidden rounded-[2rem] border border-[var(--line)] bg-ink-900 shadow-soft">
            <div className="grid gap-px bg-ink-800/40 md:grid-cols-3">
              {[
                { label: "Saldo consolidado", value: "R$ 8.850,00" },
                { label: "Entradas do mês", value: "R$ 6.500,00" },
                { label: "Saídas do mês", value: "R$ 2.400,00" },
              ].map((item) => (
                <div key={item.label} className="bg-ink-900 p-6 md:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-mint-200/70">
                    {item.label}
                  </p>
                  <p className="mt-3 font-display text-3xl font-bold text-mint-50">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 px-6 py-5 text-sm text-mint-100/70 md:px-8">
              Dashboard, contas, lançamentos, contas a pagar/receber e exportação CSV.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
