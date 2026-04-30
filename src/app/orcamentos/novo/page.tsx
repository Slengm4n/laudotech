'use client'
// src/app/orcamentos/novo/page.tsx

import { useState, useEffect, useMemo, useRef } from 'react'
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
  id: string
  descricao: string
  quantidade: number | string // Permitir vazio
  preco_unitario: number | string // Permitir vazio
  unidade: string
}

interface CustosOperacionais {
  deslocamento: number | string // Permitir vazio
  alimentacao: number | string // Permitir vazio
  hospedagem: number | string // Permitir vazio
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
  const [buscaCliente, setBuscaCliente] = useState('')
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [clienteId, setClienteId] = useState<string>('')

  const [titulo, setTitulo] = useState<string>('')
  const [escopo, setEscopo] = useState<string>('')

  const [materiais, setMateriais] = useState<MaterialItem[]>([])

  const [valorHora, setValorHora] = useState<number | string>(150)
  const [horasEstimadas, setHorasEstimadas] = useState<number | string>(4)

  // INICIALIZADO VAZIO PARA NÃO APARECER O "0"
  const [custosOp, setCustosOp] = useState<CustosOperacionais>({ deslocamento: '', alimentacao: '', hospedagem: '' })
  const [adicionais, setAdicionais] = useState<AdicionaisRisco>({ altura: false, insalubridade: false, urgencia: false })

  const [tipoDesconto, setTipoDesconto] = useState<'porcentagem' | 'valor'>('porcentagem')
  const [valorDesconto, setValorDesconto] = useState<number | string>('') // Começa vazio!

  const [analisandoIA, setAnalisandoIA] = useState(false)
  const [sugestaoIA, setSugestaoIA] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function carregarClientes() {
      const { data, error } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome')
      if (data && !error) setClientes(data)
    }
    carregarClientes()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownAberto(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const clientesFiltrados = clientes.filter(c => c.nome.toLowerCase().includes(buscaCliente.toLowerCase()))

  const handleSelecionarCliente = (cliente: Cliente) => {
    setClienteId(cliente.id)
    setBuscaCliente(cliente.nome)
    setDropdownAberto(false)
  }

  const handleLimparCliente = () => {
    setClienteId('')
    setBuscaCliente('')
  }

  // Preço unitário agora começa vazio
  const adicionarMaterial = () => setMateriais(prev => [...prev, { id: crypto.randomUUID(), descricao: '', quantidade: 1, preco_unitario: '', unidade: 'un' }])
  const removerMaterial = (id: string) => setMateriais(prev => prev.filter(m => m.id !== id))
  const atualizarMaterial = (id: string, campo: keyof MaterialItem, valor: any) => setMateriais(prev => prev.map(m => m.id === id ? { ...m, [campo]: valor } : m))

  // ─── MOTOR DE CÁLCULO ───
  const totais = useMemo(() => {
    const totalMateriais = materiais.reduce((acc, m) => acc + (Number(m.quantidade) * Number(m.preco_unitario)), 0)
    const subtotalMaoDeObra = Number(valorHora) * Number(horasEstimadas)

    let percentualAcrescimo = 0
    if (adicionais.altura) percentualAcrescimo += 0.30
    if (adicionais.insalubridade) percentualAcrescimo += 0.20
    if (adicionais.urgencia) percentualAcrescimo += 0.50

    const totalAcrescimos = subtotalMaoDeObra * percentualAcrescimo
    const totalCustosOp = Number(custosOp.deslocamento) + Number(custosOp.alimentacao) + Number(custosOp.hospedagem)

    const baseCalculo = subtotalMaoDeObra + totalAcrescimos + totalMateriais + totalCustosOp

    let valorDescontado = 0
    if (tipoDesconto === 'porcentagem') {
      valorDescontado = baseCalculo * (Number(valorDesconto) / 100)
    } else {
      valorDescontado = Number(valorDesconto)
    }

    const totalGeral = Math.max(0, baseCalculo - valorDescontado)

    return { totalMateriais, subtotalMaoDeObra, totalAcrescimos, totalCustosOp, valorDescontado, baseCalculo, totalGeral }
  }, [materiais, valorHora, horasEstimadas, custosOp, adicionais, tipoDesconto, valorDesconto])

  const consultarIA = () => {
    setAnalisandoIA(true)
    setSugestaoIA(null)
    setTimeout(() => {
      let mensagem = `Orçamento estruturado:\nCom **${horasEstimadas}h** estimadas, **${materiais.length} itens** de material e considerando os riscos envolvidos, o valor final de **${formatarMoeda(totais.totalGeral)}** está `

      if (totais.totalGeral < 500 && Number(horasEstimadas) > 4) {
        mensagem += `**MUITO BAIXO**. O desconto aplicado ou o valor da hora não cobre adequadamente o risco técnico e o custo fixo. Sugiro rever a margem.`
      } else if (totais.valorDescontado > (totais.baseCalculo * 0.15)) {
        mensagem += `**COM DESCONTO AGRESSIVO**. Você está dando mais de 15% de desconto. Verifique se o lucro líquido não foi comprometido.`
      } else {
        mensagem += `**COMPETITIVO E SAUDÁVEL**. A precificação absorve bem os custos logísticos e entrega uma margem justa.`
      }
      setSugestaoIA(mensagem)
      setAnalisandoIA(false)
      toast.success("Análise de IA concluída!")
    }, 1500)
  }

  const handleSalvar = async () => {
    if (!clienteId || !titulo) {
      toast.error("Obrigatório selecionar um cliente e informar o título.")
      return
    }

    setSalvando(true)
    try {
      const payloadOrcamento = {
        cliente_id: clienteId,
        titulo: titulo,
        escopo: escopo,
        status: 'rascunho',
        dados_financeiros: {
          valorHora: Number(valorHora),
          horasEstimadas: Number(horasEstimadas),
          custosOperacionais: {
            deslocamento: Number(custosOp.deslocamento),
            alimentacao: Number(custosOp.alimentacao),
            hospedagem: Number(custosOp.hospedagem)
          },
          adicionaisRisco: adicionais,
          desconto: { tipo: tipoDesconto, valor: Number(valorDesconto) },
          totaisCalculados: totais
        }
      }

      const { data: orcamentoInserido, error: erroOrcamento } = await supabase.from('orcamentos').insert([payloadOrcamento]).select().single()
      if (erroOrcamento) throw erroOrcamento

      if (materiais.length > 0 && orcamentoInserido) {
        const payloadItens = materiais.map(m => ({
          orcamento_id: orcamentoInserido.id,
          descricao: m.descricao,
          quantidade: Number(m.quantidade),
          preco_unitario: Number(m.preco_unitario),
          unidade: m.unidade,
          categoria: 'geral'
        }))
        const { error: erroItens } = await supabase.from('orcamento_itens').insert(payloadItens)
        if (erroItens) throw erroItens
      }

      toast.success("Orçamento salvo com sucesso!")
      setTimeout(() => router.push('/orcamentos'), 1500)
    } catch (error) {
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

        <div className="lg:col-span-2 space-y-6">

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5">1. Identificação</h2>
            <div className="space-y-4">

              <div className="relative" ref={dropdownRef}>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Buscar Cliente *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={buscaCliente}
                    onChange={(e) => {
                      setBuscaCliente(e.target.value)
                      setDropdownAberto(true)
                      if (clienteId) setClienteId('')
                    }}
                    onFocus={() => setDropdownAberto(true)}
                    placeholder="Digite o nome da empresa..."
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-10 py-2.5 text-sm outline-none focus:border-blue-500 transition"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                  {clienteId && (
                    <button onClick={handleLimparCliente} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 font-bold">✕</button>
                  )}
                </div>

                {dropdownAberto && (
                  <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {clientesFiltrados.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-gray-500 text-center">Nenhum cliente encontrado.</li>
                    ) : (
                      clientesFiltrados.map(c => (
                        <li key={c.id} onClick={() => handleSelecionarCliente(c)} className="px-4 py-2.5 text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0">
                          <span className="font-semibold text-gray-900 block">{c.nome}</span>
                        </li>
                      ))
                    )}
                    <li className="bg-gray-50 border-t border-gray-200">
                      <Link href="/clientes" target="_blank" className="block px-4 py-2.5 text-sm text-blue-700 font-bold hover:bg-blue-100 transition text-center">
                        + Cadastrar Novo Cliente
                      </Link>
                    </li>
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Título do Serviço / Proposta *</label>
                <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Reforma do QGBT" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Escopo Técnico (Descritivo)</label>
                <textarea rows={3} value={escopo} onChange={e => setEscopo(e.target.value)} placeholder="Descreva os serviços..." className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 resize-none" />
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
                    <input type="text" value={item.descricao} onChange={e => atualizarMaterial(item.id, 'descricao', e.target.value)} placeholder="Item" className="flex-1 min-w-[200px] bg-white border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    <div className="flex gap-2 w-full md:w-auto">
                      <input type="number" value={item.quantidade} onChange={e => atualizarMaterial(item.id, 'quantidade', e.target.value)} placeholder="Qtd" className="w-16 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" />
                      <select value={item.unidade} onChange={e => atualizarMaterial(item.id, 'unidade', e.target.value)} className="w-16 bg-white border border-gray-300 rounded-md px-1 py-2 text-sm outline-none focus:border-blue-500">
                        <option value="un">UN</option><option value="m">M</option><option value="kg">KG</option><option value="cx">CX</option><option value="rl">Rolo</option>
                      </select>
                      {/* Removido a forçação do Number() no onChange */}
                      <input type="number" step="0.01" value={item.preco_unitario} onChange={e => atualizarMaterial(item.id, 'preco_unitario', e.target.value)} placeholder="R$ Unit." className="w-24 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div className="w-full md:w-28 text-right text-sm font-bold text-gray-900 mt-2 md:mt-0">
                      {formatarMoeda(Number(item.quantidade) * Number(item.preco_unitario))}
                    </div>
                    <button onClick={() => removerMaterial(item.id)} className="w-full md:w-auto text-red-500 hover:bg-red-50 p-2 rounded-md transition mt-2 md:mt-0">🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5">3. Execução e Logística</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Valor da Hora Técnica (R$)</label>
                <input type="number" value={valorHora} onChange={e => setValorHora(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Horas Estimadas de Execução</label>
                <input type="number" value={horasEstimadas} onChange={e => setHorasEstimadas(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-5 border-t border-gray-100 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Deslocamento (R$)</label>
                {/* Removido o Number() do onChange */}
                <input type="number" value={custosOp.deslocamento} onChange={e => setCustosOp({ ...custosOp, deslocamento: e.target.value })} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Alimentação (R$)</label>
                <input type="number" value={custosOp.alimentacao} onChange={e => setCustosOp({ ...custosOp, alimentacao: e.target.value })} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Hospedagem (R$)</label>
                <input type="number" value={custosOp.hospedagem} onChange={e => setCustosOp({ ...custosOp, hospedagem: e.target.value })} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="pt-5 border-t border-gray-100 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={adicionais.altura} onChange={e => setAdicionais({ ...adicionais, altura: e.target.checked })} className="w-4 h-4 accent-gray-900" /><span className="text-sm font-semibold text-gray-700">Risco NR-35 (+30%)</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={adicionais.insalubridade} onChange={e => setAdicionais({ ...adicionais, insalubridade: e.target.checked })} className="w-4 h-4 accent-gray-900" /><span className="text-sm font-semibold text-gray-700">Insalubridade (+20%)</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={adicionais.urgencia} onChange={e => setAdicionais({ ...adicionais, urgencia: e.target.checked })} className="w-4 h-4 accent-gray-900" /><span className="text-sm font-semibold text-gray-700">Taxa de Urgência (+50%)</span></label>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5">4. Negociação Comercial</h2>
            <div className="flex gap-5">
              <div className="w-1/3">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tipo de Desconto</label>
                <select value={tipoDesconto} onChange={e => setTipoDesconto(e.target.value as 'porcentagem' | 'valor')} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition">
                  <option value="porcentagem">Porcentagem (%)</option>
                  <option value="valor">Valor Fixo (R$)</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Valor do Desconto</label>
                {/* Removido o Number() do onChange */}
                <input type="number" value={valorDesconto} onChange={e => setValorDesconto(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition" />
              </div>
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA: CONSOLIDAÇÃO FINANCEIRA E IA */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-7 shadow-sm sticky top-20">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Composição do Preço</h2>

            <div className="space-y-4 text-sm font-medium">
              <div className="flex justify-between text-gray-600 pb-2 border-b border-gray-100">
                <span>Mão de Obra ({horasEstimadas}h)</span>
                <span className="text-gray-900 font-bold">{formatarMoeda(totais.subtotalMaoDeObra)}</span>
              </div>

              {totais.totalAcrescimos > 0 && (
                <div className="flex justify-between text-gray-600 pb-2 border-b border-gray-100">
                  <span>Adicionais Técnicos</span>
                  <span className="text-amber-600 font-bold">+ {formatarMoeda(totais.totalAcrescimos)}</span>
                </div>
              )}

              {totais.totalMateriais > 0 && (
                <div className="flex justify-between text-gray-600 pb-2 border-b border-gray-100">
                  <span>Materiais (BOM)</span>
                  <span className="text-blue-600 font-bold">+ {formatarMoeda(totais.totalMateriais)}</span>
                </div>
              )}

              {totais.totalCustosOp > 0 && (
                <div className="flex justify-between text-gray-600 pb-2 border-b border-gray-100">
                  <span>Custos Logísticos</span>
                  <span className="text-purple-600 font-bold">+ {formatarMoeda(totais.totalCustosOp)}</span>
                </div>
              )}

              {totais.valorDescontado > 0 && (
                <div className="flex justify-between text-emerald-600 pb-2 border-b border-gray-100">
                  <span>Desconto Aplicado</span>
                  <span className="font-bold">- {formatarMoeda(totais.valorDescontado)}</span>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 flex flex-col">
              <span className="text-xs uppercase text-gray-500 font-bold tracking-wider mb-1">Custo Total Projetado</span>
              <span className="text-4xl font-black tracking-tight text-gray-900">{formatarMoeda(totais.totalGeral)}</span>
            </div>

            {/* BOTÃO DA IA */}
            <button onClick={consultarIA} disabled={analisandoIA} className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-lg text-sm font-bold transition-colors shadow-sm flex justify-center items-center gap-2">
              {analisandoIA ? '🧠 Processando...' : '✨ Validar preço com IA'}
            </button>

            {/* RESPOSTA DA IA (Ajustada para o fundo claro) */}
            {sugestaoIA && (
              <div className="mt-5 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm leading-relaxed animate-in fade-in">
                <span className="block mb-2 text-lg">🤖</span>
                <p dangerouslySetInnerHTML={{ __html: sugestaoIA.replace(/\*\*(.*?)\*\*/g, '<strong class="text-indigo-900">$1</strong>').replace(/\n/g, '<br/>') }} className="text-indigo-800" />
              </div>
            )}

          </div>
        </div>

      </main>
    </div>
  )
}