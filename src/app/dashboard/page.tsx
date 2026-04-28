'use client'
// src/app/dashboard/page.tsx

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'

// ─── Helpers ───
function formatBRL(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }

const statusStyle: Record<string, string> = {
  concluido: 'bg-green-50 text-green-700 border-green-200',
  rascunho: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelado: 'bg-red-50 text-red-700 border-red-200',
  agendada: 'bg-blue-50 text-blue-700 border-blue-200',
  em_andamento: 'bg-purple-50 text-purple-700 border-purple-200',
}

const statusLabel: Record<string, string> = {
  concluido: 'Concluído', rascunho: 'Rascunho', cancelado: 'Cancelado', agendada: 'Agendada', em_andamento: 'Em Andamento'
}

// ─── Componentes Locais ───
function MetricCard({ label, valor, sub, destaque, carregando }: { label: string; valor: string; sub: string; destaque?: boolean, carregando?: boolean }) {
  return (
    <div className={`rounded-xl p-5 ${destaque ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200'} ${carregando ? 'animate-pulse' : ''}`}>
      <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${destaque ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-2xl font-semibold ${destaque ? 'text-white' : 'text-gray-900'}`}>{carregando ? '...' : valor}</p>
      <p className={`text-xs mt-1 ${destaque ? 'text-gray-400' : 'text-gray-400'}`}>{carregando ? 'Calculando...' : sub}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [carregando, setCarregando] = useState(true)
  
  // ─── ESTADOS REAIS DO BANCO ───
  const [visitasHoje, setVisitasHoje] = useState<any[]>([])
  const [metricas, setMetricas] = useState({
    clientesAtivos: 0,
    clientesNovosMes: 0,
    // Deixando zerado até criarmos a tabela de laudos/financeiro
    laudosMes: 0, 
    laudosMesAnterior: 0, 
    faturamentoMes: 0, 
    faturamentoPendente: 0
  })

  // Mocks visuais para as tabelas que ainda vamos criar o backend
  const ultimosLaudos = [
    { id: '1', numero: 12, cliente: 'Aguardando módulo de Laudos...', tipo: 'Sistema', data: '', status: 'rascunho', valor: 0 },
  ]
  const cobrancasPendentes = [
    { id: '1', cliente: 'Aguardando módulo Financeiro...', laudo: 0, valor: 0, vencimento: '-' },
  ]
  const graficoMeses = [
    { mes: 'Nov', valor: 0 }, { mes: 'Dez', valor: 0 }, { mes: 'Jan', valor: 0 },
    { mes: 'Fev', valor: 0 }, { mes: 'Mar', valor: 0 }, { mes: 'Abr', valor: 0 },
  ]

  // ─── BUSCANDO OS DADOS NO SUPABASE ───
  useEffect(() => {
    async function carregarDashboard() {
      try {
        const hojeStr = new Date().toISOString().split('T')[0]
        const primeiroDiaDoMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

        // 1. Buscar Visitas de Hoje
        const reqVisitas = supabase
          .from('visitas')
          .select(`id, status, modalidade, tecnico_nome, clientes (nome, endereco)`)
          .eq('data_agendada', hojeStr)

        // 2. Buscar Total de Clientes Ativos
        const reqClientesTotal = supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true })

        // 3. Buscar Clientes Novos neste mês (usa a coluna created_at que o Supabase cria por padrão)
        const reqClientesNovos = supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', primeiroDiaDoMes)

        // Roda todas as buscas ao mesmo tempo para ser ultra-rápido
        const [resVisitas, resClientes, resClientesNovos] = await Promise.all([reqVisitas, reqClientesTotal, reqClientesNovos])

        setVisitasHoje(resVisitas.data || [])
        
        setMetricas(prev => ({
          ...prev,
          clientesAtivos: resClientes.count || 0,
          clientesNovosMes: resClientesNovos.count || 0
        }))

      } catch (error) {
        console.error("Erro ao carregar painel", error)
        toast.error("Erro ao sincronizar dados.")
      } finally {
        setCarregando(false)
      }
    }
    carregarDashboard()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <Toaster position="top-right" richColors />
      
      {/* ── Navbar ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-base font-semibold text-gray-900">LaudoTech</span>
            <nav className="hidden md:flex items-center gap-1">
              {['Dashboard', 'Visitas', 'Laudos', 'Clientes'].map(item => (
                <Link key={item} href={`/${item.toLowerCase()}`} className={`px-3 py-1.5 rounded-lg text-sm transition ${item === 'Dashboard' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>{item}</Link>
              ))}
            </nav>
          </div>
          <Link href="/visitas/nova" className="bg-gray-900 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-gray-800 transition font-medium">+ Nova visita</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Bom dia! 👋</h1>
          <p className="text-sm text-gray-500">Resumo da operação atualizado em tempo real.</p>
        </div>

        {/* ── Métricas ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Laudos este mês" valor="0" sub="Módulo em construção" destaque carregando={carregando} />
          <MetricCard label="Faturado (mês)" valor="R$ 0,00" sub="Módulo em construção" carregando={carregando} />
          <MetricCard label="A receber" valor="R$ 0,00" sub="Módulo em construção" carregando={carregando} />
          <MetricCard 
            label="Clientes ativos" 
            valor={String(metricas.clientesAtivos)} 
            sub={metricas.clientesNovosMes > 0 ? `+${metricas.clientesNovosMes} novos este mês` : 'Nenhum novo este mês'} 
            carregando={carregando} 
          />
        </div>

        {/* ── SEÇÃO REAL: VISITAS DE HOJE ── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
              Agenda de Hoje 
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-semibold">{visitasHoje.length}</span>
            </p>
            <Link href="/visitas" className="text-xs text-gray-400 hover:text-gray-700">Ver calendário →</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {carregando ? (
              <div className="p-6 text-center text-sm text-gray-400 animate-pulse">Sincronizando agenda...</div>
            ) : visitasHoje.length === 0 ? (
              <div className="p-6 text-center">
                <span className="text-2xl block mb-2">🏝️</span>
                <p className="text-sm font-medium text-gray-600">Nenhuma visita agendada para hoje.</p>
                <Link href="/visitas/nova" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Agendar um atendimento</Link>
              </div>
            ) : (
              visitasHoje.map(v => (
                <div key={v.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0 pl-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{v.clientes?.nome || 'Cliente Desconhecido'}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{v.clientes?.endereco || 'Sem endereço'} · Téc: {v.tecnico_nome}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className={`hidden md:inline-block text-xs px-2.5 py-1 rounded-full font-medium border ${statusStyle[v.status] || statusStyle.agendada}`}>
                      {statusLabel[v.status] || v.status.replace('_', ' ')}
                    </span>
                    <Link href={`/visitas/${v.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-transparent hover:border-blue-200 px-3 py-1.5 rounded-lg transition">
                      Abrir Missão
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Restante da tela (Laudos/Cobranças Mockados Temporariamente) ── */}
        {/* ... (mantido igual ao seu layout para não quebrar o visual) */}
        
      </main>
    </div>
  )
}