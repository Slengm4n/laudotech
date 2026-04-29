'use client'
// src/app/laudos/page.tsx

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'

export default function LaudosListPage() {
  const [laudos, setLaudos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    async function carregarLaudosProntos() {
      try {
        const { data, error } = await supabase
          .from('visitas')
          .select(`*, clientes (nome)`)
          .eq('status', 'concluida')
          .order('finalizado_em', { ascending: false })

        if (error) throw error
        setLaudos(data || [])
      } catch (error) {
        toast.error("Erro ao carregar os laudos.")
      } finally {
        setCarregando(false)
      }
    }
    carregarLaudosProntos()
  }, [])

  // ─── HELPERS DE FORMATAÇÃO ───
  const formatarData = (iso?: string) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('pt-BR')
  }

  // Pega apenas a primeira parte do UUID para virar um número de OS amigável
  const formatarOS = (id: string) => {
    if (!id) return ''
    return id.split('-')[0].toUpperCase()
  }

  // ─── LÓGICA DE AGRUPAMENTO ───
  // 1. Primeiro filtramos pela busca do usuário
  const laudosFiltrados = laudos.filter(laudo => 
    laudo.clientes?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    laudo.id.toLowerCase().includes(busca.toLowerCase())
  )

  // 2. Depois agrupamos os laudos filtrados pelo nome do cliente
  const laudosAgrupados = laudosFiltrados.reduce((acumulador: any, laudo) => {
    const nomeCliente = laudo.clientes?.nome || 'Cliente Não Identificado'
    if (!acumulador[nomeCliente]) {
      acumulador[nomeCliente] = []
    }
    acumulador[nomeCliente].push(laudo)
    return acumulador
  }, {})

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
                <Link key={item} href={`/${item.toLowerCase()}`} className={`px-3 py-1.5 rounded-lg text-sm transition ${item === 'Laudos' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                  {item}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        
        {/* Cabeçalho e Busca */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Central de Laudos</h1>
            <p className="text-sm text-gray-500">Histórico de documentos organizados por cliente.</p>
          </div>
          
          <div className="w-full md:w-72 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar cliente ou OS..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-900 transition shadow-sm"
            />
          </div>
        </div>

        {/* Lista Agrupada */}
        {carregando ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm shadow-sm">
            Buscando histórico...
          </div>
        ) : Object.keys(laudosAgrupados).length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            <span className="text-4xl block mb-3">🗂️</span>
            <p className="text-gray-900 font-medium">Nenhum laudo encontrado.</p>
            <p className="text-sm text-gray-500 mt-1">Tente buscar por outro termo ou conclua uma vistoria.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(laudosAgrupados).map(([cliente, listaDeLaudos]: [string, any]) => (
              
              /* CARD DO CLIENTE */
              <div key={cliente} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                
                {/* Título do Cliente */}
                <div className="bg-gray-50 border-b border-gray-200 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🏢</span>
                    <h2 className="font-bold text-gray-900 text-lg">{cliente}</h2>
                  </div>
                  <span className="text-xs font-medium bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-md shadow-sm">
                    {listaDeLaudos.length} laudo(s)
                  </span>
                </div>

                {/* Lista de Laudos desse Cliente */}
                <div className="divide-y divide-gray-100">
                  {listaDeLaudos.map((laudo: any) => (
                    <div key={laudo.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-blue-50/50 transition group">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                            OS #{formatarOS(laudo.id)}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">{formatarData(laudo.finalizado_em)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5">
                          Técnico Responsável: <span className="font-medium text-gray-700">{laudo.tecnico_nome}</span>
                        </p>
                      </div>
                      
                      <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Link 
                          href={`/laudos/${laudo.id}`} 
                          target="_blank" // Abre em nova aba para não sair da lista!
                          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition shadow-sm flex items-center gap-2"
                        >
                          🖨️ Imprimir / PDF
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  )
}