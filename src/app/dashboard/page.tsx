'use client'
// src/app/dashboard/page.tsx

import { useState } from 'react'
import Link from 'next/link'

// ─── Dados mock (substituir por chamadas ao db.ts depois) ───
const metricas = {
  laudosMes: 12,
  laudosMesAnterior: 9,
  faturamentoMes: 8400,
  faturamentoPendente: 2300,
  clientesAtivos: 7,
  clientesNovos: 2,
}

const ultimosLaudos = [
  { id: '1', numero: 12, cliente: 'Metalúrgica São Paulo Ltda', tipo: 'Inspeção elétrica predial', data: '18/04/2025', status: 'concluido', valor: 1200 },
  { id: '2', numero: 11, cliente: 'Frigorífico Bom Sabor', tipo: 'Manutenção preventiva', data: '12/04/2025', status: 'rascunho', valor: 800 },
  { id: '3', numero: 10, cliente: 'Construtora Horizonte', tipo: 'Vistoria estrutural', data: '05/04/2025', status: 'concluido', valor: 2500 },
  { id: '4', numero: 9, cliente: 'Farmácia Bem Estar', tipo: 'Laudo NR-12', data: '01/04/2025', status: 'rascunho', valor: 600 },
]

const cobrancasPendentes = [
  { id: '1', cliente: 'Frigorífico Bom Sabor', laudo: 11, valor: 800, vencimento: '25/04/2025' },
  { id: '2', cliente: 'Farmácia Bem Estar', laudo: 9, valor: 600, vencimento: '20/04/2025' },
  { id: '3', cliente: 'Ind. Química Norte', laudo: 8, valor: 900, vencimento: '15/04/2025' },
]

const graficoMeses = [
  { mes: 'Nov', valor: 4200 },
  { mes: 'Dez', valor: 5800 },
  { mes: 'Jan', valor: 3900 },
  { mes: 'Fev', valor: 6700 },
  { mes: 'Mar', valor: 7100 },
  { mes: 'Abr', valor: 8400 },
]

// ─── Helpers ────────────────────────────────────────────────
function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const statusLabel: Record<string, string> = {
  concluido: 'Concluído',
  rascunho: 'Rascunho',
  cancelado: 'Cancelado',
}

const statusStyle: Record<string, string> = {
  concluido: 'bg-green-50 text-green-700 border border-green-200',
  rascunho: 'bg-amber-50 text-amber-700 border border-amber-200',
  cancelado: 'bg-red-50 text-red-700 border border-red-200',
}

// ─── Componentes locais ──────────────────────────────────────
function MetricCard({ label, valor, sub, destaque }: {
  label: string; valor: string; sub: string; destaque?: boolean
}) {
  return (
    <div className={`rounded-xl p-5 ${destaque ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200'}`}>
      <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${destaque ? 'text-gray-400' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className={`text-2xl font-semibold ${destaque ? 'text-white' : 'text-gray-900'}`}>{valor}</p>
      <p className={`text-xs mt-1 ${destaque ? 'text-gray-400' : 'text-gray-400'}`}>{sub}</p>
    </div>
  )
}

function GraficoBarra() {
  const max = Math.max(...graficoMeses.map(m => m.valor))
  return (
    <div className="flex items-end gap-3 h-32 mt-2">
      {graficoMeses.map((m, i) => {
        const pct = Math.round((m.valor / max) * 100)
        const isAtual = i === graficoMeses.length - 1
        return (
          <div key={m.mes} className="flex flex-col items-center gap-1 flex-1">
            <span className={`text-xs font-medium ${isAtual ? 'text-gray-900' : 'text-gray-400'}`}>
              {formatBRL(m.valor).replace('R$\u00a0', 'R$')}
            </span>
            <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
              <div
                className={`w-full rounded-t-md transition-all ${isAtual ? 'bg-gray-900' : 'bg-gray-200'}`}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className={`text-xs ${isAtual ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{m.mes}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────
export default function DashboardPage() {
  const [menuAberto, setMenuAberto] = useState(false)

  const variacao = metricas.laudosMes - metricas.laudosMesAnterior
  const variacaoPct = Math.round((variacao / metricas.laudosMesAnterior) * 100)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Navbar ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-base font-semibold text-gray-900">LaudoTech</span>
            <nav className="hidden md:flex items-center gap-1">
              {[
                { href: '/dashboard', label: 'Dashboard' },
                { href: '/laudos', label: 'Laudos' },
                { href: '/financeiro', label: 'Financeiro' },
                { href: '/clientes', label: 'Clientes' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    item.href === '/dashboard'
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link
            href="/laudos/novo"
            className="bg-gray-900 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-gray-800 transition font-medium"
          >
            + Nova visita
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ── Saudação ── */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Bom dia! 👋</h1>
          <p className="text-sm text-gray-SS">Aqui está o resumo de abril de 2025.</p>
        </div>

        {/* ── Métricas ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Laudos este mês"
            valor={String(metricas.laudosMes)}
            sub={`+${variacaoPct}% vs mês anterior`}
            destaque
          />
          <MetricCard
            label="Faturado (mês)"
            valor={formatBRL(metricas.faturamentoMes)}
            sub="8 laudos concluídos"
          />
          <MetricCard
            label="A receber"
            valor={formatBRL(metricas.faturamentoPendente)}
            sub="3 cobranças pendentes"
          />
          <MetricCard
            label="Clientes ativos"
            valor={String(metricas.clientesAtivos)}
            sub={`+${metricas.clientesNovos} novos este mês`}
          />
        </div>

        {/* ── Gráfico + Cobranças ── */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Gráfico faturamento */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-gray-900">Faturamento mensal</p>
              <span className="text-xs text-gray-400">últimos 6 meses</span>
            </div>
            <GraficoBarra />
          </div>

          {/* Cobranças pendentes */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-900">Cobranças pendentes</p>
              <Link href="/financeiro" className="text-xs text-gray-400 hover:text-gray-700">
                Ver todas →
              </Link>
            </div>
            <div className="space-y-3">
              {cobrancasPendentes.map(c => (
                <div key={c.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800 leading-tight">{c.cliente}</p>
                    <p className="text-xs text-gray-400">Laudo #{c.laudo} · vence {c.vencimento}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatBRL(c.valor)}</p>
                    <button className="text-xs text-green-600 hover:underline">Marcar pago</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between">
              <span className="text-xs text-gray-500">Total pendente</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatBRL(cobrancasPendentes.reduce((a, c) => a + c.valor, 0))}
              </span>
            </div>
          </div>
        </div>

        {/* ── Últimos laudos ── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">Últimos laudos</p>
            <Link href="/laudos" className="text-xs text-gray-400 hover:text-gray-700">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {ultimosLaudos.map(l => (
              <div key={l.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-gray-400 shrink-0">#{String(l.numero).padStart(3, '0')}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{l.cliente}</p>
                    <p className="text-xs text-gray-400 truncate">{l.tipo} · {l.data}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-sm font-medium text-gray-900">{formatBRL(l.valor)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[l.status]}`}>
                    {statusLabel[l.status]}
                  </span>
                  <Link
                    href={`/laudos/${l.id}`}
                    className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-md px-2 py-0.5 hover:border-gray-400 transition"
                  >
                    Ver
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Ações rápidas ── */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Ações rápidas</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/laudos/novo', icon: '📋', label: 'Novo laudo' },
              { href: '/clientes/novo', icon: '🏢', label: 'Novo cliente' },
              { href: '/financeiro', icon: '💰', label: 'Ver cobranças' },
              { href: '/laudos?status=rascunho', icon: '✏️', label: 'Rascunhos' },
            ].map(a => (
              <Link
                key={a.href}
                href={a.href}
                className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-gray-400 hover:shadow-sm transition text-center"
              >
                <span className="text-2xl">{a.icon}</span>
                <span className="text-sm text-gray-700 font-medium">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}