'use client'
// src/app/proposta/[id]/page.tsx

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import { Toaster, toast } from 'sonner'

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
const formatarData = (iso?: string) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '-'

export default function PropostaPublicaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [carregando, setCarregando] = useState(true)
  const [orcamento, setOrcamento] = useState<any>(null)
  const [itens, setItens] = useState<any[]>([])
  
  // Controle de Assinatura
  const [modalAssinatura, setModalAssinatura] = useState(false)
  const [nomeAssinatura, setNomeAssinatura] = useState('')
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    async function carregarEAtualizarStatus() {
      try {
        // 1. Carrega os dados
        const { data: orcData, error: orcError } = await supabase.from('orcamentos').select(`*, clientes (*)`).eq('id', id).single()
        if (orcError) throw orcError
        
        const { data: itensData } = await supabase.from('orcamento_itens').select('*').eq('orcamento_id', id).order('created_at', { ascending: true })
        
        setOrcamento(orcData)
        setItens(itensData || [])

        // ─── A MÁGICA DA AUTOMAÇÃO (RECIBO DE LEITURA) ───
        // Se o status era "enviado" ou "rascunho" e o cliente abriu o link, muda para "analise" silenciosamente!
        if (orcData.status === 'enviado' || orcData.status === 'rascunho') {
          await supabase.from('orcamentos').update({ status: 'analise' }).eq('id', id)
        }

      } catch (error) {
        console.error(error)
        toast.error("Proposta não encontrada.")
      } finally {
        setCarregando(false)
      }
    }
    carregarEAtualizarStatus()
  }, [id])

  // ─── AÇÕES DO CLIENTE ───
  const aprovarProposta = async () => {
    if (!nomeAssinatura.trim()) {
      toast.error("Por favor, digite seu nome para confirmar a aprovação.")
      return
    }
    
    setProcessando(true)
    try {
      // Atualiza o status para Aprovado e salva quem assinou
      const { error } = await supabase.from('orcamentos').update({ 
        status: 'aprovado',
        dados_financeiros: {
          ...orcamento.dados_financeiros,
          assinatura_cliente: {
            nome: nomeAssinatura,
            data: new Date().toISOString(),
            ip: 'via_link_web' // No futuro podemos pegar o IP real
          }
        }
      }).eq('id', id)

      if (error) throw error
      
      setOrcamento({ ...orcamento, status: 'aprovado' })
      setModalAssinatura(false)
      toast.success("Proposta aprovada com sucesso! Entraremos em contato.")
    } catch (error) {
      toast.error("Erro ao aprovar proposta.")
    } finally {
      setProcessando(false)
    }
  }

  const recusarProposta = async () => {
    if (!confirm("Tem certeza que deseja recusar esta proposta?")) return
    
    setProcessando(true)
    try {
      const { error } = await supabase.from('orcamentos').update({ status: 'recusado' }).eq('id', id)
      if (error) throw error
      setOrcamento({ ...orcamento, status: 'recusado' })
      toast.success("Proposta recusada.")
    } catch (error) {
      toast.error("Erro ao recusar proposta.")
    } finally {
      setProcessando(false)
    }
  }

  if (carregando) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">Carregando documento seguro...</div>
  if (!orcamento) return <div className="p-10 text-center text-gray-700">Proposta indisponível ou expirada.</div>

  const fin = orcamento.dados_financeiros?.totaisCalculados || {}
  const codigoOrcamento = `ORC-${String(orcamento.id).split('-')[0].toUpperCase()}`

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 sm:py-12 font-sans text-gray-900">
      <Toaster position="top-center" richColors />

      {/* Container Principal Mobile-First */}
      <div className="max-w-3xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-200">
        
        {/* CABEÇALHO DA EMPRESA */}
        <div className="bg-gray-900 px-6 py-8 text-center text-white">
          <h1 className="text-2xl font-black tracking-tight uppercase mb-1">Slengman Engenharia</h1>
          <p className="text-gray-400 text-sm font-medium">Proposta Comercial Oficial</p>
          <div className="mt-4 inline-block bg-gray-800 rounded-lg px-4 py-2 border border-gray-700 text-xs text-gray-300">
            {codigoOrcamento} • Emitida em {formatarData(orcamento.created_at)}
          </div>
        </div>

        {/* MENSAGEM DE STATUS */}
        {orcamento.status === 'aprovado' && (
          <div className="bg-green-50 border-b border-green-200 p-4 text-center">
            <span className="text-3xl block mb-2">✅</span>
            <h2 className="font-bold text-green-800">Proposta Aprovada!</h2>
            <p className="text-sm text-green-600 mt-1">Nossa equipe entrará em contato para agendar a execução.</p>
          </div>
        )}
        
        {orcamento.status === 'recusado' && (
          <div className="bg-red-50 border-b border-red-200 p-4 text-center">
            <h2 className="font-bold text-red-800">Proposta Recusada</h2>
            <p className="text-sm text-red-600 mt-1">Agradecemos a oportunidade. Qualquer dúvida, estamos à disposição.</p>
          </div>
        )}

        <div className="p-6 md:p-10 space-y-10">
          
          {/* APRESENTAÇÃO */}
          <div>
            <p className="text-gray-500 text-sm mb-1">Olá, <strong className="text-gray-900">{orcamento.clientes?.nome}</strong>!</p>
            <p className="text-gray-700 text-sm leading-relaxed">Apresentamos abaixo nossa proposta técnica e comercial referente a <strong className="text-gray-900">{orcamento.titulo}</strong>.</p>
          </div>

          {/* ESCOPO */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2 mb-4">Escopo do Serviço</h3>
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed shadow-inner">
              {orcamento.escopo || 'Nenhum escopo detalhado foi informado para esta proposta.'}
            </div>
          </section>

          {/* VALORES E INVESTIMENTO */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2 mb-4">Investimento</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center text-gray-600">
                <span>Mão de Obra Técnica</span>
                <span className="font-medium">{formatarMoeda(fin.subtotalMaoDeObra)}</span>
              </div>
              
              {(fin.totalAcrescimos > 0 || fin.totalCustosOp > 0) && (
                <div className="flex justify-between items-center text-gray-600">
                  <span>Adicionais e Logística</span>
                  <span className="font-medium">{formatarMoeda(fin.totalAcrescimos + fin.totalCustosOp)}</span>
                </div>
              )}
              
              {fin.totalMateriais > 0 && (
                <div className="flex justify-between items-center text-gray-600">
                  <span>Fornecimento de Materiais</span>
                  <span className="font-medium">{formatarMoeda(fin.totalMateriais)}</span>
                </div>
              )}
              
              {fin.valorDescontado > 0 && (
                <div className="flex justify-between items-center text-green-600 font-medium pt-2">
                  <span>Desconto Aplicado</span>
                  <span>- {formatarMoeda(fin.valorDescontado)}</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between items-end">
              <span className="text-xs uppercase text-gray-500 font-bold tracking-wider">Total da Proposta</span>
              <span className="text-3xl font-black text-gray-900">{formatarMoeda(fin.totalGeral)}</span>
            </div>
          </section>

          {/* TERMOS */}
          <section className="bg-gray-50 rounded-xl p-5 border border-gray-200 text-xs text-gray-600 space-y-2">
            <p><span className="font-bold text-gray-900">Validade:</span> 15 dias a partir da emissão.</p>
            <p><span className="font-bold text-gray-900">Pagamento:</span> A combinar mediante aprovação.</p>
            <p><span className="font-bold text-gray-900">Garantia:</span> 90 dias sobre a mão de obra executada.</p>
          </section>

        </div>

        {/* BOTÕES DE AÇÃO (SÓ APARECEM SE ESTIVER EM ANÁLISE/ENVIADO/RASCUNHO) */}
        {(orcamento.status === 'analise' || orcamento.status === 'enviado' || orcamento.status === 'rascunho') && !modalAssinatura && (
          <div className="bg-gray-50 p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => recusarProposta()} disabled={processando} className="w-full sm:w-auto px-6 py-3.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition shadow-sm">
              Recusar Proposta
            </button>
            <button onClick={() => setModalAssinatura(true)} disabled={processando} className="w-full sm:w-auto px-8 py-3.5 bg-green-600 text-white font-black uppercase tracking-wider rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-600/30">
              Aprovar Orçamento
            </button>
          </div>
        )}

        {/* MODAL DE ASSINATURA */}
        {modalAssinatura && (
          <div className="bg-green-50 p-6 md:p-10 border-t border-green-200 animate-in slide-in-from-bottom-4">
            <h3 className="text-lg font-black text-green-900 mb-2">Confirmação de Aceite</h3>
            <p className="text-sm text-green-700 mb-6">Para validar legalmente a aprovação desta proposta de <strong>{formatarMoeda(fin.totalGeral)}</strong>, por favor, confirme seu nome completo abaixo:</p>
            
            <input 
              type="text" 
              value={nomeAssinatura} 
              onChange={e => setNomeAssinatura(e.target.value)} 
              placeholder="Digite seu nome completo..." 
              className="w-full bg-white border border-green-300 rounded-xl px-4 py-3 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 transition mb-4 shadow-sm"
            />
            
            <div className="flex gap-3">
              <button onClick={() => setModalAssinatura(false)} className="px-5 py-3 text-sm font-bold text-green-700 hover:bg-green-100 rounded-lg transition">Cancelar</button>
              <button onClick={aprovarProposta} disabled={processando} className="flex-1 bg-green-700 text-white font-bold rounded-xl hover:bg-green-800 transition shadow-md py-3 flex justify-center items-center gap-2">
                {processando ? 'Processando...' : '✍️ Confirmar Aprovação Eletrônica'}
              </button>
            </div>
            <p className="text-[10px] text-green-600 mt-4 text-center opacity-70">Ao confirmar, você concorda com o escopo e valores apresentados acima. Data e IP serão registrados.</p>
          </div>
        )}

      </div>
    </div>
  )
}