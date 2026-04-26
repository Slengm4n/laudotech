'use client'
// src/app/visitas/nova/page.tsx

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NovaVisitaPage() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    cliente_id: '',
    tecnico_nome: '',
    tecnico_crea: '',
    data_agendada: new Date().toISOString().split('T')[0],
    modalidade: 'planejada',
  })

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)

    try {
      // Simulação de salvamento
      await new Promise(r => setTimeout(r, 1000))
      console.log("Visita salva:", form)
      router.push('/dashboard') 
    } catch (error) {
      alert("Erro ao salvar")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Navbar (Exatamente igual ao Dashboard) ── */}
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
                    item.href === '/dashboard' // Dashboard continua como base visual
                      ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-900 font-medium transition"
          >
            Sair da edição
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ── Título da Página (Mesmo estilo da Saudação) ── */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Agendar nova visita</h1>
          <p className="text-sm text-gray-500">Preencha os dados logísticos antes de iniciar a inspeção.</p>
        </div>

        {/* ── Card do Formulário (Mesmo estilo dos cards de Gráfico/Laudos) ── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-2xl">
          <div className="px-5 py-4 border-b border-gray-100 bg-white">
            <p className="text-sm font-medium text-gray-900">Dados da Ordem de Serviço</p>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleSalvar} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Cliente - Select Estilizado */}
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                    Cliente atendido
                  </label>
                  <select 
                    required
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    value={form.cliente_id}
                    onChange={(e) => setForm({...form, cliente_id: e.target.value})}
                  >
                    <option value="">Selecione um cliente cadastrado...</option>
                    <option value="1">Metalúrgica São Paulo Ltda</option>
                    <option value="2">Frigorífico Bom Sabor</option>
                  </select>
                </div>

                {/* Técnico */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                    Nome do Técnico
                  </label>
                  <input 
                    type="text" required
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    placeholder="Nome completo"
                    value={form.tecnico_nome}
                    onChange={(e) => setForm({...form, tecnico_nome: e.target.value})}
                  />
                </div>

                {/* CREA */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                    CREA / Registro
                  </label>
                  <input 
                    type="text"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    placeholder="000000/UF"
                    value={form.tecnico_crea}
                    onChange={(e) => setForm({...form, tecnico_crea: e.target.value})}
                  />
                </div>

                {/* Data */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                    Data da Visita
                  </label>
                  <input 
                    type="date" required
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    value={form.data_agendada}
                    onChange={(e) => setForm({...form, data_agendada: e.target.value})}
                  />
                </div>

                {/* Modalidade */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                    Tipo de Atendimento
                  </label>
                  <select 
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    value={form.modalidade}
                    onChange={(e) => setForm({...form, modalidade: e.target.value})}
                  >
                    <option value="planejada">Planejada (Orçamento)</option>
                    <option value="expressa">Expressa (Reparo imediato)</option>
                  </select>
                </div>

              </div>

              {/* Ações (Botão com o mesmo estilo do '+ Nova visita' da home) */}
              <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-700 transition">
                  Cancelar
                </Link>
                <button 
                  type="submit" 
                  disabled={salvando}
                  className="bg-gray-900 text-white text-sm px-6 py-2 rounded-lg hover:bg-gray-800 transition font-medium disabled:opacity-50"
                >
                  {salvando ? 'Agendando...' : 'Confirmar agendamento'}
                </button>
              </div>

            </form>
          </div>
        </div>

      </main>
    </div>
  )
} 