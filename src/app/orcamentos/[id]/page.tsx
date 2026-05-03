'use client'
// src/app/orcamentos/[id]/page.tsx

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Toaster, toast } from 'sonner'

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
const formatarData = (iso?: string) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '-'

export default function OrcamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [carregando, setCarregando] = useState(true)
  const [orcamento, setOrcamento] = useState<any>(null)
  const [itens, setItens] = useState<any[]>([])
  
  const [atualizandoStatus, setAtualizandoStatus] = useState(false)
  const [gerandoOS, setGerandoOS] = useState(false)

  useEffect(() => {
    async function carregarDados() {
      try {
        const { data: orcData, error: orcError } = await supabase.from('orcamentos').select(`*, clientes (*)`).eq('id', id).single()
        if (orcError) throw orcError
        setOrcamento(orcData)

        const { data: itensData, error: itensError } = await supabase.from('orcamento_itens').select('*').eq('orcamento_id', id).order('created_at', { ascending: true })
        if (itensError) throw itensError
        setItens(itensData || [])
      } catch (error) {
        toast.error("Erro ao carregar o orçamento.")
      } finally {
        setCarregando(false)
      }
    }
    carregarDados()
  }, [id])

  // ─── 1. MUDAR STATUS ───
  const alterarStatus = async (novoStatus: string) => {
    setAtualizandoStatus(true)
    try {
      const { error } = await supabase.from('orcamentos').update({ status: novoStatus }).eq('id', id)
      if (error) throw error
      setOrcamento({ ...orcamento, status: novoStatus })
      toast.success(`Status alterado para: ${novoStatus.toUpperCase()}`)
    } catch (error) {
      toast.error("Erro ao atualizar status.")
    } finally {
      setAtualizandoStatus(false)
    }
  }

  // ─── 2. EXPORTAR PARA COTAÇÃO (WhatsApp) ───
  const copiarListaParaCotacao = () => {
    if (itens.length === 0) {
      toast.error("Não há materiais para cotar.")
      return
    }

    let texto = `*Cotação de Materiais - LaudoTech*\nRef: ${orcamento.titulo}\n\nOlá, gostaria de cotar os seguintes itens:\n\n`
    itens.forEach((item, index) => {
      texto += `${index + 1}. ${item.descricao} - ${item.quantidade} ${item.unidade}\n`
    })
    texto += `\nFico no aguardo dos valores e prazo de entrega. Obrigado!`

    navigator.clipboard.writeText(texto)
    toast.success("Lista copiada! É só colar no WhatsApp do fornecedor.")
  }

  // ─── 3. TRANSFORMAR EM VISITA (OS) ───
  const transformarEmVisita = async () => {
    setGerandoOS(true)
    try {
      // Cria a visita vinculando o ID do orçamento
      const payloadVisita = {
        cliente_id: orcamento.cliente_id,
        orcamento_id: orcamento.id, // O Elo Perdido!
        tipo: 'Serviço',
        status: 'agendada',
        data_agendada: new Date().toISOString(),
        tecnico_nome: 'Slengman Engenharia', // Nome do seu pai ou da empresa
        dados_vistoria: {
          resumo: `Serviço oriundo do orçamento: ${orcamento.titulo}\n\nEscopo:\n${orcamento.escopo}`
        }
      }

      const { data, error } = await supabase.from('visitas').insert([payloadVisita]).select().single()
      if (error) throw error

      toast.success("Ordem de Serviço (Visita) criada com sucesso!")
      setTimeout(() => router.push(`/visitas/${data.id}`), 1500) // Manda ele direto pra prancheta!
    } catch (error) {
      toast.error("Erro ao criar Ordem de Serviço.")
      console.error(error)
    } finally {
      setGerandoOS(false)
    }
  }

  
  if (carregando) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">Carregando proposta comercial...</div>
  if (!orcamento) return <div className="p-10 text-center text-gray-700">Orçamento não encontrado.</div>

  const fin = orcamento.dados_financeiros?.totaisCalculados || {}
  const codigoOrcamento = `ORC-${String(orcamento.id).split('-')[0].toUpperCase()}`

  return (
    <div className="min-h-screen bg-gray-200 py-8 print:py-0 print:bg-white font-sans text-gray-900">
      <Toaster position="top-right" richColors />

      {/* ── PAINEL DE CONTROLE CRM (Invisível no PDF) ── */}
      <div className="max-w-[21cm] mx-auto mb-6 print:hidden space-y-4">
        
        <div className="flex justify-between items-center bg-white rounded-xl shadow-sm border border-gray-300 p-4">
          <Link href="/orcamentos" className="text-sm font-bold text-gray-600 hover:text-gray-900 transition flex items-center gap-2">← Voltar ao Funil</Link>
          <div className="flex gap-3">
            {itens.length > 0 && (
              <button onClick={copiarListaParaCotacao} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition shadow-sm flex items-center gap-2">
                📋 Cotar Materiais
              </button>
            )}
            <button onClick={() => window.print()} className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition shadow-md flex items-center gap-2">
              🖨️ Gerar PDF da Proposta
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-300 p-5">
          <div className="mb-4 border-b border-gray-100 pb-3 flex justify-between items-end">
            <div>
              <h2 className="font-black text-gray-900 text-sm uppercase tracking-widest">Acompanhamento Comercial (Status)</h2>
              <p className="text-xs text-gray-500 mt-1">Atualize em que fase está a negociação com o cliente.</p>
            </div>
            
            {/* O BOTÃO MÁGICO SÓ APARECE QUANDO APROVADO */}
            {orcamento.status === 'aprovado' && (
              <button onClick={transformarEmVisita} disabled={gerandoOS} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-sm flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                {gerandoOS ? 'Criando OS...' : '🛠️ Gerar Ordem de Serviço (Visita)'}
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button onClick={() => alterarStatus('rascunho')} disabled={atualizandoStatus || orcamento.status === 'rascunho'} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition ${orcamento.status === 'rascunho' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>📝 Rascunho</button>
            <button onClick={() => alterarStatus('enviado')} disabled={atualizandoStatus || orcamento.status === 'enviado'} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition ${orcamento.status === 'enviado' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}>📤 Enviado</button>
            <button onClick={() => alterarStatus('analise')} disabled={atualizandoStatus || orcamento.status === 'analise'} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition ${orcamento.status === 'analise' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50'}`}>⏳ Em Análise</button>
            <button onClick={() => alterarStatus('aprovado')} disabled={atualizandoStatus || orcamento.status === 'aprovado'} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition ${orcamento.status === 'aprovado' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-700 border-green-200 hover:bg-green-50'}`}>✅ Aprovado</button>
            <button onClick={() => alterarStatus('recusado')} disabled={atualizandoStatus || orcamento.status === 'recusado'} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition ${orcamento.status === 'recusado' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-200 hover:bg-red-50'}`}>❌ Recusado</button>
          </div>
        </div>
      </div>

      {/* ── FOLHA A4 (PDF) FICA AQUI (Igual a que já tínhamos) ── */}
      <div className="max-w-[21cm] mx-auto bg-white p-10 md:p-14 shadow-xl print:shadow-none print:p-0 print:max-w-full">
        
        {/* CABEÇALHO */}
        <header className="border-b-2 border-gray-900 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase">Proposta Comercial</h1>
            <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-wide">Ref: {orcamento.titulo}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-gray-900">LaudoTech</h2>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">{codigoOrcamento}</p>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Data: {formatarData(orcamento.created_at)}</p>
          </div>
        </header>

        {/* 1. DADOS DO CLIENTE */}
        <section className="mb-8 break-inside-avoid">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 mb-3">1. Dados do Cliente</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm bg-gray-50 p-4 rounded-lg print:bg-transparent print:p-0 print:border-none border border-gray-200">
            <div><span className="font-semibold text-gray-500 uppercase text-xs mr-2">Cliente:</span><span className="font-medium text-gray-900">{orcamento.clientes?.nome}</span></div>
            <div><span className="font-semibold text-gray-500 uppercase text-xs mr-2">CNPJ/CPF:</span><span className="font-medium text-gray-900">{orcamento.clientes?.documento || 'N/A'}</span></div>
            <div className="col-span-2"><span className="font-semibold text-gray-500 uppercase text-xs mr-2">Endereço:</span><span className="font-medium text-gray-900">{orcamento.clientes?.endereco || 'N/A'}</span></div>
            <div><span className="font-semibold text-gray-500 uppercase text-xs mr-2">Contato:</span><span className="font-medium text-gray-900">{orcamento.clientes?.contato_nome || 'N/A'}</span></div>
            <div><span className="font-semibold text-gray-500 uppercase text-xs mr-2">Telefone:</span><span className="font-medium text-gray-900">{orcamento.clientes?.telefone || 'N/A'}</span></div>
          </div>
        </section>

        {/* 2. ESCOPO */}
        <section className="mb-8 break-inside-avoid">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 mb-3">2. Escopo do Serviço</h3>
          <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {orcamento.escopo || 'Nenhum escopo detalhado foi informado para esta proposta.'}
          </div>
        </section>

        {/* 3. LISTA DE MATERIAIS (Só aparece se tiver material) */}
        {itens.length > 0 && (
          <section className="mb-10 break-inside-avoid">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 mb-3">3. Lista de Materiais Previstos</h3>
            <table className="w-full text-sm text-left border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-3 py-2 font-bold text-gray-700 uppercase tracking-wider text-xs">Item</th>
                  <th className="border border-gray-300 px-3 py-2 font-bold text-gray-700 uppercase tracking-wider text-xs w-20 text-center">Qtd</th>
                  <th className="border border-gray-300 px-3 py-2 font-bold text-gray-700 uppercase tracking-wider text-xs w-28 text-right">Unitário</th>
                  <th className="border border-gray-300 px-3 py-2 font-bold text-gray-700 uppercase tracking-wider text-xs w-32 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, i) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 px-3 py-2 text-gray-800">{i + 1}. {item.descricao}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-700">{item.quantidade} {item.unidade}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-gray-700">{formatarMoeda(item.preco_unitario)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right font-medium text-gray-900">{formatarMoeda(item.quantidade * item.preco_unitario)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* 4. INVESTIMENTO */}
        <section className="mb-10 break-inside-avoid">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 mb-3">
            {itens.length > 0 ? '4. Investimento e Custos' : '3. Investimento'}
          </h3>
          
          <table className="w-full text-sm text-left border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-4 py-2.5 font-bold text-gray-700 uppercase tracking-wider text-xs">Descrição Comercial</th>
                <th className="border border-gray-300 px-4 py-2.5 font-bold text-gray-700 uppercase tracking-wider text-xs w-48 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-3 font-medium text-gray-800">Mão de Obra Especializada (Estimativa: {orcamento.dados_financeiros?.horasEstimadas}h)</td>
                <td className="border border-gray-300 px-4 py-3 text-right font-medium">{formatarMoeda(fin.subtotalMaoDeObra)}</td>
              </tr>
              {fin.totalAcrescimos > 0 && (
                <tr>
                  <td className="border border-gray-300 px-4 py-3 text-gray-700">Adicionais Técnicos / Riscos Operacionais</td>
                  <td className="border border-gray-300 px-4 py-3 text-right">{formatarMoeda(fin.totalAcrescimos)}</td>
                </tr>
              )}
              {fin.totalMateriais > 0 && (
                <tr>
                  <td className="border border-gray-300 px-4 py-3 text-gray-700">Fornecimento de Peças e Materiais</td>
                  <td className="border border-gray-300 px-4 py-3 text-right">{formatarMoeda(fin.totalMateriais)}</td>
                </tr>
              )}
              {fin.totalCustosOp > 0 && (
                <tr>
                  <td className="border border-gray-300 px-4 py-3 text-gray-700">Custos de Mobilização e Logística Fixa</td>
                  <td className="border border-gray-300 px-4 py-3 text-right">{formatarMoeda(fin.totalCustosOp)}</td>
                </tr>
              )}
              {fin.valorDescontado > 0 && (
                <tr className="bg-green-50/50 print:bg-transparent">
                  <td className="border border-gray-300 px-4 py-3 font-bold text-green-800">Desconto Comercial Aplicado</td>
                  <td className="border border-gray-300 px-4 py-3 text-right font-bold text-green-700">- {formatarMoeda(fin.valorDescontado)}</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-900 text-white">
              <tr>
                <td className="border border-gray-900 px-4 py-4 font-black uppercase tracking-wider">Valor Total da Proposta</td>
                <td className="border border-gray-900 px-4 py-4 font-black text-right text-xl">{formatarMoeda(fin.totalGeral)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* 5. TERMOS COMERCIAIS */}
        <section className="mb-10 bg-gray-50 border border-gray-200 p-5 rounded-lg text-xs text-gray-600 space-y-2 break-inside-avoid print:bg-white print:border-gray-400">
          <p><span className="font-bold text-gray-900">Validade da Proposta:</span> 15 dias a partir da data de emissão.</p>
          <p><span className="font-bold text-gray-900">Condições de Pagamento:</span> A combinar mediante aprovação deste orçamento.</p>
          <p><span className="font-bold text-gray-900">Prazos de Execução:</span> O cronograma será definido em conjunto após o aceite comercial.</p>
          <p><span className="font-bold text-gray-900">Garantia Técnica:</span> 90 dias sobre a mão de obra executada (não cobre mau uso ou picos de tensão).</p>
        </section>

        {/* RODAPÉ DE ASSINATURA */}
        <footer className="mt-28 flex justify-between text-center break-inside-avoid">
          <div className="w-64">
            <div className="border-t border-gray-900 w-full pt-2">
              <p className="text-sm font-bold text-gray-900">Slengman Engenharia</p>
              <p className="text-xs text-gray-500 uppercase mt-0.5">Responsável Técnico</p>
            </div>
          </div>
          <div className="w-64">
            <div className="border-t border-gray-900 w-full pt-2">
              <p className="text-sm font-bold text-gray-900">{orcamento.clientes?.nome || 'Cliente Responsável'}</p>
              <p className="text-xs text-gray-500 uppercase mt-0.5">De acordo / Aceite da Proposta</p>
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}