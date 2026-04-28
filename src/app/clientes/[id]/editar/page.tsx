'use client'
// src/app/clientes/[id]/editar/page.tsx

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'

// ─── MÁSCARAS E FORMATAÇÃO ───
const formatarCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').slice(0, 14)
const formatarCNPJ = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2').slice(0, 18)
const formatarCEP = (v: string) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9)
const formatarTelefone = (v: string) => {
  let r = v.replace(/\D/g, '')
  if (r.length > 11) r = r.slice(0, 11)
  if (r.length > 10) return r.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3')
  if (r.length > 5) return r.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3')
  if (r.length > 2) return r.replace(/^(\d{2})(\d{0,5})/, '($1) $2')
  return r
}

export default function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)

  const [clienteAtivo, setClienteAtivo] = useState(true)
  const [tipoPessoa, setTipoPessoa] = useState<'J' | 'F'>('J')

  const [form, setForm] = useState({
    nome: '', documento: '', telefone: '', contato_nome: '', email: '', endereco_atual: ''
  })

  // Campos separados para caso ele queira alterar o endereço via CEP
  const [end, setEnd] = useState({
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', localidade: '', uf: ''
  })

  // ─── CARREGAR DADOS DO CLIENTE ───
  useEffect(() => {
    async function carregarCliente() {
      try {
        const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single()
        if (error) throw error

        setForm({
          nome: data.nome || '',
          documento: data.documento || '',
          telefone: data.telefone || '',
          contato_nome: data.contato_nome || '',
          email: data.email || '',
          endereco_atual: data.endereco || ''
        })
        setClienteAtivo(data.ativo !== false) // Se for null, considera true
        setTipoPessoa((data.documento?.length || 0) <= 14 ? 'F' : 'J')
      } catch (error) {
        toast.error('Cliente não encontrado.')
        router.push('/clientes')
      } finally {
        setCarregando(false)
      }
    }
    carregarCliente()
  }, [id, router])

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target
    if (name === 'telefone') value = formatarTelefone(value)
    if (name === 'documento') value = tipoPessoa === 'J' ? formatarCNPJ(value) : formatarCPF(value)
    setForm({ ...form, [name]: value })
  }

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target
    if (name === 'cep') value = formatarCEP(value)
    setEnd({ ...end, [name]: value })
  }

  const buscarCep = async () => {
    const cepLimpo = end.cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await res.json()
      if (data.erro) { toast.error('CEP não encontrado.'); return }

      setEnd(prev => ({ ...prev, logradouro: data.logradouro, bairro: data.bairro, localidade: data.localidade, uf: data.uf }))
      toast.success('Endereço preenchido!')
      document.getElementById('input-numero')?.focus()
    } catch (error) {
      toast.error('Erro ao buscar o CEP.')
    } finally {
      setBuscandoCep(false)
    }
  }

  // ─── SALVAR EDIÇÃO ───
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)

    // Se ele preencheu um novo logradouro, nós montamos a string nova. Se não, mantemos o endereco_atual do banco.
    let enderecoFinal = form.endereco_atual
    if (end.logradouro) {
      enderecoFinal = `${end.logradouro}, ${end.numero}${end.complemento ? ' - ' + end.complemento : ''} - ${end.bairro}, ${end.localidade} - ${end.uf}, CEP: ${end.cep}`
    }

    const payload = {
      nome: form.nome,
      documento: form.documento,
      telefone: form.telefone,
      contato_nome: form.contato_nome,
      email: form.email,
      endereco: enderecoFinal
    }

    try {
      const { error } = await supabase.from('clientes').update(payload).eq('id', id)
      if (error) throw error

      toast.success('Cliente atualizado com sucesso! 🎉')
      setTimeout(() => router.push('/clientes'), 1000) 
    } catch (error) {
      toast.error('Erro ao atualizar. Verifique os dados.')
      setSalvando(false)
    }
  }

  // ─── ATIVAR / DESATIVAR ───
  const alternarStatus = async () => {
    const novoStatus = !clienteAtivo
    if (!novoStatus) {
      const confirma = window.confirm("Tem certeza que deseja desativar este cliente? Ele não aparecerá mais nas listagens principais.")
      if (!confirma) return
    }

    try {
      const { error } = await supabase.from('clientes').update({ ativo: novoStatus }).eq('id', id)
      if (error) throw error
      setClienteAtivo(novoStatus)
      toast.success(novoStatus ? 'Cliente reativado!' : 'Cliente desativado.')
    } catch (error) {
      toast.error('Erro ao alterar status.')
    }
  }

  if (carregando) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Carregando dados...</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Toaster position="top-right" richColors />

      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/clientes" className="text-gray-400 hover:text-gray-900 transition">← Voltar</Link>
          <span className="text-base font-semibold text-gray-900">Editar Cliente</span>
          {!clienteAtivo && <span className="ml-2 bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded uppercase font-bold">Inativo</span>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        
        {/* Formulário Principal */}
        <form onSubmit={handleSalvar} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Dados Principais</h2>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button type="button" onClick={() => { setTipoPessoa('J'); setForm({...form, documento: ''}) }} className={`px-4 py-1.5 text-xs font-medium rounded-md transition ${tipoPessoa === 'J' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>CNPJ</button>
                <button type="button" onClick={() => { setTipoPessoa('F'); setForm({...form, documento: ''}) }} className={`px-4 py-1.5 text-xs font-medium rounded-md transition ${tipoPessoa === 'F' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>CPF</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Razão Social / Nome *</label>
                <input required type="text" name="nome" value={form.nome} onChange={handleFormChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 transition" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">{tipoPessoa === 'J' ? 'CNPJ' : 'CPF'}</label>
                <input type="text" name="documento" value={form.documento} onChange={handleFormChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 transition" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">WhatsApp / Telefone</label>
                <input type="text" name="telefone" value={form.telefone} onChange={handleFormChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 transition" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Nome do Contato</label>
                <input type="text" name="contato_nome" value={form.contato_nome} onChange={handleFormChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 transition" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Email</label>
                <input type="email" name="email" value={form.email} onChange={handleFormChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 transition" />
              </div>
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Localização</h2>
            
            {form.endereco_atual && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                <span className="font-semibold text-xs uppercase text-gray-500 block mb-1">Endereço Atual Cadastrado:</span>
                {form.endereco_atual}
              </div>
            )}
            
            <p className="text-xs text-gray-500 mb-4">Para alterar o endereço, digite o novo CEP abaixo:</p>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2 relative">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Novo CEP</label>
                <input type="text" name="cep" value={end.cep} onChange={handleEndChange} onBlur={buscarCep} placeholder="00000-000" maxLength={9} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 transition" />
                {buscandoCep && <span className="absolute right-3 top-9 text-xs text-blue-500 font-medium">Buscando...</span>}
              </div>
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Logradouro</label>
                <input type="text" name="logradouro" value={end.logradouro} onChange={handleEndChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 transition" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Número</label>
                <input id="input-numero" type="text" name="numero" value={end.numero} onChange={handleEndChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 transition" />
              </div>
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Complemento</label>
                <input type="text" name="complemento" value={end.complemento} onChange={handleEndChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 transition" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Bairro</label>
                <input type="text" name="bairro" value={end.bairro} onChange={handleEndChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 transition" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Cidade</label>
                <input type="text" name="localidade" value={end.localidade} onChange={handleEndChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 transition" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">UF</label>
                <input type="text" name="uf" value={end.uf} onChange={handleEndChange} maxLength={2} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 transition uppercase" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 border-t border-gray-200 flex justify-end gap-3">
            <Link href="/clientes" className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition">Cancelar</Link>
            <button type="submit" disabled={salvando} className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-800 transition disabled:opacity-50 shadow-sm">
              {salvando ? 'Atualizando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>

        {/* ── ZONA DE PERIGO (DESATIVAR) ── */}
        <div className="border border-red-200 bg-red-50 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-red-900">Gerenciar Status</h3>
            <p className="text-xs text-red-700 mt-1">
              {clienteAtivo 
                ? "Desativar este cliente fará com que ele não apareça nas opções de novas vistorias, mas o histórico será mantido." 
                : "Este cliente está inativo. Você pode reativá-lo para voltar a gerar vistorias para ele."}
            </p>
          </div>
          <button 
            type="button" 
            onClick={alternarStatus}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition shrink-0 ${clienteAtivo ? 'bg-white border border-red-300 text-red-600 hover:bg-red-100 shadow-sm' : 'bg-green-600 text-white hover:bg-green-700'}`}
          >
            {clienteAtivo ? 'Desativar Cliente' : 'Reativar Cliente'}
          </button>
        </div>

      </main>
    </div>
  )
}