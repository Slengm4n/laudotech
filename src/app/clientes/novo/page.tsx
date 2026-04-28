'use client'
// src/app/clientes/novo/page.tsx

import { useState } from 'react'
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

export default function NovoClientePage() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)

  // Controle de Pessoa Física ou Jurídica
  const [tipoPessoa, setTipoPessoa] = useState<'J' | 'F'>('J')

  // Dados básicos
  const [form, setForm] = useState({
    nome: '',
    documento: '',
    telefone: '',
    contato_nome: '',
    email: ''
  })

  // Dados de Endereço (Separados para o ViaCEP)
  const [end, setEnd] = useState({
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', localidade: '', uf: ''
  })

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

  // ─── INTEGRAÇÃO VIACEP ───
  const buscarCep = async () => {
    const cepLimpo = end.cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await res.json()
      
      if (data.erro) {
        toast.error('CEP não encontrado.')
        return
      }

      setEnd(prev => ({
        ...prev,
        logradouro: data.logradouro,
        bairro: data.bairro,
        localidade: data.localidade,
        uf: data.uf
      }))
      toast.success('Endereço preenchido!')
      
      // Foca automaticamente no campo "Número" após achar o CEP
      document.getElementById('input-numero')?.focus()
    } catch (error) {
      toast.error('Erro ao buscar o CEP.')
    } finally {
      setBuscandoCep(false)
    }
  }

  // ─── SALVAR NO SUPABASE ───
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)

    // Junta os campos de endereço em uma string só para caber na sua tabela atual
    const enderecoCompleto = `${end.logradouro}, ${end.numero}${end.complemento ? ' - ' + end.complemento : ''} - ${end.bairro}, ${end.localidade} - ${end.uf}, CEP: ${end.cep}`

    const payload = {
      ...form,
      endereco: end.logradouro ? enderecoCompleto : '' // Salva vazio se não preencheu a rua
    }

    try {
      const { error } = await supabase.from('clientes').insert([payload])
      if (error) throw error

      toast.success('Cliente cadastrado com sucesso! 🎉')
      setTimeout(() => router.push('/clientes'), 1000) 
    } catch (error) {
      toast.error('Erro ao cadastrar cliente. Verifique os dados.')
      setSalvando(false)
    }
  }

  // Troca o tipo de pessoa e limpa o documento
  const alterarTipoPessoa = (tipo: 'J' | 'F') => {
    setTipoPessoa(tipo)
    setForm({ ...form, documento: '' })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Toaster position="top-right" richColors />

      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/clientes" className="text-gray-400 hover:text-gray-900 transition">← Voltar</Link>
          <span className="text-base font-semibold text-gray-900">Novo Cliente</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSalvar} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          
          {/* ── 1. DADOS DA EMPRESA / PESSOA ── */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Dados Principais</h2>
                <p className="text-sm text-gray-500 mt-1">Identificação do cliente.</p>
              </div>
              
              {/* Toggle Dinâmico */}
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button type="button" onClick={() => alterarTipoPessoa('J')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition ${tipoPessoa === 'J' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Empresa (CNPJ)</button>
                <button type="button" onClick={() => alterarTipoPessoa('F')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition ${tipoPessoa === 'F' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Física (CPF)</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">{tipoPessoa === 'J' ? 'Razão Social / Nome Fantasia *' : 'Nome Completo *'}</label>
                <input required type="text" name="nome" value={form.nome} onChange={handleFormChange} placeholder={tipoPessoa === 'J' ? "Ex: Indústria Alfa Ltda" : "Ex: João da Silva"} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:bg-white transition" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">{tipoPessoa === 'J' ? 'CNPJ' : 'CPF'}</label>
                <input type="text" name="documento" value={form.documento} onChange={handleFormChange} placeholder={tipoPessoa === 'J' ? "00.000.000/0001-00" : "000.000.000-00"} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:bg-white transition" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Email Principal</label>
                <input type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="contato@empresa.com.br" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:bg-white transition" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Nome do Contato</label>
                <input type="text" name="contato_nome" value={form.contato_nome} onChange={handleFormChange} placeholder="Ex: Carlos (Gerente)" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:bg-white transition" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">WhatsApp / Telefone</label>
                <input type="text" name="telefone" value={form.telefone} onChange={handleFormChange} placeholder="(11) 99999-9999" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:bg-white transition" />
              </div>
            </div>
          </div>

          {/* ── 2. ENDEREÇO COM VIACEP ── */}
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Localização da Obra / Matriz</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2 relative">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">CEP</label>
                <input type="text" name="cep" value={end.cep} onChange={handleEndChange} onBlur={buscarCep} placeholder="00000-000" maxLength={9} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:bg-white transition" />
                {buscandoCep && <span className="absolute right-3 top-9 text-xs text-blue-500 font-medium">Buscando...</span>}
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Rua / Logradouro</label>
                <input type="text" name="logradouro" value={end.logradouro} onChange={handleEndChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:bg-white transition" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Número</label>
                <input id="input-numero" type="text" name="numero" value={end.numero} onChange={handleEndChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:bg-white transition" />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Complemento</label>
                <input type="text" name="complemento" value={end.complemento} onChange={handleEndChange} placeholder="Ex: Galpão 3, Sala 2" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:bg-white transition" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Bairro</label>
                <input type="text" name="bairro" value={end.bairro} onChange={handleEndChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:bg-white transition" />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Cidade</label>
                <input type="text" name="localidade" value={end.localidade} onChange={handleEndChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:bg-white transition" />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">UF</label>
                <input type="text" name="uf" value={end.uf} onChange={handleEndChange} maxLength={2} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:bg-white transition uppercase" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 border-t border-gray-200 flex justify-end gap-3">
            <Link href="/clientes" className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition">Cancelar</Link>
            <button type="submit" disabled={salvando} className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-800 transition disabled:opacity-50 shadow-sm">
              {salvando ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}