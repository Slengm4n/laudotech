'use client'
// src/app/visitas/[id]/laudo/page.tsx

import { useState, useEffect, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Toaster, toast } from 'sonner'

// ── Tipos ──────────────────────────────────────────────────────────────────
interface Cliente {
  nome: string
  documento?: string
  endereco?: string
}

interface ItemVistoria {
  id?: string | number
  titulo: string
  status: 'ok' | 'alerta' | 'falha' | null
  obs?: string
  fotos?: string[]
}

interface Visita {
  id: number
  data_agendada?: string
  iniciado_em?: string
  finalizado_em?: string
  tecnico_nome: string
  tecnico_crea?: string
  dados_vistoria?: {
    itens?: ItemVistoria[]
    resumo?: string
  }
  clientes?: Cliente
}

// ── Componente ─────────────────────────────────────────────────────────────
export default function LaudoImpressaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [carregando, setCarregando] = useState(true)
  const [visita, setVisita] = useState<Visita | null>(null)

  // ─── CONFIGURAÇÕES DE IMPRESSÃO (O Segredo do RAT) ───
  const [mostrarFinanceiro, setMostrarFinanceiro] = useState(false)
  const [valorServico, setValorServico] = useState('')
  const [valorMaterial, setValorMaterial] = useState('')
  const [chavePix, setChavePix] = useState('CNPJ: 00.000.000/0001-00')
  const [condicaoPgto, setCondicaoPgto] = useState('À vista na conclusão do serviço')

  useEffect(() => {
    async function carregarDados() {
      try {
        const { data, error } = await supabase
          .from('visitas')
          .select(`*, clientes (*)`)
          .eq('id', id)
          .single()

        if (error) throw error
        setVisita(data as Visita)
      } catch {
        toast.error('Erro ao carregar os dados para o laudo.')
      } finally {
        setCarregando(false)
      }
    }
    carregarDados()
  }, [id])

  const formatarData = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('pt-BR') : '-'

  const formatarHora = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '-'

  // FIX: usar parseFloat em vez de .replace(',', '.') em campo type="number"
  const calcularTotal = () => {
    const servico = parseFloat(valorServico) || 0
    const material = parseFloat(valorMaterial) || 0
    return (servico + material).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const renderStatus = (status: ItemVistoria['status']) => {
    if (status === 'ok')
      return <span className="text-green-600 font-bold uppercase text-xs">✅ Conforme</span>
    if (status === 'alerta')
      return <span className="text-amber-600 font-bold uppercase text-xs">⚠️ Atenção</span>
    if (status === 'falha')
      return <span className="text-red-600 font-bold uppercase text-xs">❌ Falha / Trocado</span>
    return <span className="text-gray-400 font-bold uppercase text-xs">- Não Avaliado -</span>
  }

  if (carregando)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        Gerando documento...
      </div>
    )

  if (!visita)
    return <div className="p-10 text-center">Dados não encontrados.</div>

  const itens: ItemVistoria[] = visita.dados_vistoria?.itens || []
  const resumo: string = visita.dados_vistoria?.resumo || ''

  return (
    <div className="min-h-screen bg-gray-200 py-8 print:py-0 print:bg-white font-sans text-gray-900">
      <Toaster />

      {/* ── PAINEL DE CONFIGURAÇÕES (Invisível no PDF) ── */}
      <div className="max-w-[21cm] mx-auto mb-6 print:hidden">

        <div className="bg-white rounded-xl shadow-sm border border-gray-300 p-5 mb-4">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="font-bold text-gray-900">Configurações do Documento</h2>
              <p className="text-xs text-gray-500">Escolha o que vai aparecer na folha na hora de imprimir.</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 transition">
              <input
                type="checkbox"
                checked={mostrarFinanceiro}
                onChange={(e) => setMostrarFinanceiro(e.target.checked)}
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
              <span className="text-sm font-bold text-blue-900">Transformar em RAT (Mostrar Valores)</span>
            </label>
          </div>

          {mostrarFinanceiro && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mão de Obra (R$)</label>
                {/* FIX: usar parseFloat — o campo type="number" já usa ponto decimal */}
                <input
                  type="number"
                  value={valorServico}
                  onChange={e => setValorServico(e.target.value)}
                  placeholder="Ex: 450.00"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Peças/Materiais (R$)</label>
                <input
                  type="number"
                  value={valorMaterial}
                  onChange={e => setValorMaterial(e.target.value)}
                  placeholder="Ex: 120.00"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Chave PIX</label>
                <input
                  type="text"
                  value={chavePix}
                  onChange={e => setChavePix(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Condição de Pagto</label>
                <input
                  type="text"
                  value={condicaoPgto}
                  onChange={e => setCondicaoPgto(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center px-2">
          <Link
            href={`/laudos`}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-sm"
          >
            ← Voltar à Prancheta
          </Link>
          <button
            onClick={() => window.print()}
            className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition shadow-md print:hidden flex items-center gap-2"
          >
            🖨️ Gerar Laudo Técnico
          </button>
        </div>
      </div>

      {/* ── FOLHA A4 ── */}
      <div className="max-w-[21cm] mx-auto bg-white p-10 md:p-14 shadow-lg print:shadow-none print:p-0 print:max-w-full">

        {/* CABEÇALHO */}
        <header className="border-b-2 border-gray-900 pb-6 mb-8">
          {/* LOGO */}
          <div className="mb-6">
            <Image
              src="/logo_eng_slengman.svg"
              alt="Slengman Engenharia"
              width={280}
              height={70}
              className="object-contain"
            />
          </div>

          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase">
                {mostrarFinanceiro ? 'Relatório de Atendimento' : 'Laudo de Vistoria'}
              </h1>
              <p className="text-sm font-medium text-gray-500 mt-1">
                {mostrarFinanceiro
                  ? 'Documento Técnico e Demonstrativo de Cobrança'
                  : 'Documento Técnico Oficial'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                OS #{String(visita.id).padStart(4, '0')} • {formatarData(visita.data_agendada)}
              </p>
            </div>
          </div>
        </header>

        {/* BLOCO 1: DADOS DO CLIENTE */}
        <section className="mb-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 mb-3">
            1. Identificação do Cliente
          </h3>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <div>
              <span className="text-gray-500 text-xs block">Razão Social / Nome</span>
              <span className="font-semibold">{visita.clientes?.nome}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">CNPJ / CPF</span>
              <span className="font-semibold">{visita.clientes?.documento || 'Não informado'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500 text-xs block">Endereço da Obra/Matriz</span>
              <span className="font-semibold">{visita.clientes?.endereco || 'Não informado'}</span>
            </div>
          </div>
        </section>

        {/* BLOCO 2: DETALHES TÉCNICOS */}
        <section className="mb-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 mb-3">
            2. Dados Operacionais
          </h3>
          <div className="grid grid-cols-4 gap-y-3 gap-x-6 text-sm bg-gray-50 p-4 rounded-lg print:bg-transparent print:p-0 print:border-none border border-gray-200">
            <div className="col-span-2">
              <span className="text-gray-500 text-xs block">Técnico Responsável</span>
              <span className="font-semibold">{visita.tecnico_nome}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500 text-xs block">CREA / Registro</span>
              <span className="font-semibold">{visita.tecnico_crea || 'Não informado'}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">Data</span>
              <span className="font-semibold">{formatarData(visita.iniciado_em)}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">Início</span>
              <span className="font-semibold">{formatarHora(visita.iniciado_em)}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">Término</span>
              <span className="font-semibold">{formatarHora(visita.finalizado_em)}</span>
            </div>
          </div>
        </section>

        {/* BLOCO 3: CHECKLIST */}
        <section className="mb-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 mb-4">
            3. Inspeção e Evidências
          </h3>
          {itens.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Nenhum item registrado.</p>
          ) : (
            <div className="space-y-4">
              {itens.map((item, index) => (
                // FIX: key segura — usa item.id se existir, senão cai para index
                <div
                  key={item.id ?? index}
                  className="break-inside-avoid bg-white border border-gray-200 rounded-lg p-4 print:border-gray-300"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-900 text-sm">
                      {index + 1}. {item.titulo}
                    </h4>
                    {renderStatus(item.status)}
                  </div>
                  {item.obs && (
                    <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-1 print:bg-transparent print:p-0">
                      <span className="font-semibold text-xs text-gray-500 uppercase mr-1">Obs:</span>
                      {item.obs}
                    </div>
                  )}
                  {item.fotos && item.fotos.length > 0 && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {item.fotos.map((foto, i) => (
                        // FIX: usar next/image com alt descritivo
                        <div key={i} className="w-32 h-24 border border-gray-300 rounded overflow-hidden relative">
                          <Image
                            src={foto}
                            alt={`Foto ${i + 1} do item ${item.titulo}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* BLOCO 4: RESUMO */}
        <section className="mb-8 break-inside-avoid">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 mb-3">
            4. Conclusão e Parecer
          </h3>
          <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border border-gray-200 p-4 rounded-lg print:border-none print:p-0">
            {resumo || <span className="text-gray-400 italic">Nenhum resumo foi adicionado.</span>}
          </div>
        </section>

        {/* BLOCO FINANCEIRO */}
        {mostrarFinanceiro && (
          <section className="mb-10 break-inside-avoid bg-gray-50 border border-gray-200 p-5 rounded-xl print:border-gray-900 print:bg-white print:border-2">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">
              5. Acerto Financeiro e Cobrança
            </h3>

            <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-2 text-sm">
              <span className="text-gray-600">Mão de Obra / Serviço Executado</span>
              <span className="font-medium text-gray-900">
                R$ {(parseFloat(valorServico) || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-4 text-sm">
              <span className="text-gray-600">Peças, Materiais e Deslocamento</span>
              <span className="font-medium text-gray-900">
                R$ {(parseFloat(valorMaterial) || 0).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Dados para Pagamento</p>
                <p className="text-sm text-gray-900 mt-1"><strong>PIX:</strong> {chavePix}</p>
                <p className="text-sm text-gray-900"><strong>Condição:</strong> {condicaoPgto}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total a Pagar</p>
                <p className="text-2xl font-black text-gray-900">{calcularTotal()}</p>
              </div>
            </div>
          </section>
        )}

        {/* RODAPÉ */}
        <footer className="mt-16 pt-8 border-t border-gray-200 break-inside-avoid">
          <div className="grid grid-cols-2 gap-16 text-center">
            <div>
              <div className="border-b border-gray-900 w-full mb-2"></div>
              <p className="text-sm font-bold text-gray-900">{visita.tecnico_nome}</p>
              <p className="text-xs text-gray-500">Responsável Técnico</p>
            </div>
            <div>
              <div className="border-b border-gray-900 w-full mb-2"></div>
              <p className="text-sm font-bold text-gray-900">
                {visita.clientes?.nome || 'Cliente / Responsável'}
              </p>
              <p className="text-xs text-gray-500">De acordo / Aceite do Serviço</p>
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}