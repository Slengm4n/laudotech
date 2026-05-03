'use client'
// src/app/laudos/page.tsx

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { error } from 'console'

export default function CentralLaudosPage() {
  const [laudos, setLaudos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

  // Controle de quais clientes estão expandidos (abertos)
  const [clientesExpandidos, setClientesExpandidos] = useState<string[]>([])

  useEffect(() => {
    async function carregarLaudos() {
      // Puxa apenas visitas que foram finalizadas (que geraram laudo)
      const { data, error } = await supabase
        .from('visitas')
        .select('*, clientes(*)')
        .eq('status', 'concluida')
        .order('criado_em', { ascending: false })

      if (data) setLaudos(data)
      if (data) setLaudos(data)
      setCarregando(false)
    }
    carregarLaudos()
  }, [])

  const formatarData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

  // Agrupamento Inteligente por Cliente
  const laudosAgrupados = laudos.reduce((acc, laudo) => {
    const nomeCliente = laudo.clientes?.nome || 'Cliente Excluído/Sem Nome'
    if (!acc[nomeCliente]) {
      acc[nomeCliente] = { id: laudo.cliente_id, laudos: [] }
    }
    acc[nomeCliente].laudos.push(laudo)
    return acc
  }, {} as Record<string, { id: string, laudos: any[] }>)

  // Filtro de Busca
  const clientesFiltrados = Object.entries(laudosAgrupados).filter(([nomeCliente]) =>
    nomeCliente.toLowerCase().includes(busca.toLowerCase())
  )

  // Função para abrir/fechar a lista de um cliente
  const toggleCliente = (nomeCliente: string) => {
    setClientesExpandidos(prev =>
      prev.includes(nomeCliente)
        ? prev.filter(n => n !== nomeCliente) // Fecha se já estiver aberto
        : [...prev, nomeCliente] // Abre se estiver fechado
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-base font-semibold text-gray-900">LaudoTech</span>
            <nav className="hidden md:flex items-center gap-1">
              {['Dashboard', 'Visitas', 'Laudos', 'Clientes', 'Orcamentos'].map(item => (
                <Link key={item} href={`/${item.toLowerCase()}`} className={`px-3 py-1.5 rounded-lg text-sm transition ${item === 'Laudos' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                  {item === 'Orcamentos' ? 'Orçamentos' : item}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Central de Laudos</h1>
            <p className="text-sm text-gray-500">Histórico de documentos organizados por cliente.</p>
          </div>
          <div className="relative w-full md:w-72">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-900 shadow-sm"
            />
          </div>
        </div>

        {carregando ? (
          <div className="text-center py-10 text-gray-500 text-sm">Carregando histórico...</div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
            <span className="text-4xl block mb-3">📁</span>
            <p className="text-gray-900 font-medium">Nenhum laudo encontrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 1. Aqui colocamos o [string, any] para o TS reconhecer a variável 'dados' */}
            {clientesFiltrados.map(([nomeCliente, dados]: [string, any]) => {
              const estaAberto = clientesExpandidos.includes(nomeCliente)

              return (
                <div key={nomeCliente} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all">

                  {/* CABEÇALHO DA EMPRESA (Clicável) */}
                  <button
                    onClick={() => toggleCliente(nomeCliente)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🏢</span>
                      <h2 className="font-bold text-gray-900">{nomeCliente}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md">
                        {dados.laudos.length} laudo(s)
                      </span>
                      <span className={`text-gray-400 transition-transform duration-300 ${estaAberto ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                  </button>

                  {/* LISTA DE LAUDOS (Oculta por padrão) */}
                  {estaAberto && (
                    <div className="border-t border-gray-100 bg-gray-50/50 p-2 divide-y divide-gray-100">
                      {/* 2. Aqui colocamos o (laudo: any) */}
                      {dados.laudos.map((laudo: any) => (
                        <div key={laudo.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 hover:bg-white rounded-lg transition gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded uppercase tracking-wider">
                                OS #{laudo.id.split('-')[0]}
                              </span>
                              <span className="text-sm font-bold text-gray-900">{formatarData(laudo.criado_em)}</span>
                            </div>
                            <p className="text-xs text-gray-500">Téc: {laudo.tecnico_nome || 'Slengman Engenharia'}</p>
                          </div>
                          <Link
                            href={`/laudos/${laudo.id}`}
                            className="bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-800 transition shadow-sm text-center"
                          >
                            🖨️ Abrir PDF
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}