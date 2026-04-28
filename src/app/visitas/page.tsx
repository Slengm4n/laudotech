'use client'
// src/app/visitas/page.tsx

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'

export default function VisitasListaPage() {
  const [visitas, setVisitas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  
  // Nossos dois filtros trabalhando juntos!
  const [filtroStatus, setFiltroStatus] = useState('todas')
  const [filtroData, setFiltroData] = useState('hoje') // hoje, proximos_7, todas

  useEffect(() => {
    async function carregarVisitas() {
      try {
        const { data, error } = await supabase
          .from('visitas')
          .select(`id, data_agendada, status, modalidade, tecnico_nome, clientes ( nome, endereco )`)
          .order('data_agendada', { ascending: true }) // Ordenando da mais próxima para a mais distante

        if (error) throw error
        setVisitas(data || [])
      } catch (error) {
        toast.error("Erro ao carregar as visitas.")
      } finally {
        setCarregando(false)
      }
    }
    carregarVisitas()
  }, [])

  // ─── LÓGICA DE FILTRAGEM INTELIGENTE ───
  const hojeStr = new Date().toISOString().split('T')[0]
  const dataDaqui7Dias = new Date()
  dataDaqui7Dias.setDate(dataDaqui7Dias.getDate() + 7)
  const seteDiasStr = dataDaqui7Dias.toISOString().split('T')[0]

  const visitasFiltradas = visitas.filter(v => {
    // 1. Filtro de Status
    if (filtroStatus !== 'todas' && v.status !== filtroStatus) return false
    
    // 2. Filtro de Data
    if (filtroData === 'hoje' && v.data_agendada !== hojeStr) return false
    if (filtroData === 'proximos_7') {
      // Pega de hoje até 7 dias pra frente
      if (v.data_agendada < hojeStr || v.data_agendada > seteDiasStr) return false
    }
    return true
  })

  // ─── AGRUPAMENTO POR DATA (A Mágica do Visual) ───
  // Transforma um array [v1, v2, v3] em um objeto { '2026-04-28': [v1, v2], '2026-04-29': [v3] }
  const visitasAgrupadas = visitasFiltradas.reduce((acc, visita) => {
    const data = visita.data_agendada;
    if (!acc[data]) acc[data] = [];
    acc[data].push(visita);
    return acc;
  }, {} as Record<string, any[]>)

  // Função para deixar a data amigável (Ex: "Hoje, 28/04" ou "30/04/2026")
  const formatarDataCabecalho = (dataISO: string) => {
    if (dataISO === hojeStr) return 'Hoje, ' + dataISO.split('-').reverse().slice(0,2).join('/')
    return dataISO.split('-').reverse().join('/')
  }

  const statusStyle: Record<string, string> = {
    agendada: 'bg-blue-50 text-blue-700 border-blue-200',
    em_andamento: 'bg-purple-50 text-purple-700 border-purple-200',
    concluida: 'bg-green-50 text-green-700 border-green-200',
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Toaster position="top-right" richColors />
      
      {/* ── Navbar ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-base font-semibold text-gray-900">LaudoTech</span>
            <nav className="hidden md:flex items-center gap-1">
              {['Dashboard', 'Visitas', 'Laudos', 'Clientes'].map(item => (
                <Link key={item} href={`/${item.toLowerCase()}`} className={`px-3 py-1.5 rounded-lg text-sm transition ${item === 'Visitas' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                  {item}
                </Link>
              ))}
            </nav>
          </div>
          <Link href="/visitas/nova" className="bg-gray-900 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-gray-800 transition font-medium">+ Nova Visita</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Agenda de Visitas</h1>
          <p className="text-sm text-gray-500">Acompanhe as vistorias planejadas e em andamento.</p>
        </div>

        {/* ── Barra de Filtros Duplos ── */}
        <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
          
          {/* Filtro de Data (Pílulas) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2">Período:</span>
            {[{ id: 'hoje', label: 'Hoje' }, { id: 'proximos_7', label: 'Próx. 7 dias' }, { id: 'todas', label: 'Todas as datas' }].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFiltroData(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition border ${filtroData === tab.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filtro de Status (Tabs tradicionais) */}
          <div className="flex items-center gap-2 md:border-l border-gray-200 md:pl-4">
             <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2">Status:</span>
            {[{ id: 'todas', label: 'Todos' }, { id: 'agendada', label: 'Agendadas' }, { id: 'concluida', label: 'Concluídas' }].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFiltroStatus(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${filtroStatus === tab.id ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Lista de Visitas Agrupadas ── */}
        <div className="space-y-6">
          {carregando ? (
            <div className="p-8 text-center text-gray-500 text-sm bg-white border border-gray-200 rounded-xl">Carregando agenda...</div>
          ) : Object.keys(visitasAgrupadas).length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm bg-white border border-gray-200 rounded-xl shadow-sm">Nenhuma visita encontrada para os filtros selecionados.</div>
          ) : (
            Object.keys(visitasAgrupadas).map(dataAgendada => (
              <div key={dataAgendada} className="space-y-3">
                {/* O Separador de Data Lindo */}
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-3">
                  <span className="bg-gray-200 h-px flex-1"></span>
                  {formatarDataCabecalho(dataAgendada)}
                  <span className="bg-gray-200 h-px flex-1"></span>
                </h3>
                
                {/* Os Cards dessa Data */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-100">
                  {visitasAgrupadas[dataAgendada].map(v => (
                    <div key={v.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-medium border ${statusStyle[v.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {v.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-medium text-gray-500">OS #{String(v.id).padStart(4, '0')}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{v.clientes?.nome || 'Cliente Desconhecido'}</p>
                        <p className="text-xs text-gray-500 mt-1">Técnico: {v.tecnico_nome} · {v.modalidade}</p>
                      </div>
                      <Link href={`/visitas/${v.id}`} className="text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-400 px-4 py-2 rounded-lg transition shadow-sm">
                        Abrir Missão
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}