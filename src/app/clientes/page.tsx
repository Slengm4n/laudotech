'use client'
// src/app/clientes/page.tsx

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'

export default function ClientesListPage() {
    const [clientes, setClientes] = useState<any[]>([])
    const [carregando, setCarregando] = useState(true)
    const [busca, setBusca] = useState('')

    useEffect(() => {
        async function carregarClientes() {
            try {
                // Traz todos os clientes, ordenados por nome
                const { data, error } = await supabase
                    .from('clientes')
                    .select('*')
                    .order('nome', { ascending: true })

                if (error) throw error
                setClientes(data || [])
            } catch (error) {
                toast.error("Erro ao carregar clientes.")
            } finally {
                setCarregando(false)
            }
        }
        carregarClientes()
    }, [])

    // Filtro de pesquisa em tempo real
    const clientesFiltrados = clientes.filter(c =>
        c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        c.contato_nome?.toLowerCase().includes(busca.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Toaster position="top-right" richColors />

            {/* ── Navbar ── */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <span className="text-base font-semibold text-gray-900">LaudoTech</span>
                        <nav className="hidden md:flex items-center gap-1">
                            {['Dashboard', 'Visitas', 'Laudos', 'Clientes'].map(item => (
                                <Link key={item} href={`/${item.toLowerCase()}`} className={`px-3 py-1.5 rounded-lg text-sm transition ${item === 'Clientes' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                                    {item}
                                </Link>
                            ))}
                        </nav>
                    </div>
                    <Link href="/clientes/novo" className="bg-gray-900 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-gray-800 transition font-medium">+ Novo Cliente</Link>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Carteira de Clientes</h1>
                        <p className="text-sm text-gray-500">Gerencie as empresas e os contatos para vistorias.</p>
                    </div>

                    {/* Barra de Pesquisa */}
                    <div className="w-full md:w-72 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar por nome ou contato..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-900 transition shadow-sm"
                        />
                    </div>
                </div>

                {/* ── Lista de Clientes ── */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    {carregando ? (
                        <div className="p-8 text-center text-gray-500 text-sm">Carregando carteira...</div>
                    ) : clientesFiltrados.length === 0 ? (
                        <div className="p-12 text-center">
                            <span className="text-4xl block mb-3">🏢</span>
                            <p className="text-gray-900 font-medium">Nenhum cliente encontrado.</p>
                            <p className="text-sm text-gray-500 mt-1">Tente buscar por outro nome ou cadastre uma empresa.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {clientesFiltrados.map(cliente => {
                                // Considera ativo se for true OU se for null (clientes antigos antes de criarmos a coluna)
                                const isAtivo = cliente.ativo !== false;

                                return (
                                    <div key={cliente.id} className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${isAtivo ? 'hover:bg-gray-50' : 'bg-gray-50 opacity-75 hover:opacity-100'}`}>
                                        <div className="min-w-0">
                                            {/* Nome + Tag de Status */}
                                            <div className="flex items-center gap-2">
                                                <h3 className={`text-sm font-semibold truncate ${isAtivo ? 'text-gray-900' : 'text-gray-500 line-through decoration-gray-300'}`}>
                                                    {cliente.nome}
                                                </h3>
                                                {isAtivo ? (
                                                    <span className="bg-green-50 text-green-700 border border-green-200 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                        Ativo
                                                    </span>
                                                ) : (
                                                    <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                        Inativo
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-xs text-gray-500 mt-1 truncate">{cliente.endereco || 'Endereço não cadastrado'}</p>

                                            <div className="flex items-center gap-3 mt-2 text-xs font-medium">
                                                {cliente.contato_nome && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">👤 {cliente.contato_nome}</span>}
                                                {cliente.telefone && <span className="text-green-600">📞 {cliente.telefone}</span>}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {cliente.telefone && (
                                                <a href={`https://wa.me/55${cliente.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 px-3 py-1.5 rounded-lg transition">
                                                    WhatsApp
                                                </a>
                                            )}
                                            <Link
                                                href={`/clientes/${cliente.id}/editar`}
                                                className="text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:border-gray-400 px-3 py-1.5 rounded-lg transition shadow-sm"
                                            >
                                                Editar
                                            </Link>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}