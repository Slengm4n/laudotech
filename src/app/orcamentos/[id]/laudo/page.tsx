'use client'
// src/app/visitas/[id]/laudo/page.tsx

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
const formatarData = (iso?: string) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '-'

export default function LaudoTecnicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [carregando, setCarregando] = useState(true)
  const [visita, setVisita] = useState<any>(null)

  useEffect(() => {
    async function carregarDados() {
      try {
        const { data, error } = await supabase
          .from('visitas')
          .select(`*, clientes (*), orcamentos (*)`)
          .eq('id', id)
          .single()

        if (error) throw error
        setVisita(data)
      } catch (error) {
        console.error(error)
      } finally {
        setCarregando(false)
      }
    }
    carregarDados()
  }, [id])

  if (carregando) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">Carregando Documento...</div>
  if (!visita) return <div className="p-10 text-center text-gray-700">Laudo não encontrado.</div>

  const relatorioTexto = visita.dados_vistoria?.relatorio_final || visita.dados_vistoria?.resumo || 'Nenhum detalhe técnico foi registrado para este atendimento.'
  const codigoOS = `OS #${String(visita.id).split('-')[0].toUpperCase()}`

  return (
    <div className="min-h-screen bg-gray-200 py-8 print:py-0 print:bg-white font-sans text-gray-900">
      
      {/* ── BARRA DE FERRAMENTAS (Invisível na hora de imprimir) ── */}
      <div className="max-w-[21cm] mx-auto mb-6 print:hidden">
        <div className="flex justify-between items-center bg-white rounded-xl shadow-sm border border-gray-300 p-4">
          <Link href={`/visitas/${id}`} className="text-sm font-bold text-gray-600 hover:text-gray-900 transition flex items-center gap-2">
            ← Voltar à Prancheta
          </Link>
          <button onClick={() => window.print()} className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition shadow-md flex items-center gap-2">
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* ── FOLHA A4 DO LAUDO ── */}
      <div className="max-w-[21cm] mx-auto bg-white p-10 md:p-14 shadow-xl print:shadow-none print:p-0 print:max-w-full">
        
        {/* CABEÇALHO */}
        <header className="border-b-2 border-gray-900 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase">Laudo de Vistoria</h1>
            <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-wide">Documento Técnico Oficial</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-gray-900">Slengman Engenharia</h2>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">{codigoOS}</p>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Data: {formatarData(visita.created_at)}</p>
          </div>
        </header>

        {/* 1. DADOS DO CLIENTE */}
        <section className="mb-8 break-inside-avoid">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 mb-3">1. Identificação do Cliente</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div>
              <span className="block font-semibold text-gray-400 uppercase text-[10px] tracking-wider mb-0.5">Cliente / Razão Social</span>
              <span className="font-bold text-gray-900">{visita.clientes?.nome}</span>
            </div>
            <div>
              <span className="block font-semibold text-gray-400 uppercase text-[10px] tracking-wider mb-0.5">CNPJ / CPF</span>
              <span className="font-bold text-gray-900">{visita.clientes?.documento || 'N/A'}</span>
            </div>
            <div className="col-span-2 mt-2">
              <span className="block font-semibold text-gray-400 uppercase text-[10px] tracking-wider mb-0.5">Endereço do Local Atendido</span>
              <span className="font-bold text-gray-900">{visita.clientes?.endereco || 'N/A'}</span>
            </div>
          </div>
        </section>

        {/* 2. DADOS OPERACIONAIS */}
        <section className="mb-8 break-inside-avoid">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 mb-3">2. Dados da Execução</h3>
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-sm print:bg-transparent print:border-gray-300">
            <div className="col-span-2">
              <span className="block font-semibold text-gray-500 uppercase text-[10px] tracking-wider mb-0.5">Técnico Responsável</span>
              <span className="font-bold text-gray-900">{visita.tecnico_nome || 'Jefferson Slengman'}</span>
            </div>
            <div className="col-span-2">
              <span className="block font-semibold text-gray-500 uppercase text-[10px] tracking-wider mb-0.5">Data da Execução</span>
              <span className="font-bold text-gray-900">{formatarData(visita.data_agendada)}</span>
            </div>
            {visita.orcamentos && (
               <div className="col-span-4 mt-2 pt-2 border-t border-gray-200">
                 <span className="block font-semibold text-gray-500 uppercase text-[10px] tracking-wider mb-0.5">Orçamento Vinculado</span>
                 <span className="font-bold text-gray-900">Ref: {visita.orcamentos.titulo}</span>
               </div>
            )}
          </div>
        </section>

        {/* 3. RELATÓRIO TÉCNICO (RAT) */}
        <section className="mb-10">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 mb-4">3. Relatório de Atendimento Técnico (RAT)</h3>
          <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed text-justify">
            {relatorioTexto}
          </div>
        </section>

        {/* 4. FECHAMENTO FINANCEIRO (Só aparece se tiver valor preenchido) */}
        {(Number(visita.valor_servico) > 0 || Number(visita.valor_material) > 0) && (
          <section className="mb-10 break-inside-avoid">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 mb-3">4. Resumo Financeiro</h3>
            <table className="w-full text-sm text-left border-collapse border border-gray-300">
              <tbody>
                {Number(visita.valor_servico) > 0 && (
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-medium text-gray-800">Mão de Obra / Serviço Executado</td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-medium text-gray-900 w-48">{formatarMoeda(Number(visita.valor_servico))}</td>
                  </tr>
                )}
                {Number(visita.valor_material) > 0 && (
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 text-gray-800">Materiais Utilizados</td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-medium text-gray-900">{formatarMoeda(Number(visita.valor_material))}</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td className="border border-gray-300 px-4 py-3 font-bold text-gray-900 uppercase tracking-wider text-xs">Total Faturado</td>
                  <td className="border border-gray-300 px-4 py-3 font-black text-right text-lg text-gray-900">
                    {formatarMoeda(Number(visita.valor_servico || 0) + Number(visita.valor_material || 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}

        {/* RODAPÉ DE ASSINATURA */}
        <footer className="mt-32 flex justify-between text-center break-inside-avoid">
          <div className="w-64">
            <div className="border-t-2 border-gray-900 w-full pt-2">
              <p className="text-sm font-bold text-gray-900">{visita.tecnico_nome || 'Slengman Engenharia'}</p>
              <p className="text-xs text-gray-500 uppercase mt-0.5">Responsável Técnico</p>
            </div>
          </div>
          <div className="w-64">
            <div className="border-t-2 border-gray-900 w-full pt-2">
              <p className="text-sm font-bold text-gray-900">{visita.clientes?.nome || 'Cliente Responsável'}</p>
              <p className="text-xs text-gray-500 uppercase mt-0.5">Assinatura do Cliente</p>
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}