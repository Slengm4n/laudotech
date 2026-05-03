'use client'
// src/app/visitas/[id]/page.tsx — v3 corrigida

import { useState, useEffect, use, useRef, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/index'
import { Toaster, toast } from 'sonner'
import { useRouter } from 'next/navigation'

// ─── Tipos ──────────────────────────────────────────────────
type StatusItem = 'ok' | 'alerta' | 'falha' | null
type StatusVisita = 'agendada' | 'em_andamento' | 'pausada' | 'concluida'

interface ItemChecklist {
  id: string
  titulo: string
  status: StatusItem
  obs: string
  fotos: string[]
}

interface DadosVistoria {
  itens: ItemChecklist[]
  resumo: string
  fotosGerais: string[]
  tempo_acumulado: number
  ultimo_play: string | null
}

// ─── Helpers ────────────────────────────────────────────────
function formatarCronometro(totalSeg: number) {
  const h = Math.floor(totalSeg / 3600).toString().padStart(2, '0')
  const m = Math.floor((totalSeg % 3600) / 60).toString().padStart(2, '0')
  const s = (totalSeg % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

function formatarHora(iso?: string) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fileParaBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function segundosDesdePlay(ultimoPlay: string | null): number {
  if (!ultimoPlay) return 0
  return Math.floor((Date.now() - new Date(ultimoPlay).getTime()) / 1000)
}

const STATUS_CORES: Record<StatusVisita, string> = {
  agendada:     'bg-blue-50 text-blue-700 border-blue-200',
  em_andamento: 'bg-purple-50 text-purple-700 border-purple-200',
  pausada:      'bg-amber-50 text-amber-700 border-amber-200',
  concluida:    'bg-green-50 text-green-700 border-green-200',
}

const STATUS_LABEL: Record<StatusVisita, string> = {
  agendada:     'Agendada',
  em_andamento: 'Em andamento',
  pausada:      'Pausada',
  concluida:    'Concluída',
}

// ─── Componente ──────────────────────────────────────────────
export default function DetalhesVisitaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)

  const [carregando, setCarregando]   = useState(true)
  const [processando, setProcessando] = useState(false)
  const [salvando, setSalvando]       = useState(false)
  const [visita, setVisita]           = useState<any>(null)
  const [aba, setAba]                 = useState<'checklist' | 'fotos' | 'resumo'>('checklist')
  const [novoItem, setNovoItem]       = useState('')

  const [itens, setItens]             = useState<ItemChecklist[]>([])
  const [fotosGerais, setFotosGerais] = useState<string[]>([])
  const [resumo, setResumo]           = useState('')

  const tempoAcumRef  = useRef(0)
  const ultimoPlayRef = useRef<string | null>(null)
  const statusRef     = useRef<StatusVisita>('agendada')
  const [displaySeg, setDisplaySeg] = useState(0)

  const dadosRef = useRef<{ itens: ItemChecklist[]; resumo: string; fotosGerais: string[] }>({
    itens: [], resumo: '', fotosGerais: [],
  })

  // ─── 1. Carregar visita ──────────────────────────────────
  useEffect(() => {
    async function carregar() {
      try {
        const { data, error } = await supabase
          .from('visitas')
          .select('*, clientes(nome, endereco, telefone, contato_nome)')
          .eq('id', id)
          .single()

        if (error) throw error
        setVisita(data)
        statusRef.current = data.status

        const dv: Partial<DadosVistoria> = data.dados_vistoria ?? {}
        const itensCarregados = dv.itens            ?? []
        const resumoCarregado = dv.resumo            ?? ''
        const fotosCarregadas = dv.fotosGerais       ?? []
        const tempoCarregado  = dv.tempo_acumulado   ?? 0
        const playCarregado   = dv.ultimo_play        ?? null

        setItens(itensCarregados)
        setResumo(resumoCarregado)
        setFotosGerais(fotosCarregadas)

        tempoAcumRef.current  = tempoCarregado
        ultimoPlayRef.current = playCarregado
        dadosRef.current      = { itens: itensCarregados, resumo: resumoCarregado, fotosGerais: fotosCarregadas }

        setDisplaySeg(tempoCarregado + segundosDesdePlay(playCarregado))
      } catch {
        toast.error('Visita não encontrada.')
        router.push('/dashboard')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [id, router])

  // ─── 2. Ticker do cronômetro ─────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      if (statusRef.current !== 'em_andamento') return
      const total = tempoAcumRef.current + segundosDesdePlay(ultimoPlayRef.current)
      setDisplaySeg(total)
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  // ─── 3. Autosave a cada 30s ──────────────────────────────
  useEffect(() => {
    const autosave = setInterval(async () => {
      if (!visita?.id || statusRef.current === 'agendada') return
      try {
        const payload: DadosVistoria = {
          ...dadosRef.current,
          tempo_acumulado: tempoAcumRef.current + segundosDesdePlay(ultimoPlayRef.current),
          ultimo_play: ultimoPlayRef.current,
        }
        await supabase.from('visitas').update({ dados_vistoria: payload }).eq('id', visita.id)
        toast.info('Rascunho salvo automaticamente', { duration: 1500 })
      } catch {
        // silencia
      }
    }, 30_000)
    return () => clearInterval(autosave)
  }, [visita?.id])

  useEffect(() => { dadosRef.current = { itens, resumo, fotosGerais } }, [itens, resumo, fotosGerais])

  // ─── 4. Mudança de status ────────────────────────────────
  const mudarStatus = useCallback(async (novoStatus: StatusVisita) => {
    setProcessando(true)
    const agora = new Date().toISOString()

    let novoTempoAcum = tempoAcumRef.current
    let novoUltimoPlay: string | null = ultimoPlayRef.current

    if (novoStatus === 'em_andamento') {
      novoUltimoPlay = agora
    } else {
      novoTempoAcum += segundosDesdePlay(ultimoPlayRef.current)
      novoUltimoPlay = null
    }

    const dadosVistoria: DadosVistoria = {
      ...dadosRef.current,
      tempo_acumulado: novoTempoAcum,
      ultimo_play: novoUltimoPlay,
    }

    const atualizacoes: Record<string, any> = {
      status: novoStatus,
      dados_vistoria: dadosVistoria,
    }
    if (novoStatus === 'em_andamento' && !visita.iniciado_em) atualizacoes.iniciado_em = agora
    if (novoStatus === 'concluida') atualizacoes.finalizado_em = agora

    try {
      const { error } = await supabase.from('visitas').update(atualizacoes).eq('id', visita.id)
      if (error) throw error

      tempoAcumRef.current  = novoTempoAcum
      ultimoPlayRef.current = novoUltimoPlay
      statusRef.current     = novoStatus

      setDisplaySeg(novoTempoAcum + segundosDesdePlay(novoUltimoPlay))
      setVisita((v: any) => ({ ...v, ...atualizacoes }))

      const msgs: Record<string, string> = {
        em_andamento: 'Vistoria rodando! ⏱️',
        pausada:      'Pausada. Tempo salvo com segurança.',
        concluida:    'Vistoria finalizada com sucesso! ✅',
      }
      toast.success(msgs[novoStatus])
    } catch {
      toast.error('Erro ao atualizar status. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }, [visita])

  // ─── 5. Salvar manualmente ───────────────────────────────
  const salvarProgresso = useCallback(async () => {
    setSalvando(true)
    try {
      const payload: DadosVistoria = {
        ...dadosRef.current,
        tempo_acumulado: tempoAcumRef.current + segundosDesdePlay(ultimoPlayRef.current),
        ultimo_play: ultimoPlayRef.current,
      }
      const { error } = await supabase.from('visitas').update({ dados_vistoria: payload }).eq('id', visita.id)
      if (error) throw error
      toast.success('Anotações salvas! 💾')
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }, [visita?.id])

  // ─── Checklist ───────────────────────────────────────────
  function adicionarItem(e: React.FormEvent) {
    e.preventDefault()
    if (!novoItem.trim()) return
    setItens(prev => [...prev, { id: crypto.randomUUID(), titulo: novoItem.trim(), status: null, obs: '', fotos: [] }])
    setNovoItem('')
  }

  function atualizarItem(itemId: string, campo: keyof ItemChecklist, valor: any) {
    setItens(prev => prev.map(i => i.id === itemId ? { ...i, [campo]: valor } : i))
  }

  function removerItem(itemId: string) {
    setItens(prev => prev.filter(i => i.id !== itemId))
  }

  async function addFotoItem(itemId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await fileParaBase64(file)
    const item = itens.find(i => i.id === itemId)
    if (item) atualizarItem(itemId, 'fotos', [...(item.fotos ?? []), b64])
    e.target.value = ''
  }

  function removerFotoItem(itemId: string, idx: number) {
    const item = itens.find(i => i.id === itemId)
    if (item) atualizarItem(itemId, 'fotos', item.fotos.filter((_, i) => i !== idx))
  }

  async function addFotoGeral(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await fileParaBase64(file)
    setFotosGerais(prev => [...prev, b64])
    e.target.value = ''
  }

  const totalOk     = itens.filter(i => i.status === 'ok').length
  const totalAlerta = itens.filter(i => i.status === 'alerta').length
  const totalFalha  = itens.filter(i => i.status === 'falha').length

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Carregando vistoria...</p>
      </div>
    )
  }
  if (!visita) return null

  const status: StatusVisita = visita.status
  const estaRodando   = status === 'em_andamento'
  const podeTrabalhrar = status !== 'agendada'
  const concluida     = status === 'concluida'

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Toaster position="top-right" richColors />

      {/* ── Navbar ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-900 text-sm transition">← Voltar</Link>
            <span className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">
              {visita.clientes?.nome}
            </span>
          </div>
          <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md font-bold border ${STATUS_CORES[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ── Painel de controle ── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 space-y-4">

            {status === 'agendada' && (
              <button
                onClick={() => mudarStatus('em_andamento')}
                disabled={processando}
                className="w-full bg-gray-900 text-white rounded-xl py-4 text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-50 flex justify-center items-center gap-2"
              >
                ▶️ Iniciar Vistoria Agora
              </button>
            )}

            {podeTrabalhrar && (
              <>
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="text-center flex-1 border-r border-gray-200 pr-4">
                    <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Início</p>
                    <p className="text-base font-mono font-semibold text-gray-800">{formatarHora(visita.iniciado_em)}</p>
                  </div>
                  <div className="text-center flex-1 px-4">
                    <p className="text-[10px] text-gray-500 uppercase font-medium tracking-wide mb-1">Tempo total</p>
                    <p className={`text-3xl font-mono font-bold tabular-nums transition-colors ${estaRodando ? 'text-blue-600' : 'text-gray-900'}`}>
                      {formatarCronometro(displaySeg)}
                    </p>
                    {estaRodando && (
                      <p className="text-[10px] text-blue-400 mt-1 animate-pulse">● gravando</p>
                    )}
                  </div>
                  <div className="text-center flex-1 border-l border-gray-200 pl-4">
                    <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Fim</p>
                    <p className="text-base font-mono font-semibold text-gray-800">{formatarHora(visita.finalizado_em)}</p>
                  </div>
                </div>

                {!concluida && (
                  <div className="flex gap-3">
                    {estaRodando ? (
                      <>
                        <button
                          onClick={() => mudarStatus('pausada')}
                          disabled={processando}
                          className="flex-1 bg-white border border-amber-300 text-amber-700 rounded-lg py-3 text-sm font-bold hover:bg-amber-50 transition disabled:opacity-50"
                        >
                          ⏸️ Pausar
                        </button>
                        <button
                          onClick={() => mudarStatus('concluida')}
                          disabled={processando}
                          className="flex-[2] bg-gray-900 text-white rounded-lg py-3 text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-50 shadow-sm"
                        >
                          ✅ Finalizar Vistoria
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => mudarStatus('em_andamento')}
                        disabled={processando}
                        className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
                      >
                        ▶️ Retomar Trabalho
                      </button>
                    )}
                  </div>
                )}

                {/* FIX: rota corrigida de /laudos/novo?visita=X para /visitas/[id]/laudo */}
                {concluida && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-green-800">Vistoria concluída!</p>
                      <p className="text-xs text-green-600 mt-0.5">Agora você pode gerar o laudo técnico.</p>
                    </div>
                    <Link
                      href={`/visitas/${visita.id}/laudo`}
                      className="bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition font-medium whitespace-nowrap"
                    >
                      Gerar laudo →
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Prancheta de execução ── */}
        {podeTrabalhrar && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

            <div className="flex border-b border-gray-200 bg-gray-50">
              {[
                { id: 'checklist' as const, label: '✅ Inspeção' },
                { id: 'fotos'     as const, label: '📷 Fotos gerais' },
                { id: 'resumo'    as const, label: '📝 Resumo' },
              ].map(a => (
                <button
                  key={a.id}
                  onClick={() => setAba(a.id)}
                  className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    aba === a.id
                      ? 'border-gray-900 text-gray-900 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>

            <div className="p-5 min-h-[400px]">

              {/* ── ABA: CHECKLIST ── */}
              {aba === 'checklist' && (
                <div className="space-y-5">
                  {itens.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-green-50 border border-green-200 rounded-lg py-2">
                        <p className="font-bold text-green-700 text-lg">{totalOk}</p>
                        <p className="text-green-600">OK</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg py-2">
                        <p className="font-bold text-amber-700 text-lg">{totalAlerta}</p>
                        <p className="text-amber-600">Atenção</p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg py-2">
                        <p className="font-bold text-red-700 text-lg">{totalFalha}</p>
                        <p className="text-red-600">Falha</p>
                      </div>
                    </div>
                  )}

                  {!concluida && (
                    <form onSubmit={adicionarItem} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: Painel elétrico principal..."
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:bg-white transition"
                        value={novoItem}
                        onChange={e => setNovoItem(e.target.value)}
                      />
                      <button
                        type="submit"
                        disabled={!novoItem.trim()}
                        className="bg-gray-900 text-white px-4 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition"
                      >
                        + Add
                      </button>
                    </form>
                  )}

                  {itens.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <span className="text-4xl block mb-3">📋</span>
                      <p className="text-sm">Adicione os itens a serem avaliados.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {itens.map((item, idx) => (
                        <div
                          key={item.id}
                          className={`border rounded-xl p-4 transition ${
                            item.status === 'ok'     ? 'border-green-200 bg-green-50/30' :
                            item.status === 'alerta' ? 'border-amber-200 bg-amber-50/30' :
                            item.status === 'falha'  ? 'border-red-200 bg-red-50/30'     :
                            'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                              {idx + 1}. {item.titulo}
                            </h3>
                            {!concluida && (
                              <button
                                onClick={() => removerItem(item.id)}
                                className="text-gray-300 hover:text-red-500 transition text-xs shrink-0"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {[
                              { val: 'ok'     as const, label: '✅ OK',      ativo: 'bg-green-100 border-green-400 text-green-800' },
                              { val: 'alerta' as const, label: '⚠️ Atenção', ativo: 'bg-amber-100 border-amber-400 text-amber-800' },
                              { val: 'falha'  as const, label: '❌ Falha',   ativo: 'bg-red-100 border-red-400 text-red-800' },
                            ].map(btn => (
                              <button
                                key={btn.val}
                                disabled={concluida}
                                onClick={() => atualizarItem(item.id, 'status', item.status === btn.val ? null : btn.val)}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                                  item.status === btn.val ? btn.ativo : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                                } disabled:cursor-default`}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>

                          <textarea
                            placeholder="Anotação opcional..."
                            className="w-full mt-3 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900 transition resize-none"
                            rows={2}
                            value={item.obs}
                            disabled={concluida}
                            onChange={e => atualizarItem(item.id, 'obs', e.target.value)}
                          />

                          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2 items-center">
                            {item.fotos?.map((src, i) => (
                              <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200 group">
                                <img src={src} alt={`Evidência ${i + 1} de ${item.titulo}`} className="object-cover w-full h-full" />
                                {!concluida && (
                                  <button
                                    onClick={() => removerFotoItem(item.id, i)}
                                    className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-1 py-0.5 opacity-0 group-hover:opacity-100 transition rounded-bl"
                                  >✕</button>
                                )}
                              </div>
                            ))}
                            {!concluida && (
                              <label className="w-14 h-14 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-gray-600 cursor-pointer transition bg-gray-50">
                                <span className="text-lg">📷</span>
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => addFotoItem(item.id, e)} />
                              </label>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── ABA: FOTOS GERAIS ── */}
              {aba === 'fotos' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Fotos do ambiente, fachada ou contexto geral da vistoria.</p>
                  <div className="flex flex-wrap gap-3">
                    {fotosGerais.map((src, i) => (
                      <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 group">
                        <img src={src} className="object-cover w-full h-full" alt={`Foto geral ${i + 1}`} />
                        {!concluida && (
                          <button
                            onClick={() => setFotosGerais(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow"
                          >✕</button>
                        )}
                      </div>
                    ))}
                    {!concluida && (
                      <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-gray-600 hover:bg-gray-50 cursor-pointer transition">
                        <span className="text-2xl mb-1">📸</span>
                        <span className="text-[10px] font-medium uppercase">Adicionar</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={addFotoGeral} />
                      </label>
                    )}
                  </div>
                  {fotosGerais.length === 0 && !concluida && (
                    <p className="text-xs text-gray-400 text-center py-8">Nenhuma foto adicionada ainda.</p>
                  )}
                </div>
              )}

              {/* ── ABA: RESUMO ── */}
              {aba === 'resumo' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Conclusões gerais que aparecerão no laudo final.</p>

                  {itens.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resumo da inspeção</p>
                      {itens.filter(i => i.status === 'falha').length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-700 mb-1">❌ Falhas encontradas:</p>
                          {itens.filter(i => i.status === 'falha').map(i => (
                            <p key={i.id} className="text-xs text-red-600 pl-3">• {i.titulo}: {i.obs || 'sem observação'}</p>
                          ))}
                        </div>
                      )}
                      {itens.filter(i => i.status === 'alerta').length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-amber-700 mb-1">⚠️ Itens em atenção:</p>
                          {itens.filter(i => i.status === 'alerta').map(i => (
                            <p key={i.id} className="text-xs text-amber-600 pl-3">• {i.titulo}: {i.obs || 'sem observação'}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <textarea
                    rows={8}
                    placeholder="Ex: O local apresenta boas condições gerais, porém foram identificadas falhas no painel elétrico..."
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-900 transition resize-none"
                    value={resumo}
                    disabled={concluida}
                    onChange={e => setResumo(e.target.value)}
                  />
                </div>
              )}
            </div>

            {!concluida && (
              <div className="bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-between">
                <p className="text-xs text-gray-400">Autosave a cada 30 segundos</p>
                <button
                  onClick={salvarProgresso}
                  disabled={salvando}
                  className="bg-white border border-gray-300 text-gray-900 px-5 py-2 rounded-lg text-sm font-semibold hover:border-gray-600 hover:shadow-sm transition disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : '💾 Salvar agora'}
                </button>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}