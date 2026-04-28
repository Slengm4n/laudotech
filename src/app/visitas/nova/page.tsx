'use client'
// src/app/visitas/nova/page.tsx

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Toaster, toast } from 'sonner'

type Cliente = { id: string; nome: string; documento: string }

export default function NovaVisitaPage() {
  const router = useRouter()
  
  // ─── ESTADOS DA VISITA ───
  const [salvandoVisita, setSalvandoVisita] = useState(false)
  const [formVisita, setFormVisita] = useState({
    tecnico_nome: '',
    tecnico_crea: '',
    data_agendada: new Date().toISOString().split('T')[0],
    modalidade: 'planejada',
  })

  // ─── ESTADOS DO CLIENTE (BUSCA E SELEÇÃO) ───
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [buscaCliente, setBuscaCliente] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [mostrarDropdown, setMostrarDropdown] = useState(false)

  // ─── ESTADOS DO CLIENTE (CRIAÇÃO INLINE) ───
  const [criandoNovoCliente, setCriandoNovoCliente] = useState(false)
  const [salvandoCliente, setSalvandoCliente] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [formCliente, setFormCliente] = useState({
    tipoPessoa: 'PJ' as 'PJ' | 'PF', nome: '', documento: '', email: '', telefone: '', contato_nome: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: ''
  })

  // ─── MÁSCARAS ───
  const maskCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').substring(0, 14)
  const maskCNPJ = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2").substring(0, 18)
  const maskTelefone = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, "($1) $2").replace(/(\d)(\d{4})$/, "$1-$2").substring(0, 15)
  const maskCEP = (v: string) => v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, "$1-$2").substring(0, 9)

  // ─── CARREGAR CLIENTES INICIALMENTE ───
  useEffect(() => {
    async function buscarClientes() {
      const { data } = await supabase.from('clientes').select('id, nome, documento').order('nome')
      if (data) setClientes(data)
    }
    buscarClientes()
  }, [])

  // ─── FILTRO DA BUSCA ───
  const clientesFiltrados = clientes.filter(c => 
    c.nome.toLowerCase().includes(buscaCliente.toLowerCase()) || 
    (c.documento && c.documento.includes(buscaCliente))
  )

  // ─── FUNÇÕES DO NOVO CLIENTE (INLINE) ───
  const handleAbrirCriacao = () => {
    setFormCliente(prev => ({ ...prev, nome: buscaCliente })) // Já preenche o nome que ele estava digitando
    setCriandoNovoCliente(true)
    setMostrarDropdown(false)
  }

  const handleBuscarCep = async (cepParaBuscar: string) => {
    const cepLimpo = cepParaBuscar.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setFormCliente(prev => ({ ...prev, logradouro: data.logradouro, bairro: data.bairro, cidade: data.localidade, uf: data.uf }))
        document.getElementById('numero_end_inline')?.focus()
      }
    } finally { setBuscandoCep(false) }
  }

  const handleSalvarClienteInline = async () => {
    if (!formCliente.nome || !formCliente.logradouro || !formCliente.numero) {
      toast.error("Preencha os campos obrigatórios do cliente (Nome e Endereço).")
      return
    }

    setSalvandoCliente(true)
    const enderecoFormatado = `${formCliente.logradouro}, ${formCliente.numero} ${formCliente.complemento ? '- ' + formCliente.complemento : ''} - ${formCliente.bairro}, ${formCliente.cidade} - ${formCliente.uf}, CEP: ${formCliente.cep}`

    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert([{
          nome: formCliente.nome, documento: formCliente.documento, email: formCliente.email, telefone: formCliente.telefone,
          endereco: enderecoFormatado, tipo_pessoa: formCliente.tipoPessoa, contato_nome: formCliente.contato_nome
        }])
        .select()
        .single() // Pega o cliente recém criado

      if (error) throw error

      toast.success('Cliente criado e selecionado!')
      
      // Atualiza a lista e auto-seleciona o novo cliente
      setClientes(prev => [...prev, data])
      setClienteSelecionado(data)
      setCriandoNovoCliente(false)
      setBuscaCliente('')

    } catch (error: any) {
      toast.error('Erro ao salvar cliente: ' + error.message)
    } finally {
      setSalvandoCliente(false)
    }
  }

  // ─── SALVAR A VISITA FINAL ───
  const handleSalvarVisita = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteSelecionado) {
      toast.error("Você precisa selecionar ou cadastrar um cliente primeiro.")
      return
    }

    setSalvandoVisita(true)
    try {
      const { error } = await supabase
        .from('visitas')
        .insert([{
          cliente_id: clienteSelecionado.id,
          tecnico_nome: formVisita.tecnico_nome,
          tecnico_crea: formVisita.tecnico_crea,
          data_agendada: formVisita.data_agendada,
          modalidade: formVisita.modalidade,
          status: 'agendada'
        }])

      if (error) throw error

      toast.success('Visita agendada com sucesso!')
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (error: any) {
      toast.error('Erro ao agendar visita.')
    } finally {
      setSalvandoVisita(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" richColors />

      {/* ── Navbar Omitida (Mantenha a sua padrão) ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-base font-semibold text-gray-900">LaudoTech</span>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">Cancelar</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col items-center space-y-6">
        
        <div className="w-full max-w-2xl">
          <h1 className="text-xl font-semibold text-gray-900">Agendar nova visita</h1>
          <p className="text-sm text-gray-500">Selecione ou cadastre a empresa e defina a logística.</p>
        </div>

        {/* ── CARD PRINCIPAL ── */}
        <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-xl shadow-sm mx-auto overflow-visible">
          
          {/* ── 1. SEÇÃO DO CLIENTE (BUSCA OU CRIAÇÃO) ── */}
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">1. Empresa Atendida</h2>

            {/* Cenário A: Cliente Selecionado */}
            {clienteSelecionado ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 p-4 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-green-900">{clienteSelecionado.nome}</p>
                  <p className="text-xs text-green-700">Documento: {clienteSelecionado.documento || 'Não informado'}</p>
                </div>
                <button type="button" onClick={() => setClienteSelecionado(null)} className="text-xs font-medium text-green-800 hover:underline bg-white px-3 py-1.5 rounded-md border border-green-200">
                  Trocar Cliente
                </button>
              </div>
            ) : 
            
            /* Cenário B: Criando Novo Cliente Inline */
            criandoNovoCliente ? (
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-medium text-gray-900">Cadastro Rápido</h3>
                  <button type="button" onClick={() => setCriandoNovoCliente(false)} className="text-xs text-gray-400 hover:text-gray-700">Cancelar</button>
                </div>

                <div className="space-y-4">
                  <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
                    <button type="button" onClick={() => setFormCliente({...formCliente, tipoPessoa: 'PJ', documento: ''})} className={`px-3 py-1 text-xs font-medium rounded-md ${formCliente.tipoPessoa === 'PJ' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>PJ</button>
                    <button type="button" onClick={() => setFormCliente({...formCliente, tipoPessoa: 'PF', documento: ''})} className={`px-3 py-1 text-xs font-medium rounded-md ${formCliente.tipoPessoa === 'PF' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>PF</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-medium text-gray-500 uppercase">Nome / Razão Social *</label>
                      <input type="text" className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm outline-none focus:border-gray-900" value={formCliente.nome} onChange={e => setFormCliente({...formCliente, nome: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-gray-500 uppercase">{formCliente.tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF'}</label>
                      <input type="text" className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm outline-none focus:border-gray-900" value={formCliente.documento} onChange={e => setFormCliente({...formCliente, documento: formCliente.tipoPessoa === 'PJ' ? maskCNPJ(e.target.value) : maskCPF(e.target.value)})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-gray-500 uppercase">Contato (Tel/Whats)</label>
                      <input type="text" className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm outline-none focus:border-gray-900" value={formCliente.telefone} onChange={e => setFormCliente({...formCliente, telefone: maskTelefone(e.target.value)})} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-medium text-gray-500 uppercase">CEP * {buscandoCep && <span className="text-blue-500 lowercase ml-2">buscando...</span>}</label>
                      <input type="text" className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm outline-none focus:border-gray-900" value={formCliente.cep} onChange={e => { const v = maskCEP(e.target.value); setFormCliente({...formCliente, cep: v}); if(v.length===9) handleBuscarCep(v) }} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-medium text-gray-500 uppercase">Rua, Cidade, Estado</label>
                      <input type="text" readOnly className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-500" value={`${formCliente.logradouro} - ${formCliente.cidade}/${formCliente.uf}`} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-gray-500 uppercase">Nº *</label>
                      <input id="numero_end_inline" type="text" className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm outline-none focus:border-gray-900" value={formCliente.numero} onChange={e => setFormCliente({...formCliente, numero: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-gray-500 uppercase">E-mail</label>
                      <input type="email" className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm outline-none focus:border-gray-900" value={formCliente.email} onChange={e => setFormCliente({...formCliente, email: e.target.value})} />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button type="button" onClick={handleSalvarClienteInline} disabled={salvandoCliente} className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                      {salvandoCliente ? 'Salvando...' : 'Salvar e Selecionar'}
                    </button>
                  </div>
                </div>
              </div>
            ) : 
            
            /* Cenário C: Input de Busca */
            (
              <div className="relative">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Buscar Empresa Cadastrada</label>
                <input 
                  type="text" placeholder="Digite o nome ou documento..."
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 transition shadow-sm"
                  value={buscaCliente}
                  onChange={(e) => { setBuscaCliente(e.target.value); setMostrarDropdown(true); }}
                  onFocus={() => setMostrarDropdown(true)}
                />

                {/* Dropdown de Resultados */}
                {mostrarDropdown && buscaCliente.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {clientesFiltrados.length > 0 ? (
                      <ul className="py-1">
                        {clientesFiltrados.map(cliente => (
                          <li key={cliente.id}>
                            <button 
                              type="button" 
                              onClick={() => { setClienteSelecionado(cliente); setMostrarDropdown(false); setBuscaCliente(''); }}
                              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition"
                            >
                              <p className="text-sm font-medium text-gray-900">{cliente.nome}</p>
                              <p className="text-xs text-gray-400">{cliente.documento || 'Sem documento'}</p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-sm text-gray-500 mb-3">Nenhum cliente encontrado.</p>
                      </div>
                    )}
                    
                    {/* Botão de Adicionar sempre no final do Dropdown */}
                    <div className="p-2 border-t border-gray-100 bg-gray-50">
                      <button 
                        type="button" 
                        onClick={handleAbrirCriacao}
                        className="w-full text-center bg-white border border-gray-200 text-gray-900 font-medium text-sm px-4 py-2 rounded-md hover:border-gray-400 transition shadow-sm"
                      >
                        + Cadastrar novo cliente "{buscaCliente}"
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── 2. SEÇÃO DA VISITA (Logística) ── */}
          <div className={`p-6 ${!clienteSelecionado ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-sm font-semibold text-gray-900 mb-4">2. Detalhes da Visita</h2>
            <form id="form-visita" onSubmit={handleSalvarVisita} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Nome do Técnico *</label>
                <input type="text" required className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900" value={formVisita.tecnico_nome} onChange={e => setFormVisita({...formVisita, tecnico_nome: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">CREA / Registro</label>
                <input type="text" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900" value={formVisita.tecnico_crea} onChange={e => setFormVisita({...formVisita, tecnico_crea: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Data da Visita *</label>
                <input type="date" required className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900" value={formVisita.data_agendada} onChange={e => setFormVisita({...formVisita, data_agendada: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Tipo de Atendimento</label>
                <select className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900" value={formVisita.modalidade} onChange={e => setFormVisita({...formVisita, modalidade: e.target.value})}>
                  <option value="planejada">Planejada (Exige Orçamento)</option>
                  <option value="expressa">Expressa (Reparo imediato)</option>
                </select>
              </div>
            </form>
          </div>

          <div className={`pt-6 pb-6 px-6 border-t border-gray-100 flex items-center justify-end bg-gray-50 ${!clienteSelecionado ? 'opacity-50 pointer-events-none' : ''}`}>
            <button form="form-visita" type="submit" disabled={salvandoVisita || !clienteSelecionado} className="bg-gray-900 text-white text-sm px-8 py-2.5 rounded-lg hover:bg-gray-800 transition font-medium disabled:opacity-50">
              {salvandoVisita ? 'Agendando...' : 'Confirmar Agendamento da Visita'}
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}