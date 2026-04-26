'use client'
// src/app/clientes/novo/page.tsx

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NovoClientePage() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)

  // O estado agora controla o tipo de pessoa (PJ ou PF) e usa 'documento' em vez de cnpj
  const [form, setForm] = useState({
    tipoPessoa: 'PJ' as 'PJ' | 'PF',
    nome: '',
    documento: '',
    email: '',
    telefone: '',
    contato_nome: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  })

  // ─── Helpers: Máscaras de Input ───
  const maskCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').substring(0, 14)
  const maskCNPJ = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2").substring(0, 18)
  const maskTelefone = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, "($1) $2").replace(/(\d)(\d{4})$/, "$1-$2").substring(0, 15)
  const maskCEP = (v: string) => v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, "$1-$2").substring(0, 9)

  const handleDocumentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value
    setForm({
      ...form,
      documento: form.tipoPessoa === 'PJ' ? maskCNPJ(valor) : maskCPF(valor)
    })
  }

  // ─── Busca de CEP via API (ViaCEP) ───
  const handleBuscarCep = async (cepParaBuscar: string) => {
    const cepLimpo = cepParaBuscar.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await res.json()
      
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          uf: data.uf,
        }))
        document.getElementById('numero_end')?.focus()
      } else {
        alert("CEP não encontrado.")
      }
    } catch (error) {
      console.error("Erro ao buscar CEP", error)
    } finally {
      setBuscandoCep(false)
    }
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)

    const enderecoCompleto = `${form.logradouro}, ${form.numero} ${form.complemento ? '- ' + form.complemento : ''} - ${form.bairro}, ${form.cidade} - ${form.uf}, CEP: ${form.cep}`

    const dadosParaSalvar = {
      tipo_pessoa: form.tipoPessoa,
      nome: form.nome,
      cnpj: form.documento, // No banco continua salvando na coluna cnpj (ou você pode renomear a coluna depois)
      email: form.email,
      telefone: form.telefone,
      contato_nome: form.tipoPessoa === 'PJ' ? form.contato_nome : '', // Se for PF, não precisa de representante
      endereco: enderecoCompleto
    }

    try {
      console.log("Salvando cliente:", dadosParaSalvar)
      await new Promise(r => setTimeout(r, 1000))
      alert("Cliente cadastrado com sucesso!")
      router.push('/dashboard') 
    } catch (error) {
      alert("Erro ao cadastrar.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Navbar ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-base font-semibold text-gray-900">LaudoTech</span>
            <nav className="hidden md:flex items-center gap-1">
              {[
                { href: '/dashboard', label: 'Dashboard' },
                { href: '/laudos', label: 'Laudos' },
                { href: '/financeiro', label: 'Financeiro' },
                { href: '/clientes', label: 'Clientes' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    item.href === '/clientes'
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition">
            Sair
          </Link>
        </div>
      </header>

      {/* ── Main (Centralizado) ── */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col items-center space-y-8">

        {/* Título Centralizado com a mesma largura do Card */}
        <div className="w-full max-w-3xl">
          <h1 className="text-xl font-semibold text-gray-900">Cadastrar novo cliente</h1>
          <p className="text-sm text-gray-500">Adicione os dados do cliente para vincular às visitas e laudos.</p>
        </div>

        {/* ── Card do Formulário (mx-auto para garantir) ── */}
        <div className="w-full max-w-3xl bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mx-auto">
          
          <form onSubmit={handleSalvar}>
            
            {/* SESSÃO 1: Dados Institucionais / Pessoais */}
            <div className="px-6 py-5 border-b border-gray-100">
              
              {/* Seletor PF / PJ */}
              <div className="flex bg-gray-100 p-1 rounded-lg w-fit mb-6">
                <button 
                  type="button" 
                  onClick={() => setForm({...form, tipoPessoa: 'PJ', documento: '', nome: '', contato_nome: ''})} 
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${form.tipoPessoa === 'PJ' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Pessoa Jurídica
                </button>
                <button 
                  type="button" 
                  onClick={() => setForm({...form, tipoPessoa: 'PF', documento: '', nome: '', contato_nome: ''})} 
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${form.tipoPessoa === 'PF' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Pessoa Física
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                    {form.tipoPessoa === 'PJ' ? 'Razão Social / Nome Fantasia *' : 'Nome Completo *'}
                  </label>
                  <input 
                    type="text" required 
                    placeholder={form.tipoPessoa === 'PJ' ? "Ex: Indústria de Alimentos S.A." : "Ex: João Carlos da Silva"}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                    {form.tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF'}
                  </label>
                  <input 
                    type="text" 
                    placeholder={form.tipoPessoa === 'PJ' ? "00.000.000/0001-00" : "000.000.000-00"}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    value={form.documento} onChange={handleDocumentoChange}
                  />
                </div>
              </div>
            </div>

            {/* SESSÃO 2: Contato */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-sm font-semibold text-gray-900 mb-5">Dados de Contato</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Oculta o campo Representante se for Pessoa Física */}
                {form.tipoPessoa === 'PJ' && (
                  <div className="md:col-span-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Representante</label>
                    <input 
                      type="text" placeholder="Ex: Carlos (Gerente)"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                      value={form.contato_nome} onChange={(e) => setForm({...form, contato_nome: e.target.value})}
                    />
                  </div>
                )}

                <div className={`md:col-span-1 ${form.tipoPessoa === 'PF' ? 'md:col-span-2' : ''}`}>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Telefone / WhatsApp</label>
                  <input 
                    type="text" placeholder="(11) 99999-9999"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    value={form.telefone} onChange={(e) => setForm({...form, telefone: maskTelefone(e.target.value)})}
                  />
                </div>

                <div className={`md:col-span-1 ${form.tipoPessoa === 'PF' ? 'md:col-span-1' : ''}`}>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">E-mail para Laudos</label>
                  <input 
                    type="email" placeholder="contato@email.com"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* SESSÃO 3: Endereço Inteligente */}
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-gray-900">Endereço de Visita</h2>
                {buscandoCep && <span className="text-xs text-blue-600 animate-pulse font-medium">Buscando CEP...</span>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">CEP</label>
                  <input 
                    type="text" placeholder="00000-000"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    value={form.cep} 
                    onChange={(e) => {
                      const novoCep = maskCEP(e.target.value)
                      setForm({...form, cep: novoCep})
                      if (novoCep.length === 9) handleBuscarCep(novoCep)
                    }}
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Logradouro / Rua</label>
                  <input 
                    type="text" required placeholder="Rua, Avenida, etc."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    value={form.logradouro} onChange={(e) => setForm({...form, logradouro: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Número *</label>
                  <input 
                    id="numero_end" type="text" required placeholder="Ex: 123"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    value={form.numero} onChange={(e) => setForm({...form, numero: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Complemento</label>
                  <input 
                    type="text" placeholder="Apto 12, Sala 2"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    value={form.complemento} onChange={(e) => setForm({...form, complemento: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Bairro</label>
                  <input 
                    type="text" required
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    value={form.bairro} onChange={(e) => setForm({...form, bairro: e.target.value})}
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Cidade</label>
                  <input 
                    type="text" required
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    value={form.cidade} onChange={(e) => setForm({...form, cidade: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">UF</label>
                  <input 
                    type="text" required placeholder="SP" maxLength={2}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition uppercase"
                    value={form.uf} onChange={(e) => setForm({...form, uf: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between rounded-b-xl">
              <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition">
                Cancelar
              </Link>
              <button 
                type="submit" 
                disabled={salvando}
                className="bg-gray-900 text-white text-sm px-8 py-2 rounded-lg hover:bg-gray-800 transition font-medium disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar Cliente'}
              </button>
            </div>

          </form>
        </div>

      </main>
    </div>
  )
}