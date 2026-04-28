'use client'
// src/app/visitas/[id]/page.tsx

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase' 
import { Toaster, toast } from 'sonner'
import { useRouter } from 'next/navigation'

// Atualizamos a tipagem do params para Promise
export default function DetalhesVisitaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  
  // ─── A SOLUÇÃO: Desempacotando o ID ───
  const { id } = use(params) 

  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [visita, setVisita] = useState<any>(null)
  
  const [abaAtiva, setAbaAtiva] = useState('anotacoes')

  // ─── CARREGAR A VISITA DO BANCO ───
  useEffect(() => {
    async function carregar() {
      try {
        const { data, error } = await supabase
          .from('visitas')
          .select(`*, clientes (nome, endereco, telefone, contato_nome)`)
          .eq('id', id) // <-- Usando o ID desempacotado
          .single()

        if (error) throw error
        setVisita(data)
      } catch (error) {
        toast.error("Visita não encontrada.")
        router.push('/dashboard')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [id, router]) // <-- Dependência atualizada

  // ─── MÁQUINA DE ESTADOS (TEMPO E STATUS) ───
  const mudarStatus = async (novoStatus: string) => {
    setProcessando(true)
    const agora = new Date().toISOString()
    
    let atualizacoes: any = { status: novoStatus }
    
    if (novoStatus === 'em_andamento' && visita.status === 'agendada') {
      atualizacoes.iniciado_em = agora
    } else if (novoStatus === 'concluida') {
      atualizacoes.finalizado_em = agora
    }

    try {
      const { error } = await supabase.from('visitas').update(atualizacoes).eq('id', visita.id)
      if (error) throw error
      
      setVisita({ ...visita, ...atualizacoes })
      toast.success(novoStatus === 'em_andamento' ? 'Vistoria iniciada! 🚀' : 'Vistoria finalizada! ✅')
    } catch (error) {
      toast.error('Erro ao atualizar status.')
    } finally {
      setProcessando(false)
    }
  }

  // ─── HELPERS DE DESIGN ───
  const formatarHora = (isoDate?: string) => {
    if (!isoDate) return '--:--'
    return new Date(isoDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const statusColors: Record<string, string> = {
    agendada: 'bg-blue-50 text-blue-700 border-blue-200',
    em_andamento: 'bg-purple-50 text-purple-700 border-purple-200',
    pausada: 'bg-amber-50 text-amber-700 border-amber-200',
    concluida: 'bg-green-50 text-green-700 border-green-200',
  }

  if (carregando) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Carregando missão...</div>
  if (!visita) return null

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Toaster position="top-right" richColors />

      {/* ── Navbar ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-900 transition">← Voltar</Link>
            <span className="text-base font-semibold text-gray-900">OS #{String(visita.id).padStart(4, '0')}</span>
          </div>
          <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md font-bold border ${statusColors[visita.status]}`}>
            {visita.status.replace('_', ' ')}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        
        {/* ── 1. CABEÇALHO DO CLIENTE ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 leading-tight">{visita.clientes?.nome}</h2>
          <p className="text-sm text-gray-500 mt-1">{visita.clientes?.endereco}</p>
          
          <div className="flex items-center gap-3 pt-4 mt-4 border-t border-gray-100">
            <a href={`https://maps.google.com/?q=${visita.clientes?.endereco}`} target="_blank" rel="noreferrer" className="flex-1 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg py-2.5 text-center text-sm font-medium hover:bg-gray-100 transition">
              📍 GPS
            </a>
            {visita.clientes?.telefone && (
              <a href={`https://wa.me/55${visita.clientes.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex-1 bg-green-50 text-green-700 border border-green-200 rounded-lg py-2.5 text-center text-sm font-medium hover:bg-green-100 transition">
                💬 WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* ── 2. PAINEL DE CONTROLE DE TEMPO ── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Controle de Vistoria</p>
            
            {visita.status === 'agendada' && (
              <button 
                onClick={() => mudarStatus('em_andamento')} 
                disabled={processando}
                className="w-full bg-gray-900 text-white rounded-xl py-4 text-sm font-medium hover:bg-gray-800 transition flex justify-center items-center gap-2 shadow-md disabled:opacity-50"
              >
                <span className="text-lg">▶️</span> Iniciar Atendimento Agora
              </button>
            )}

            {visita.status !== 'agendada' && (
              <div>
                <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="text-center flex-1">
                    <p className="text-[10px] text-gray-400 uppercase font-medium">Início</p>
                    <p className="text-lg font-mono font-semibold text-gray-900">{formatarHora(visita.iniciado_em)}</p>
                  </div>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] text-gray-400 uppercase font-medium">Término</p>
                    <p className="text-lg font-mono font-semibold text-gray-900">{formatarHora(visita.finalizado_em)}</p>
                  </div>
                </div>

                {visita.status === 'em_andamento' && (
                  <div className="flex gap-3">
                    <button onClick={() => mudarStatus('pausada')} disabled={processando} className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50">
                      ⏸️ Pausar
                    </button>
                    <button onClick={() => mudarStatus('concluida')} disabled={processando} className="flex-[2] bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition shadow-sm disabled:opacity-50">
                      ✅ Finalizar Obra
                    </button>
                  </div>
                )}

                {visita.status === 'pausada' && (
                  <button onClick={() => mudarStatus('em_andamento')} disabled={processando} className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-50">
                    ▶️ Retomar Atendimento
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 3. PRANCHETA DE EXECUÇÃO (WIZARD) ── */}
        {visita.status !== 'agendada' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            
            <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto hide-scrollbar">
              {[{ id: 'anotacoes', label: '📝 Anotações', bg: 'bg-yellow-50' }, { id: 'checklist', label: '✅ Checklist', bg: 'bg-green-50' }, { id: 'fotos', label: '📷 Fotos', bg: 'bg-blue-50' }].map(aba => (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition ${abaAtiva === aba.id ? `border-gray-900 text-gray-900 ${aba.bg}` : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white'}`}
                >
                  {aba.label}
                </button>
              ))}
            </div>

            <div className="p-5 min-h-[300px]">
              {abaAtiva === 'anotacoes' && (
                <div className="space-y-4 animate-in fade-in">
                  <p className="text-sm text-gray-500">Registre o cenário geral encontrado na chegada.</p>
                  <textarea 
                    rows={6} 
                    placeholder="Ex: Quadro elétrico principal apresenta oxidação leve..."
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-3 text-sm outline-none focus:border-gray-900 transition resize-none"
                  />
                  <button className="bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-200 w-full md:w-auto">Salvar anotação</button>
                </div>
              )}

              {abaAtiva === 'checklist' && (
                <div className="space-y-4 animate-in fade-in flex flex-col items-center justify-center text-center h-full pt-10">
                  <span className="text-4xl mb-2">📋</span>
                  <p className="text-sm font-medium text-gray-900">Módulo de Checklist Estruturado</p>
                  <p className="text-xs text-gray-500 max-w-xs">Aqui entrarão as perguntas dinâmicas (Conforme/Não Conforme) do laudo.</p>
                </div>
              )}

              {abaAtiva === 'fotos' && (
                <div className="space-y-4 animate-in fade-in flex flex-col items-center justify-center text-center h-full pt-10">
                  <span className="text-4xl mb-2">📸</span>
                  <p className="text-sm font-medium text-gray-900">Evidências Fotográficas</p>
                  <button className="mt-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium px-6 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm">
                    + Tirar Foto
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}