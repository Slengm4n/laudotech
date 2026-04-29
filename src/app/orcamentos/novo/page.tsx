'use client'
// src/app/orcamentos/novo/page.tsx

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Toaster, toast } from 'sonner'

// ─── INTERFACES (Tipagem Forte) ───
interface Cliente {
  id: string
  nome: string
}

interface MaterialItem {
  id: string // ID temporário para o React renderizar as listas
  descricao: string
  quantidade: number
  preco_unitario: number
  unidade: string
}

interface CustosOperacionais {
  deslocamento: number
  alimentacao: number
  hospedagem: number
}

interface AdicionaisRisco {
  altura: boolean
  insalubridade: boolean
  urgencia: boolean
}

// ─── HELPERS ───
const formatarMoeda = (valor: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export default function NovoOrcamentoPage() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])

  // ─── ESTADOS DO FORMULÁRIO ───
  const [clienteId, setClienteId] = useState<string>('')
  const [titulo, setTitulo] = useState<string>('')
  const [escopo, setEscopo] = useState<string>('')

  const [materiais, setMateriais] = useState<MaterialItem[]>([])
  
  const [valorHora, setValorHora] = useState<number>(150)
  const [horasEstimadas, setHorasEstimadas] = useState<number>(4)
  
  const [custosOp, setCustosOp] = useState<CustosOperacionais>({ deslocamento: 0, alimentacao: 0, hospedagem: 0 })
  const [adicionais, setAdicionais] = useState<AdicionaisRisco>({ altura: false, insalubridade: false, urgencia: false })

  // ─── CARREGAMENTO DE DADOS ───
  useEffect(() => {
    async function carregarClientes() {
      const { data, error } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome')
      if (data && !error) setClientes(data)
    }
    carregarClientes()
  }, [])

  // ─── GERENCIAMENTO DA LISTA (BOM) ───
  const adicionarMaterial = () => {
    setMateriais(prev => [...prev, { id: crypto.randomUUID(), descricao: '', quantidade: 1, preco_unitario: 0, unidade: 'un' }])
  }

  const removerMaterial = (id: string) => {
    setMateriais(prev => prev.filter(m => m.id !== id))
  }

  const atualizarMaterial = (id: string, campo: keyof MaterialItem, valor: any) => {
    setMateriais(prev => prev.map(m => m.id === id ? { ...m, [campo]: valor } : m))
  }

  // ─── MOTOR DE CÁLCULO BLINDADO (useMemo) ───
  // Recalcula apenas quando os estados financeiros mudam, salvando processamento.
  const totais = useMemo(() => {
    const totalMateriais = materiais.reduce((acc, m) => acc + (m.quantidade * m.preco_unitario), 0)
    const subtotalMaoDeObra = valorHora * horasEstimadas
    
    let percentualAcrescimo = 0
    if (adicionais.altura) percentualAcrescimo += 0.30
    if (adicionais.insalubridade) percentualAcrescimo += 0.20
    if (adicionais.urgencia) percentualAcrescimo += 0.50
    
    const totalAcrescimos = subtotalMaoDeObra * percentualAcrescimo
    const totalCustosOp = Number(custosOp.deslocamento) + Number(custosOp.alimentacao) + Number(custosOp.hospedagem)
    
    const totalGeral = subtotalMaoDeObra + totalAcrescimos + totalMateriais + totalCustosOp

    return { totalMateriais, subtotalMaoDeObra, totalAcrescimos, totalCustosOp, totalGeral }
  }, [materiais, valorHora, horasEstimadas, custosOp, adicionais])

  // ─── SALVAMENTO RELACIONAL NO BANCO ───
  const handleSalvar = async () => {
    if (!clienteId || !titulo) {
      toast.error("Obrigatório selecionar um cliente e informar o título.")
      return
    }

    setSalvando(true)
    try {
      // 1. Salva o Orçamento "Pai"
      const payloadOrcamento = {
        cliente_id: clienteId,
        titulo: titulo,
        escopo: escopo,
        status: 'rascunho', 
        dados_financeiros: {
          valorHora,
          horasEstimadas,
          custosOperacionais: custosOp,
          adicionaisRisco: adicionais,
          totaisCalculados: totais
        }
      }

      const { data: orcamentoInserido, error: erroOrcamento } = await supabase
        .from('orcamentos')
        .insert([payloadOrcamento])
        .select()
        .single()

      if (erroOrcamento) throw erroOrcamento

      // 2. Salva os Itens Relacionais (Se houver materiais)
      if (materiais.length > 0 && orcamentoInserido) {
        const payloadItens = materiais.map(m => ({
          orcamento_id: orcamentoInserido.id,
          descricao: m.descricao,
          quantidade: m.quantidade,
          preco_unitario: m.preco_unitario,
          unidade: m.unidade,
          categoria: 'geral'
        }))

        const { error: erroItens } = await supabase.from('orcamento_itens').insert(payloadItens)
        if (erroItens) throw erroItens
      }

      toast.success("Orçamento estruturado com sucesso!")
      setTimeout(() => router.push('/orcamentos'), 1500)
    } catch (error) {
      console.error(error)
      toast.error("Erro interno ao processar o orçamento.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Toaster position="top-right" richColors />

      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/orcamentos" className="text-gray-500 hover:text-gray-900 transition font-medium text-sm">← Voltar</Link>
            <div className="h-4 w-px bg-gray-300"></div>
            <span className="text-base font-bold text-gray-900">Novo Orçamento Técnico</span>
          </div>
          <button onClick={handleSalvar} disabled={salvando} className="bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-green-800 transition disabled:opacity-50 shadow-sm">
            {salvando ? 'Processando...' : '💾 Salvar Proposta'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA: FORMULÁRIO */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5">1. Identificação</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Cliente *</label>
                <select value={clienteId} onChange={e => setClienteId(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition">
                  <option value="">Selecione o Cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Título do Serviço / Proposta *</label>
                <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Reforma do QGBT - Painel Principal" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Escopo Técnico (Descritivo)</label>
                <textarea rows={3} value={escopo} onChange={e => setEscopo(e.target.value)} placeholder="Descreva os serviços que serão executados..." className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 resize-none" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">2. Bill of Materials (BOM)</h2>
              <button onClick={adicionarMaterial} className="text-xs bg-blue-50 text-blue-700 font-bold px-3 py-1.5 rounded-md hover:bg-blue-100 transition">+ Adicionar Material</button>
            </div>
            
            {materiais.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">A lista de materiais está vazia.</p>
            ) : (
              <div className="space-y-3">
                {materiais.map((item, index) => (
                  <div key={item.id} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <span className="text-xs font-bold text-gray-400 w-5 text-center hidden md:block">{index + 1}</span>
                    
                    <input type="text" value={item.descricao} onChange={e => atualizarMaterial(item.id, 'descricao', e.target.value)} placeholder="Item (Ex: Cabo Flexível 10mm)" className="flex-1 min-w-[200px] bg-white border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    
                    <div className="flex gap-2 w-full md:w-auto">
                      <input type="number" value={item.quantidade} onChange={e => atualizarMaterial(item.id, 'quantidade', Number(e.target.value))} placeholder="Qtd" className="w-20 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" />
                      
                      <select value={item.unidade} onChange={e => atualizarMaterial(item.id, 'unidade', e.target.value)} className="w-20 bg-white border border-gray-300 rounded-md px-2 py-2 text-sm outline-none focus:border-blue-500">
                        <option value="un">UN</option>
                        <option value="m">M</option>
                        <option value="kg">KG</option>
                        <option value="cx">CX</option>
                        <option value="rolo">Rolo</option>
                      </select>
                      
                      <input type="number" step="0.01" value={item.preco_unitario} onChange={e => atualizarMaterial(item.id, 'preco_unitario', Number(e.target.value))} placeholder="R$ Unit." className="w-28 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    </div>

                    <div className="w-full md:w-28 text-right text-sm font-bold text-gray-900 mt-2 md:mt-0">
                      {formatarMoeda(item.quantidade * item.preco_unitario)}
                    </div>
                    
                    <button onClick={() => removerMaterial(item.id)} className="w-full md:w-auto text-red-500 hover:bg-red-50 p-2 rounded-md transition mt-2 md:mt-0 border border-transparent hover:border-red-200">🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5">3. Mão de Obra e Logística</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Valor da Hora Técnica (R$)</label>
                <input type="number" value={valorHora} onChange={e => setValorHora(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Horas Estimadas de Execução</label>
                <input type="number" value={horasEstimadas} onChange={e => setHorasEstimadas(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-5 border-t border-gray-100 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Deslocamento (R$)</label>
                <input type="number" value={custosOp.deslocamento} onChange={e => setCustosOp({...custosOp, deslocamento: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Alimentação (R$)</label>
                <input type="number" value={custosOp.alimentacao} onChange={e => setCustosOp({...custosOp, alimentacao: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Hospedagem (R$)</label>
                <input type="number" value={custosOp.hospedagem} onChange={e => setCustosOp({...custosOp, hospedagem: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="pt-5 border-t border-gray-100 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={adicionais.altura} onChange={e => setAdicionais({...adicionais, altura: e.target.checked})} className="w-4 h-4 accent-gray-900" />
                <span className="text-sm font-semibold text-gray-700">Risco NR-35 (+30%)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={adicionais.insalubridade} onChange={e => setAdicionais({...adicionais, insalubridade: e.target.checked})} className="w-4 h-4 accent-gray-900" />
                <span className="text-sm font-semibold text-gray-700">Insalubridade (+20%)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={adicionais.urgencia} onChange={e => setAdicionais({...adicionais, urgencia: e.target.checked})} className="w-4 h-4 accent-gray-900" />
                <span className="text-sm font-semibold text-gray-700">Taxa de Urgência (+50%)</span>
              </label>
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA: CONSOLIDAÇÃO FINANCEIRA */}
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-xl p-7 shadow-xl text-white sticky top-20">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Composição do Preço</h2>
            
            <div className="space-y-4 text-sm font-medium">
              <div className="flex justify-between text-gray-300 pb-2 border-b border-gray-700">
                <span>Mão de Obra ({horasEstimadas}h)</span>
                <span>{formatarMoeda(totais.subtotalMaoDeObra)}</span>
              </div>
              <div className="flex justify-between text-amber-400 pb-2 border-b border-gray-700">
                <span>Adicionais Técnicos</span>
                <span>{formatarMoeda(totais.totalAcrescimos)}</span>
              </div>
              <div className="flex justify-between text-blue-300 pb-2 border-b border-gray-700">
                <span>Materiais (BOM)</span>
                <span>{formatarMoeda(totais.totalMateriais)}</span>
              </div>
              <div className="flex justify-between text-purple-300 pb-2 border-b border-gray-700">
                <span>Custos Logísticos</span>
                <span>{formatarMoeda(totais.totalCustosOp)}</span>
              </div>
            </div>

            <div className="mt-8 pt-6 flex flex-col">
              <span className="text-xs uppercase text-gray-400 font-bold tracking-wider mb-1">Custo Total Projetado</span>
              <span className="text-4xl font-black tracking-tight text-white">{formatarMoeda(totais.totalGeral)}</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}