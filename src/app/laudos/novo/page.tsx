'use client'
// src/app/laudos/page.tsx

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'

export default function LaudosListPage() {
  const [laudos, setLaudos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregarLaudosProntos() {
      try {
        // Busca APENAS as visitas concluídas (que viraram laudos)
        const { data, error } = await supabase
          .from('visitas')
          .select(`*, clientes (nome)`)
          .eq('status', 'concluida')
          .order('finalizado_em', { ascending: false })

        if (error) throw error
        setLaudos(data || [])
      } catch (error) {
        toast.error("Erro ao carregar os laudos.")
      } finally {
        setCarregando(false)
      }
    }
    carregarLaudosProntos()
  }, [])

  const formatarData = (iso?: string) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('pt-BR')
  }

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
                <Link key={item} href={`/${item.toLowerCase()}`} className={`px-3 py-1.5 rounded-lg text-sm transition ${item === 'Laudos' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                  {item}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Central de Laudos</h1>
          <p className="text-sm text-gray-500">Documentos prontos gerados a partir de vistorias concluídas.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {carregando ? (
            <div className="p-8 text-center text-gray-500 text-sm">Buscando laudos...</div>
          ) : laudos.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-4xl block mb-3">📄</span>
              <p className="text-gray-900 font-medium">Nenhum laudo gerado ainda.</p>
              <p className="text-sm text-gray-500 mt-1">Finalize uma vistoria na prancheta para ela aparecer aqui.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {laudos.map(laudo => (
                <div key={laudo.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">OS #{String(laudo.id).padStart(4, '0')} - {laudo.clientes?.nome}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Finalizado em {formatarData(laudo.finalizado_em)} pelo Téc. {laudo.tecnico_nome}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link 
                      href={`/laudos/${laudo.id}`} 
                      className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition shadow-sm flex items-center gap-2"
                    >
                      🖨️ Abrir PDF
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}