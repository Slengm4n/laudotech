'use client'
// src/app/orcamentos/page.tsx

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'

export default function OrcamentosListPage() {
  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  
  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  useEffect(() => {
    async function carregarOrcamentos() {
      try {
        const { data, error } = await supabase
          .from('orcamentos')
          .select('*, clientes(nome)')
          .order('created_at', { ascending: false })

        if (error) throw error
        setOrcamentos(data || [])
      } catch (error) {
        toast.error("Erro ao carregar os orçamentos.")
      } finally {
        setCarregando(false)
      }
    }
    carregarOrcamentos()
  }, [])

  // ─── HELPERS ───
  const formatarData = (iso?: string) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '-'
  
  const formatarValor = (valor?: number) => {
    if (valor === undefined || valor === null) return 'R$ 0,00'
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'rascunho':
        return <span className="bg-gray-100 text-gray-700 border border-gray-200 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">📝 Rascunho</span>
      case 'enviado':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">📤 Enviado</span>
      case 'aprovado':
        return <span className="bg-green-50 text-green-700 border border-green-200 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">✅ Aprovado</span>
      case 'recusado':
        return <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">❌ Recusado</span>
      default:
        return <span className="bg-gray-100 text-gray-700 text-[10px] px-2 py-0.5 rounded uppercase font-bold">{status}</span>
    }
  }

  // ─── LÓGICA DE FILTRAGEM ───
  const orcamentosFiltrados = orcamentos.filter(orc => {
    const atendeBusca = 
      orc.titulo.toLowerCase().includes(busca.toLowerCase()) || 
      (orc.clientes?.nome || '').toLowerCase().includes(busca.toLowerCase())
    
    const atendeStatus = filtroStatus === 'todos' || orc.status === filtroStatus

    return atendeBusca && atendeStatus
  })

  // ─── CÁLCULO DO FUNIL (Resumo no topo) ───
  const totalAprovado = orcamentos.filter(o => o.status === 'aprovado').reduce((acc, o) => acc + (o.dados_financeiros?.totaisCalculados?.totalGeral || 0), 0)
  const totalEmNegociacao = orcamentos.filter(o => o.status === 'enviado').reduce((acc, o) => acc + (o.dados_financeiros?.totaisCalculados?.totalGeral || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Toaster position="top-right" richColors />

      {/* ── Navbar ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-base font-semibold text-gray-900">LaudoTech</span>
            <nav className="hidden md:flex items-center gap-1">
              {['Dashboard', 'Visitas', 'Laudos', 'Clientes', 'Orcamentos'].map(item => (
                <Link key={item} href={`/${item.toLowerCase()}`} className={`px-3 py-1.5 rounded-lg text-sm transition ${item === 'Orcamentos' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                  {item === 'Orcamentos' ? 'Orçamentos' : item}
                </Link>
              ))}
            </nav>
          </div>
          <Link href="/orcamentos/novo" className="bg-green-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-green-700 transition font-bold shadow-sm">+ Criar Proposta</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        
        {/* CABEÇALHO E MÉTRICAS */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Funil de Vendas e Orçamentos</h1>
          <p className="text-sm text-gray-500 mb-6">Gerencie propostas comerciais, negociações e materiais.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Total Aprovado</p>
              <p className="text-2xl font-black text-green-600">{formatarValor(totalAprovado)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Aguardando Resposta</p>
              <p className="text-2xl font-black text-blue-600">{formatarValor(totalEmNegociacao)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Taxa de Conversão</p>
              <p className="text-2xl font-black text-gray-900">
                {orcamentos.length > 0 ? Math.round((orcamentos.filter(o => o.status === 'aprovado').length / orcamentos.length) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-96 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar por cliente ou título..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-900 transition shadow-sm"
            />
          </div>
          <select 
            value={filtroStatus} 
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 transition shadow-sm font-medium text-gray-700"
          >
            <option value="todos">Todos os Status</option>
            <option value="rascunho">Apenas Rascunhos</option>
            <option value="enviado">Enviados (Aguardando)</option>
            <option value="aprovado">Aprovados</option>
            <option value="recusado">Recusados</option>
          </select>
        </div>

        {/* LISTA DE ORÇAMENTOS */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {carregando ? (
            <div className="p-12 text-center text-gray-500 text-sm">Carregando funil de vendas...</div>
          ) : orcamentosFiltrados.length === 0 ? (
            <div className="p-16 text-center">
              <span className="text-4xl block mb-3">💼</span>
              <p className="text-gray-900 font-medium">Nenhum orçamento encontrado.</p>
              <p className="text-sm text-gray-500 mt-1">Crie sua primeira proposta comercial para começar a vender.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {orcamentosFiltrados.map(orc => (
                <div key={orc.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition group">
                  
                  {/* Dados Básicos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{orc.clientes?.nome || 'Cliente Excluído'}</h3>
                      {renderStatusBadge(orc.status)}
                    </div>
                    <p className="text-sm text-gray-600 truncate mb-1">{orc.titulo}</p>
                    <p className="text-xs text-gray-400">
                      Criado em {formatarData(orc.created_at)} • {orc.lista_materiais?.length || 0} materiais listados
                    </p>
                  </div>

                  {/* Valores e Ações */}
                  <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 mt-2 md:mt-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-0.5">Valor Total</p>
                      <p className="text-lg font-black text-gray-900">
                        {formatarValor(orc.dados_financeiros?.totaisCalculados?.totalGeral)}
                      </p>
                    </div>
                    
                    <Link 
                      href={`/orcamentos/${orc.id}`} 
                      className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 hover:border-gray-400 transition shadow-sm"
                    >
                      Abrir Proposta →
                    </Link>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}