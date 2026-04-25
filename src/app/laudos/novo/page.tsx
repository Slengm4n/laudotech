'use client'
// src/app/laudos/novo/page.tsx — v2 completo

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

// ─── Tipos ──────────────────────────────────────────────────
type Urgencia = 'baixo' | 'medio' | 'alto' | 'critico'
type Secao = 'dados' | 'servico' | 'diagnostico' | 'checklist' | 'fotos' | 'parecer' | 'cobranca'
type Conformidade = true | false | 'na' | null

interface Empresa {
  id: string; nome: string; cnpj?: string; endereco?: string; contato?: string
  ultimosLaudos?: { numero: number; tipo: string; data: string; valor: number }[]
  valorMedioHistorico?: number
}

interface FotoItem { id: string; file: File; preview: string; legenda: string; iaLoading: boolean }

interface ChecklistItem {
  id: string; item: string; categoria: string
  conforme: Conformidade; observacao: string; obrigatorio: boolean
}

interface StatusMaquina {
  id: string; parametro: string; valor: string
  status: 'normal' | 'atencao' | 'critico' | ''; unidade: string
}

interface FormData {
  empresaId: string; empresaNova: boolean
  clienteNome: string; clienteCnpj: string; clienteEndereco: string
  clienteContato: string; clienteEmail: string
  dataVisita: string; tecnicoNome: string; tecnicoCrea: string; numeroLaudo: string
  tipoServico: string; urgencia: Urgencia; normasAplicaveis: string[]; objetivoVisita: string
  nivelDificuldade: string; trabalhoAltura: boolean; alturaMetros: string
  ambienteInsalubre: boolean; tipoInsalubridade: string[]; atividadePesada: boolean
  condicoesAmbientais: { temperatura: string; umidade: string; poeira: string; ruido: string }
  diagnostico: string; diagnosticoExpandido: string
  checklist: ChecklistItem[]; statusMaquina: StatusMaquina[]
  recomendacoes: string; recomendacoesExpandidas: string; parecerFinal: string; prazoExecucao: string
  horas: number; valorHora: number; valorMateriais: number; valorDeslocamento: number
  adicionalInsalubridade: number; adicionalAltura: number; valorMinimo: number
  iaSugestaoValor: string; observacoesCobranca: string
}

// ─── Mock de empresas (substituir por fetch do Supabase) ────
const EMPRESAS_MOCK: Empresa[] = [
  { id: '1', nome: 'Metalúrgica São Paulo Ltda', cnpj: '12.345.678/0001-90', endereco: 'Rua Industrial, 500 - Santo André - SP', contato: 'Carlos Mendes · (11) 98765-4321', ultimosLaudos: [{ numero: 12, tipo: 'Inspeção elétrica', data: '18/04/2025', valor: 1200 }, { numero: 8, tipo: 'NR-12', data: '10/01/2025', valor: 1800 }], valorMedioHistorico: 1500 },
  { id: '2', nome: 'Frigorífico Bom Sabor', cnpj: '98.765.432/0001-10', endereco: 'Av. Frigorífica, 1200 - Guarulhos - SP', contato: 'Ana Paula · (11) 91234-5678', ultimosLaudos: [{ numero: 11, tipo: 'Manutenção preventiva', data: '12/04/2025', valor: 800 }], valorMedioHistorico: 800 },
  { id: '3', nome: 'Construtora Horizonte', cnpj: '11.222.333/0001-44', endereco: 'Rua das Obras, 300 - São Paulo - SP', contato: 'Roberto Silva · (11) 94567-8901', ultimosLaudos: [{ numero: 10, tipo: 'Vistoria estrutural', data: '05/04/2025', valor: 2500 }], valorMedioHistorico: 2500 },
]

// ─── Checklists por tipo de serviço ─────────────────────────
const CHECKLISTS: Record<string, Omit<ChecklistItem, 'id' | 'conforme' | 'observacao'>[]> = {
  'Inspeção elétrica': [
    { item: 'Quadro de distribuição identificado e organizado', categoria: 'Elétrico', obrigatorio: true },
    { item: 'Disjuntores em perfeito estado e dimensionados', categoria: 'Elétrico', obrigatorio: true },
    { item: 'Aterramento regularizado e testado', categoria: 'Elétrico', obrigatorio: true },
    { item: 'Fiação sem emendas improvisadas ou fios expostos', categoria: 'Elétrico', obrigatorio: true },
    { item: 'DPS (dispositivos de proteção) instalados', categoria: 'Proteção', obrigatorio: true },
    { item: 'Sinalização de risco elétrico presente', categoria: 'Segurança', obrigatorio: true },
    { item: 'EPI elétrico disponível para operadores', categoria: 'Segurança', obrigatorio: false },
    { item: 'Documentação elétrica atualizada (ART)', categoria: 'Documental', obrigatorio: false },
  ],
  'Laudo NR-10': [
    { item: 'Prontuário de instalações elétricas disponível', categoria: 'Documental', obrigatorio: true },
    { item: 'Diagrama unifilar atualizado', categoria: 'Documental', obrigatorio: true },
    { item: 'Trabalhadores com treinamento NR-10 válido', categoria: 'Treinamento', obrigatorio: true },
    { item: 'Procedimento de bloqueio e etiquetagem (LOTO)', categoria: 'Procedimento', obrigatorio: true },
    { item: 'EPI elétrico certificado e dentro do prazo', categoria: 'Segurança', obrigatorio: true },
    { item: 'Sinalização de segurança elétrica instalada', categoria: 'Segurança', obrigatorio: true },
    { item: 'Aterramento e para-raios inspecionados', categoria: 'Elétrico', obrigatorio: true },
  ],
  'Laudo NR-12': [
    { item: 'Proteções fixas nas partes móveis e transmissões', categoria: 'Proteção', obrigatorio: true },
    { item: 'Dispositivos de parada de emergência (cogumelo)', categoria: 'Segurança', obrigatorio: true },
    { item: 'Manual do equipamento disponível e acessível', categoria: 'Documental', obrigatorio: true },
    { item: 'Mapa de riscos afixado próximo ao equipamento', categoria: 'Segurança', obrigatorio: true },
    { item: 'Operadores com treinamento NR-12 válido', categoria: 'Treinamento', obrigatorio: true },
    { item: 'Distâncias de segurança respeitadas', categoria: 'Layout', obrigatorio: true },
    { item: 'Manutenção preventiva registrada e em dia', categoria: 'Manutenção', obrigatorio: false },
  ],
  'Vistoria estrutural': [
    { item: 'Ausência de fissuras e trincas aparentes', categoria: 'Estrutura', obrigatorio: true },
    { item: 'Cobertura sem infiltrações ou danos', categoria: 'Estrutura', obrigatorio: true },
    { item: 'Fundação aparentemente estável', categoria: 'Estrutura', obrigatorio: true },
    { item: 'Ausência de corrosão em elementos metálicos', categoria: 'Estrutura', obrigatorio: true },
    { item: 'Drenagem pluvial funcionando corretamente', categoria: 'Hidráulico', obrigatorio: false },
    { item: 'Documentação de obra e projeto disponível', categoria: 'Documental', obrigatorio: false },
  ],
  'Manutenção preventiva': [
    { item: 'Plano de manutenção preventiva atualizado', categoria: 'Documental', obrigatorio: true },
    { item: 'Lubrificação dos componentes em dia', categoria: 'Mecânico', obrigatorio: true },
    { item: 'Filtros e consumíveis dentro do prazo', categoria: 'Mecânico', obrigatorio: true },
    { item: 'Alinhamento e balanceamento verificados', categoria: 'Mecânico', obrigatorio: false },
    { item: 'Tensões e correntes dentro dos limites nominais', categoria: 'Elétrico', obrigatorio: true },
    { item: 'Temperatura de operação dentro do normal', categoria: 'Operacional', obrigatorio: true },
    { item: 'Ausência de vazamentos (óleo, água, gás)', categoria: 'Operacional', obrigatorio: true },
    { item: 'Ruídos e vibrações dentro do aceitável', categoria: 'Operacional', obrigatorio: false },
  ],
  'Análise de risco': [
    { item: 'APR (Análise Preliminar de Risco) elaborada', categoria: 'Documental', obrigatorio: true },
    { item: 'Riscos identificados e classificados por severidade', categoria: 'Análise', obrigatorio: true },
    { item: 'Medidas de controle propostas e documentadas', categoria: 'Controle', obrigatorio: true },
    { item: 'Responsáveis pelos controles definidos', categoria: 'Gestão', obrigatorio: true },
    { item: 'Prazos para implantação estabelecidos', categoria: 'Gestão', obrigatorio: false },
  ],
}

const CHECKLIST_GENERICO = [
  { item: 'EPI adequado disponível e utilizado', categoria: 'Segurança', obrigatorio: true },
  { item: 'Documentação técnica disponível no local', categoria: 'Documental', obrigatorio: false },
  { item: 'Sinalização de segurança presente', categoria: 'Segurança', obrigatorio: false },
  { item: 'Acesso seguro ao local de trabalho', categoria: 'Segurança', obrigatorio: true },
  { item: 'Condições gerais de limpeza adequadas', categoria: 'Higiene', obrigatorio: false },
]

const STATUS_PADRAO = [
  { parametro: 'Temperatura', valor: '', status: '' as const, unidade: '°C' },
  { parametro: 'Vibração', valor: '', status: '' as const, unidade: 'mm/s' },
  { parametro: 'Ruído', valor: '', status: '' as const, unidade: 'dB' },
  { parametro: 'Pressão', valor: '', status: '' as const, unidade: 'bar' },
  { parametro: 'Corrente elétrica', valor: '', status: '' as const, unidade: 'A' },
  { parametro: 'Tensão', valor: '', status: '' as const, unidade: 'V' },
]

const NORMAS = ['NR-06','NR-10','NR-12','NR-13','NR-33','NR-35','NR-17','NBR 5410','NBR 14039','NBR 6118','NBR 9050','ISO 9001','ISO 45001']
const TIPOS_SERVICO = ['Inspeção elétrica','Laudo NR-10','Laudo NR-12','Laudo NR-13','Vistoria estrutural','Análise de risco','Manutenção preventiva','Manutenção corretiva','Laudo de conformidade','Perícia técnica','Inspeção de equipamentos','Outro']
const INSALUBRIDADES = ['Agentes químicos','Poeira','Ruído excessivo','Calor extremo','Radiação','Agentes biológicos','Umidade excessiva','Vibração']

const gId = () => Math.random().toString(36).slice(2, 9)
const fBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const gerarChecklist = (tipo: string): ChecklistItem[] =>
  (CHECKLISTS[tipo] ?? CHECKLIST_GENERICO).map(i => ({ ...i, id: gId(), conforme: null, observacao: '' }))
const gerarStatus = (): StatusMaquina[] =>
  STATUS_PADRAO.map(s => ({ ...s, id: gId() }))

// ─── Componente ──────────────────────────────────────────────
export default function NovoLaudoPage() {
  const [secao, setSecao] = useState<Secao>('dados')
  const [fotos, setFotos] = useState<FotoItem[]>([])
  const [iaLoad, setIaLoad] = useState<string | null>(null)
  const [gerando, setGerando] = useState(false)
  const [busca, setBusca] = useState('')
  const [dropdown, setDropdown] = useState(false)
  const [empSel, setEmpSel] = useState<Empresa | null>(null)
  const [verHistorico, setVerHistorico] = useState(false)
  const fotoRef = useRef<HTMLInputElement>(null)

  const [f, setF] = useState<FormData>({
    empresaId: '', empresaNova: false,
    clienteNome: '', clienteCnpj: '', clienteEndereco: '', clienteContato: '', clienteEmail: '',
    dataVisita: new Date().toISOString().split('T')[0],
    tecnicoNome: '', tecnicoCrea: '',
    numeroLaudo: `${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
    tipoServico: '', urgencia: 'medio', normasAplicaveis: [], objetivoVisita: '',
    nivelDificuldade: '', trabalhoAltura: false, alturaMetros: '',
    ambienteInsalubre: false, tipoInsalubridade: [], atividadePesada: false,
    condicoesAmbientais: { temperatura: '', umidade: '', poeira: '', ruido: '' },
    diagnostico: '', diagnosticoExpandido: '',
    checklist: gerarChecklist(''), statusMaquina: gerarStatus(),
    recomendacoes: '', recomendacoesExpandidas: '', parecerFinal: '', prazoExecucao: '',
    horas: 0, valorHora: 0, valorMateriais: 0, valorDeslocamento: 0,
    adicionalInsalubridade: 0, adicionalAltura: 0, valorMinimo: 0,
    iaSugestaoValor: '', observacoesCobranca: '',
  })

  const set = (campo: keyof FormData, val: any) => setF(p => ({ ...p, [campo]: val }))

  useEffect(() => {
    if (f.tipoServico) setF(p => ({ ...p, checklist: gerarChecklist(p.tipoServico) }))
  }, [f.tipoServico])

  // Empresa
  const empsFiltradas = EMPRESAS_MOCK.filter(e =>
    e.nome.toLowerCase().includes(busca.toLowerCase()) || (e.cnpj ?? '').includes(busca)
  )

  function selEmp(emp: Empresa) {
    setEmpSel(emp); setBusca(emp.nome); setDropdown(false)
    setF(p => ({ ...p, empresaId: emp.id, empresaNova: false, clienteNome: emp.nome, clienteCnpj: emp.cnpj ?? '', clienteEndereco: emp.endereco ?? '', clienteContato: emp.contato ?? '' }))
  }

  function novaEmp() {
    setEmpSel(null); setDropdown(false)
    setF(p => ({ ...p, empresaId: '', empresaNova: true, clienteNome: busca, clienteCnpj: '', clienteEndereco: '', clienteContato: '' }))
  }

  // IA
  async function ia(prompt: string) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }),
    })
    return ((await r.json()).content?.[0]?.text ?? '') as string
  }

  async function expandirDiag() {
    if (!f.diagnostico.trim()) return
    setIaLoad('diag')
    try { set('diagnosticoExpandido', (await ia(`Você é redator técnico de laudos de engenharia no Brasil. Expanda em linguagem técnica formal, sem título:\nServiço: ${f.tipoServico} | Urgência: ${f.urgencia} | Normas: ${f.normasAplicaveis.join(', ')||'vigentes'}\nDiagnóstico: "${f.diagnostico}"`)).trim()) }
    finally { setIaLoad(null) }
  }

  async function expandirRec() {
    if (!f.recomendacoes.trim()) return
    setIaLoad('rec')
    try { set('recomendacoesExpandidas', (await ia(`Expanda as recomendações com prazos e justificativas técnicas, sem título:\nServiço: ${f.tipoServico} | Diagnóstico: "${f.diagnosticoExpandido||f.diagnostico}"\nRecomendações: "${f.recomendacoes}"`)).trim()) }
    finally { setIaLoad(null) }
  }

  async function gerarParecer() {
    setIaLoad('parecer')
    const nc = f.checklist.filter(c => c.conforme === false).map(c => c.item).join(', ')
    try { set('parecerFinal', (await ia(`Você é perito técnico sênior. Escreva APENAS o texto do parecer final de um laudo formal:\nServiço: ${f.tipoServico} | Empresa: ${f.clienteNome} | Urgência: ${f.urgencia}\nDificuldade: ${f.nivelDificuldade} | Altura: ${f.trabalhoAltura?f.alturaMetros+'m':'Não'} | Insalubre: ${f.ambienteInsalubre?f.tipoInsalubridade.join(','):'Não'}\nDiagnóstico: "${f.diagnosticoExpandido||f.diagnostico}"\nNão conformidades: ${nc||'Nenhuma crítica'} | Normas: ${f.normasAplicaveis.join(', ')||'vigentes'}`)).trim()) }
    finally { setIaLoad(null) }
  }

  async function sugerirNormas() {
    setIaLoad('normas')
    try {
      const txt = await ia(`Liste apenas os códigos das normas técnicas brasileiras relevantes para: ${f.tipoServico}. Apenas códigos separados por vírgula.`)
      set('normasAplicaveis', [...new Set([...f.normasAplicaveis, ...txt.split(',').map((n:string) => n.trim()).filter(Boolean)])])
    } finally { setIaLoad(null) }
  }

  async function sugerirValor() {
    setIaLoad('valor')
    try {
      const txt = await ia(`Você é consultor de precificação técnica de engenharia no Brasil (SP). Sugira valor mínimo. Responda APENAS JSON: {"valorMinimo": 1500, "justificativa": "texto"}\nServiço: ${f.tipoServico} | Urgência: ${f.urgencia} | Dificuldade: ${f.nivelDificuldade} | Altura: ${f.trabalhoAltura?'Sim '+f.alturaMetros+'m':'Não'} | Insalubre: ${f.ambienteInsalubre?'Sim':'Não'} | Pesado: ${f.atividadePesada?'Sim':'Não'} | NC: ${f.checklist.filter(c=>c.conforme===false).length} | Horas: ${f.horas} | Histórico: ${empSel?.valorMedioHistorico?fBRL(empSel.valorMedioHistorico):'sem histórico'}`)
      const p = JSON.parse(txt.replace(/```json|```/g, '').trim())
      set('valorMinimo', p.valorMinimo); set('iaSugestaoValor', p.justificativa)
    } catch { set('iaSugestaoValor', 'Preencha mais campos para uma sugestão precisa.') }
    finally { setIaLoad(null) }
  }

  async function legendaFoto(fotoId: string, preview: string) {
    setFotos(fs => fs.map(f => f.id === fotoId ? { ...f, iaLoading: true } : f))
    try {
      const b64 = preview.split(',')[1]
      const mt = preview.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mt, data: b64 } }, { type: 'text', text: `Descreva tecnicamente esta foto para laudo de ${f.tipoServico||'inspeção'}. 2 frases objetivas. Apenas a descrição.` }] }] }),
      })
      const legenda = (await r.json()).content?.[0]?.text?.trim() ?? ''
      setFotos(fs => fs.map(f => f.id === fotoId ? { ...f, legenda, iaLoading: false } : f))
    } catch { setFotos(fs => fs.map(f => f.id === fotoId ? { ...f, iaLoading: false } : f)) }
  }

  // Fotos
  function addFotos(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files ?? []).forEach(file => {
      const r = new FileReader()
      r.onload = ev => setFotos(fs => [...fs, { id: gId(), file, preview: ev.target?.result as string, legenda: '', iaLoading: false }])
      r.readAsDataURL(file)
    })
  }

  // Checklist
  const setCI = (id: string, campo: keyof ChecklistItem, val: any) =>
    set('checklist', f.checklist.map((c: ChecklistItem) => c.id === id ? { ...c, [campo]: val } : c))

  // Status máquina
  const setSM = (id: string, campo: keyof StatusMaquina, val: any) =>
    set('statusMaquina', f.statusMaquina.map((s: StatusMaquina) => s.id === id ? { ...s, [campo]: val } : s))

  const toggle = (lista: keyof FormData, val: string) => {
    const atual = f[lista] as string[]
    set(lista, atual.includes(val) ? atual.filter((x: string) => x !== val) : [...atual, val])
  }

  const toggleSwitch = (campo: keyof FormData) => set(campo, !(f[campo] as boolean))

  // Totais
  const subtotal = f.horas * f.valorHora + f.valorMateriais + f.valorDeslocamento + f.adicionalInsalubridade + f.adicionalAltura
  const total = Math.max(subtotal, f.valorMinimo)
  const conformes = f.checklist.filter((c: ChecklistItem) => c.conforme === true).length
  const naoC = f.checklist.filter((c: ChecklistItem) => c.conforme === false).length
  const naC = f.checklist.filter((c: ChecklistItem) => c.conforme === 'na').length

  const secoes = [
    { id: 'dados' as Secao, label: 'Dados da visita', icon: '🏢' },
    { id: 'servico' as Secao, label: 'Tipo de serviço', icon: '🔧' },
    { id: 'diagnostico' as Secao, label: 'Diagnóstico', icon: '🔍' },
    { id: 'checklist' as Secao, label: 'Checklist', icon: '✅' },
    { id: 'fotos' as Secao, label: 'Fotos', icon: '📷' },
    { id: 'parecer' as Secao, label: 'Parecer final', icon: '📝' },
    { id: 'cobranca' as Secao, label: 'Cobrança', icon: '💰' },
  ]

  const sCorBadge: Record<string, string> = {
    normal: 'bg-green-100 text-green-700',
    atencao: 'bg-amber-100 text-amber-700',
    critico: 'bg-red-100 text-red-700',
    '': 'bg-gray-100 text-gray-400',
  }

  const nav = (s: Secao) => setSecao(s)

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-700 text-sm">← Dashboard</Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-900">Novo laudo</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-mono">#{f.numeroLaudo}</span>
          </div>
          <div className="flex gap-2">
            <button className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">Salvar rascunho</button>
            <button disabled={gerando} className="text-sm px-4 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium">
              {gerando ? 'Gerando...' : '↓ Gerar PDF'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="w-48 shrink-0">
          <nav className="space-y-1 sticky top-20">
            {secoes.map(s => (
              <button key={s.id} onClick={() => nav(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition ${secao === s.id ? 'bg-gray-900 text-white font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                {s.icon} {s.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 space-y-4">

          {/* ── DADOS ── */}
          {secao === 'dados' && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold">Dados da visita</h2>

              {/* Busca empresa */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Empresa cliente *</label>
                <div className="relative">
                  <input value={busca} onChange={e => { setBusca(e.target.value); setDropdown(true); setEmpSel(null) }}
                    onFocus={() => setDropdown(true)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Digite para buscar empresa cadastrada..." />
                  {empSel && <span className="absolute right-3 top-2.5 text-xs text-green-500">✓</span>}

                  {dropdown && busca.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30">
                      {empsFiltradas.map(e => (
                        <button key={e.id} onClick={() => selEmp(e)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                          <p className="text-sm font-medium">{e.nome}</p>
                          <p className="text-xs text-gray-400">{e.cnpj} · {e.contato}</p>
                          {(e.valorMedioHistorico ?? 0) > 0 && (
                            <p className="text-xs text-blue-600">Histórico: {fBRL(e.valorMedioHistorico!)} médio</p>
                          )}
                        </button>
                      ))}
                      <button onClick={novaEmp} className="w-full text-left px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 font-medium">
                        + Cadastrar "{busca}" como nova empresa
                      </button>
                    </div>
                  )}
                </div>

                {/* Card empresa selecionada */}
                {empSel && (
                  <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{empSel.nome}</p>
                        <p className="text-xs text-gray-500">{empSel.cnpj}</p>
                        <p className="text-xs text-gray-500">{empSel.endereco}</p>
                        <p className="text-xs text-gray-500">{empSel.contato}</p>
                      </div>
                      <button onClick={() => setVerHistorico(v => !v)} className="text-xs text-blue-600 hover:underline">
                        {verHistorico ? 'Ocultar' : 'Ver histórico'}
                      </button>
                    </div>
                    {verHistorico && (empSel.ultimosLaudos?.length ?? 0) > 0 && (
                      <div className="mt-3 pt-3 border-t border-blue-100 space-y-1">
                        {empSel.ultimosLaudos!.map(l => (
                          <div key={l.numero} className="flex justify-between text-xs text-gray-500">
                            <span>#{l.numero} · {l.tipo} · {l.data}</span>
                            <span className="font-medium">{fBRL(l.valor)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-semibold text-blue-700 pt-1 border-t border-blue-100">
                          <span>Média histórica</span><span>{fBRL(empSel.valorMedioHistorico!)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Nova empresa */}
                {f.empresaNova && (
                  <div className="mt-3 border border-dashed border-gray-300 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-medium text-gray-600">Nova empresa:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs text-gray-400 block mb-1">CNPJ</label>
                        <input value={f.clienteCnpj} onChange={e => set('clienteCnpj', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="00.000.000/0001-00" /></div>
                      <div><label className="text-xs text-gray-400 block mb-1">Contato</label>
                        <input value={f.clienteContato} onChange={e => set('clienteContato', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Nome e telefone" /></div>
                      <div className="col-span-2"><label className="text-xs text-gray-400 block mb-1">Endereço</label>
                        <input value={f.clienteEndereco} onChange={e => set('clienteEndereco', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Rua, número, cidade - UF" /></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div><label className="text-xs text-gray-500 block mb-1">Data da visita *</label>
                  <input type="date" value={f.dataVisita} onChange={e => set('dataVisita', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Técnico responsável *</label>
                  <input value={f.tecnicoNome} onChange={e => set('tecnicoNome', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Nome completo" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">CREA / CAU</label>
                  <input value={f.tecnicoCrea} onChange={e => set('tecnicoCrea', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="XX-000000-0" /></div>
              </div>

              <div className="flex justify-end">
                <button onClick={() => nav('servico')} className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800">Próximo →</button>
              </div>
            </div>
          )}

          {/* ── SERVIÇO ── */}
          {secao === 'servico' && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold">Tipo de serviço e classificação</h2>

              <div>
                <label className="text-xs text-gray-500 block mb-2">Tipo de serviço *</label>
                <div className="flex flex-wrap gap-2">
                  {TIPOS_SERVICO.map(t => (
                    <button key={t} onClick={() => set('tipoServico', t)}
                      className={`text-sm px-3 py-1.5 rounded-full border transition ${f.tipoServico === t ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>{t}</button>
                  ))}
                </div>
                {f.tipoServico && <p className="text-xs text-blue-600 mt-2">✓ Checklist atualizado para <strong>{f.tipoServico}</strong></p>}
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-2">Urgência *</label>
                <div className="grid grid-cols-4 gap-2">
                  {['baixo','medio','alto','critico'].map(u => (
                    <button key={u} onClick={() => set('urgencia', u as Urgencia)}
                      className={`py-2 rounded-lg border text-sm font-medium transition ${f.urgencia === u ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                      {u === 'medio' ? 'Médio' : u.charAt(0).toUpperCase() + u.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-2">Nível de dificuldade</label>
                <div className="grid grid-cols-4 gap-2">
                  {[['simples','Simples'],['moderado','Moderado'],['complexo','Complexo'],['muito_complexo','Muito complexo']].map(([v,l]) => (
                    <button key={v} onClick={() => set('nivelDificuldade', v)}
                      className={`py-2 rounded-lg border text-sm transition ${f.nivelDificuldade === v ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>{l}</button>
                  ))}
                </div>
              </div>

              {/* Condições especiais */}
              <div className="space-y-3">
                <label className="text-xs text-gray-500 block">Condições especiais</label>

                {/* Altura */}
                <div className={`border rounded-xl p-4 ${f.trabalhoAltura ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🪜</span>
                      <div><p className="text-sm font-medium">Trabalho em altura</p><p className="text-xs text-gray-400">Acima de 2m · NR-35</p></div>
                    </div>
                    <button onClick={() => toggleSwitch('trabalhoAltura')}
                      className={`w-10 h-5 rounded-full transition-colors relative ${f.trabalhoAltura ? 'bg-orange-500' : 'bg-gray-200'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${f.trabalhoAltura ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {f.trabalhoAltura && (
                    <div className="mt-3 flex items-center gap-2">
                      <input type="number" value={f.alturaMetros} onChange={e => set('alturaMetros', e.target.value)}
                        className="w-24 border border-orange-200 rounded-lg px-3 py-1.5 text-sm" placeholder="0" />
                      <span className="text-sm text-gray-500">metros</span>
                    </div>
                  )}
                </div>

                {/* Insalubridade */}
                <div className={`border rounded-xl p-4 ${f.ambienteInsalubre ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">☣️</span>
                      <div><p className="text-sm font-medium">Ambiente insalubre</p><p className="text-xs text-gray-400">Agentes físicos, químicos ou biológicos</p></div>
                    </div>
                    <button onClick={() => toggleSwitch('ambienteInsalubre')}
                      className={`w-10 h-5 rounded-full transition-colors relative ${f.ambienteInsalubre ? 'bg-yellow-500' : 'bg-gray-200'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${f.ambienteInsalubre ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {f.ambienteInsalubre && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {INSALUBRIDADES.map(ins => (
                        <button key={ins} onClick={() => toggle('tipoInsalubridade', ins)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition ${f.tipoInsalubridade.includes(ins) ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>{ins}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pesado */}
                <div className={`border rounded-xl p-4 ${f.atividadePesada ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">💪</span>
                      <div><p className="text-sm font-medium">Atividade física pesada</p><p className="text-xs text-gray-400">Esforço intenso, cargas, confinado</p></div>
                    </div>
                    <button onClick={() => toggleSwitch('atividadePesada')}
                      className={`w-10 h-5 rounded-full transition-colors relative ${f.atividadePesada ? 'bg-red-500' : 'bg-gray-200'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${f.atividadePesada ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Condições ambientais */}
              <div>
                <label className="text-xs text-gray-500 block mb-2">Condições ambientais no momento da visita</label>
                <div className="grid grid-cols-4 gap-3">
                  {[['temperatura','Temperatura','°C'],['umidade','Umidade','%'],['poeira','Poeira',''],['ruido','Ruído','dB']].map(([c,l,u]) => (
                    <div key={c}>
                      <label className="text-xs text-gray-400 block mb-1">{l}</label>
                      <div className="flex">
                        <input value={(f.condicoesAmbientais as any)[c]} onChange={e => set('condicoesAmbientais', { ...f.condicoesAmbientais, [c]: e.target.value })}
                          className="flex-1 border border-gray-200 rounded-l-lg px-2 py-1.5 text-sm min-w-0" placeholder="—" />
                        {u && <span className="border border-l-0 border-gray-200 rounded-r-lg px-2 py-1.5 text-xs text-gray-400 bg-gray-50">{u}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Normas */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs text-gray-500">Normas aplicáveis</label>
                  <button onClick={sugerirNormas} disabled={!f.tipoServico || iaLoad === 'normas'} className="text-xs text-blue-600 hover:underline disabled:opacity-50">
                    {iaLoad === 'normas' ? '⏳ Sugerindo...' : '✨ Sugerir com IA'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {NORMAS.map(n => (
                    <button key={n} onClick={() => toggle('normasAplicaveis', n)}
                      className={`text-xs px-2.5 py-1 rounded border transition ${f.normasAplicaveis.includes(n) ? 'bg-blue-50 text-blue-700 border-blue-200' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>{n}</button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={() => nav('dados')} className="text-sm text-gray-500 hover:text-gray-900">← Anterior</button>
                <button onClick={() => nav('diagnostico')} className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800">Próximo →</button>
              </div>
            </div>
          )}

          {/* ── DIAGNÓSTICO ── */}
          {secao === 'diagnostico' && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold">Diagnóstico técnico</h2>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Diagnóstico resumido <span className="text-gray-400">(escreva simples, IA expande)</span></label>
                <textarea value={f.diagnostico} onChange={e => set('diagnostico', e.target.value)} rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ex: bomba de água queimada, rolamento com folga, painel com fios mal conectados, local sujo com alta vibração..." />
                <button onClick={expandirDiag} disabled={!f.diagnostico.trim() || iaLoad === 'diag'} className="mt-2 text-sm text-blue-600 hover:underline disabled:opacity-50">
                  {iaLoad === 'diag' ? '⏳ Expandindo com IA...' : '✨ Expandir com IA'}
                </button>
              </div>
              {f.diagnosticoExpandido && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Expandido pela IA <span className="text-gray-400">(edite se necessário)</span></label>
                  <textarea value={f.diagnosticoExpandido} onChange={e => set('diagnosticoExpandido', e.target.value)} rows={8}
                    className="w-full border border-blue-200 bg-blue-50/30 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Objetivo da visita</label>
                <textarea value={f.objetivoVisita} onChange={e => set('objetivoVisita', e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Objetivo desta visita técnica..." />
              </div>
              <div className="flex justify-between">
                <button onClick={() => nav('servico')} className="text-sm text-gray-500">← Anterior</button>
                <button onClick={() => nav('checklist')} className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800">Próximo →</button>
              </div>
            </div>
          )}

          {/* ── CHECKLIST + STATUS ── */}
          {secao === 'checklist' && (
            <div className="space-y-4">
              {/* Checklist */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Checklist de conformidade</h2>
                    {f.tipoServico && <p className="text-xs text-blue-600">Itens para: {f.tipoServico}</p>}
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">{conformes} C</span>
                    <span className="bg-red-50 text-red-700 px-2 py-1 rounded-full font-medium">{naoC} NC</span>
                    <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-medium">{naC} N/A</span>
                  </div>
                </div>

                {Array.from(new Set(f.checklist.map((c: ChecklistItem) => c.categoria))).map(cat => (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat}</p>
                    <div className="space-y-2">
                      {f.checklist.filter((c: ChecklistItem) => c.categoria === cat).map((item: ChecklistItem) => (
                        <div key={item.id} className={`border rounded-xl p-3 transition ${item.conforme === true ? 'border-green-200 bg-green-50/20' : item.conforme === false ? 'border-red-200 bg-red-50/20' : item.conforme === 'na' ? 'border-gray-200 bg-gray-50' : 'border-gray-200'}`}>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 flex items-center gap-1">
                              {item.obrigatorio && <span className="text-red-400 text-xs shrink-0" title="Obrigatório">*</span>}
                              <input value={item.item} onChange={e => setCI(item.id, 'item', e.target.value)}
                                className="flex-1 text-sm bg-transparent outline-none" placeholder="Descreva o item..." />
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {[{ v: true as const, l: 'C', t: 'Conforme', a: item.conforme === true, ac: 'bg-green-600 text-white border-green-600', ic: 'border-gray-200 text-gray-400 hover:border-green-400' },
                                { v: false as const, l: 'NC', t: 'Não conforme', a: item.conforme === false, ac: 'bg-red-500 text-white border-red-500', ic: 'border-gray-200 text-gray-400 hover:border-red-400' },
                                { v: 'na' as const, l: 'N/A', t: 'Não aplicável', a: item.conforme === 'na', ac: 'bg-gray-500 text-white border-gray-500', ic: 'border-gray-200 text-gray-400 hover:border-gray-400' },
                              ].map(btn => (
                                <button key={btn.l} title={btn.t}
                                  onClick={() => setCI(item.id, 'conforme', item.conforme === btn.v ? null : btn.v)}
                                  className={`px-1.5 h-7 rounded text-xs font-medium border transition ${btn.a ? btn.ac : btn.ic}`}>{btn.l}</button>
                              ))}
                            </div>
                          </div>
                          {item.conforme === false && (
                            <input value={item.observacao} onChange={e => setCI(item.id, 'observacao', e.target.value)}
                              className="mt-2 w-full text-xs border border-red-200 rounded-lg px-2 py-1.5 bg-white"
                              placeholder="Descreva a não conformidade..." />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <button onClick={() => set('checklist', [...f.checklist, { id: gId(), item: '', categoria: 'Geral', conforme: null, observacao: '', obrigatorio: false }])}
                  className="w-full border border-dashed border-gray-300 rounded-xl py-2.5 text-sm text-gray-500 hover:border-gray-500 transition">
                  + Adicionar item
                </button>
              </div>

              {/* Status da máquina */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="text-base font-semibold">Relatório de status do equipamento</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Registre parâmetros medidos. Adicione qualquer campo relevante.</p>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 font-medium px-1">
                    <span className="col-span-4">Parâmetro</span>
                    <span className="col-span-3">Valor medido</span>
                    <span className="col-span-2">Unidade</span>
                    <span className="col-span-3">Status</span>
                  </div>
                  {f.statusMaquina.map((s: StatusMaquina) => (
                    <div key={s.id} className={`grid grid-cols-12 gap-2 items-center border rounded-xl p-2.5 ${s.status === 'critico' ? 'border-red-200 bg-red-50/20' : s.status === 'atencao' ? 'border-amber-200 bg-amber-50/20' : s.status === 'normal' ? 'border-green-200 bg-green-50/10' : 'border-gray-200'}`}>
                      <input value={s.parametro} onChange={e => setSM(s.id, 'parametro', e.target.value)}
                        className="col-span-4 text-sm bg-transparent outline-none" placeholder="Ex: Temperatura motor" />
                      <input value={s.valor} onChange={e => setSM(s.id, 'valor', e.target.value)}
                        className="col-span-3 text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white" placeholder="75" />
                      <input value={s.unidade} onChange={e => setSM(s.id, 'unidade', e.target.value)}
                        className="col-span-2 text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white" placeholder="°C" />
                      <div className="col-span-3 flex gap-1">
                        {(['normal','atencao','critico'] as const).map(st => (
                          <button key={st} onClick={() => setSM(s.id, 'status', s.status === st ? '' : st)}
                            className={`flex-1 text-xs py-1 rounded-lg border transition font-medium ${s.status === st ? sCorBadge[st] + ' border-transparent' : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}>
                            {st === 'normal' ? '✓' : st === 'atencao' ? '!' : '✕'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => set('statusMaquina', [...f.statusMaquina, { id: gId(), parametro: '', valor: '', status: '', unidade: '' }])}
                  className="w-full border border-dashed border-gray-300 rounded-xl py-2.5 text-sm text-gray-500 hover:border-gray-500 transition">
                  + Adicionar parâmetro
                </button>

                {f.statusMaquina.some((s: StatusMaquina) => s.status) && (
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {[['normal','Normal','bg-green-50 text-green-700 border-green-200'],['atencao','Atenção','bg-amber-50 text-amber-700 border-amber-200'],['critico','Crítico','bg-red-50 text-red-700 border-red-200']].map(([st,lb,cl]) => (
                      <div key={st} className={`border rounded-xl p-3 text-center ${cl}`}>
                        <p className="text-xl font-bold">{f.statusMaquina.filter((s: StatusMaquina) => s.status === st).length}</p>
                        <p className="text-xs font-medium">{lb}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button onClick={() => nav('diagnostico')} className="text-sm text-gray-500">← Anterior</button>
                <button onClick={() => nav('fotos')} className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800">Próximo →</button>
              </div>
            </div>
          )}

          {/* ── FOTOS ── */}
          {secao === 'fotos' && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-semibold">Registros fotográficos</h2>
              <div onClick={() => fotoRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 transition">
                <p className="text-3xl mb-2">📷</p>
                <p className="text-sm font-medium text-gray-600">Clique para adicionar fotos</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG — múltiplos arquivos</p>
                <input ref={fotoRef} type="file" accept="image/*" multiple className="hidden" onChange={addFotos} />
              </div>
              {fotos.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {fotos.map(foto => (
                    <div key={foto.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="relative">
                        <img src={foto.preview} alt="" className="w-full h-44 object-cover" />
                        <button onClick={() => setFotos(fs => fs.filter(f => f.id !== foto.id))}
                          className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full border border-gray-200 text-xs text-gray-500 hover:text-red-500 flex items-center justify-center shadow">✕</button>
                      </div>
                      <div className="p-3 space-y-2">
                        <textarea value={foto.legenda} onChange={e => setFotos(fs => fs.map(f => f.id === foto.id ? { ...f, legenda: e.target.value } : f))}
                          rows={2} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5" placeholder="Legenda da foto..." />
                        <button onClick={() => legendaFoto(foto.id, foto.preview)} disabled={foto.iaLoading}
                          className="text-xs text-blue-600 hover:underline disabled:opacity-50">
                          {foto.iaLoading ? '⏳ Gerando legenda...' : '✨ Gerar legenda com IA'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between">
                <button onClick={() => nav('checklist')} className="text-sm text-gray-500">← Anterior</button>
                <button onClick={() => nav('parecer')} className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800">Próximo →</button>
              </div>
            </div>
          )}

          {/* ── PARECER ── */}
          {secao === 'parecer' && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold">Recomendações e parecer final</h2>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Recomendações <span className="text-gray-400">(resumo — IA detalha)</span></label>
                <textarea value={f.recomendacoes} onChange={e => set('recomendacoes', e.target.value)} rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ex: trocar rolamento, limpar painel, instalar proteção..." />
                <button onClick={expandirRec} disabled={!f.recomendacoes.trim() || iaLoad === 'rec'} className="mt-2 text-sm text-blue-600 hover:underline disabled:opacity-50">
                  {iaLoad === 'rec' ? '⏳ Expandindo...' : '✨ Expandir com IA'}
                </button>
              </div>
              {f.recomendacoesExpandidas && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Recomendações detalhadas pela IA</label>
                  <textarea value={f.recomendacoesExpandidas} onChange={e => set('recomendacoesExpandidas', e.target.value)} rows={6}
                    className="w-full border border-blue-200 bg-blue-50/30 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-gray-500">Parecer técnico final</label>
                  <button onClick={gerarParecer} disabled={iaLoad === 'parecer'} className="text-xs text-blue-600 hover:underline disabled:opacity-50">
                    {iaLoad === 'parecer' ? '⏳ Gerando...' : '✨ Gerar parecer completo com IA'}
                  </button>
                </div>
                <textarea value={f.parecerFinal} onChange={e => set('parecerFinal', e.target.value)} rows={7}
                  className={`w-full rounded-lg px-3 py-2 text-sm border ${f.parecerFinal ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}
                  placeholder="O parecer será gerado pela IA com base em todos os dados preenchidos..." />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Prazo para execução</label>
                <input value={f.prazoExecucao} onChange={e => set('prazoExecucao', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ex: Imediato, 30 dias, 90 dias..." />
              </div>
              <div className="flex justify-between">
                <button onClick={() => nav('fotos')} className="text-sm text-gray-500">← Anterior</button>
                <button onClick={() => nav('cobranca')} className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800">Próximo →</button>
              </div>
            </div>
          )}

          {/* ── COBRANÇA ── */}
          {secao === 'cobranca' && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold">Estimativa de cobrança</h2>

              <div className="grid grid-cols-2 gap-4">
                {[['Horas trabalhadas','horas'],['Valor por hora (R$)','valorHora'],['Materiais / insumos (R$)','valorMateriais'],['Deslocamento (R$)','valorDeslocamento']].map(([l,c]) => (
                  <div key={c}>
                    <label className="text-xs text-gray-500 block mb-1">{l}</label>
                    <input type="number" value={(f as any)[c] || ''} onChange={e => set(c as keyof FormData, +e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0" />
                  </div>
                ))}
                {f.ambienteInsalubre && (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">☣️ Adicional insalubridade (R$)</label>
                    <input type="number" value={f.adicionalInsalubridade || ''} onChange={e => set('adicionalInsalubridade', +e.target.value)}
                      className="w-full border border-yellow-200 bg-yellow-50/20 rounded-lg px-3 py-2 text-sm" placeholder="0" />
                  </div>
                )}
                {f.trabalhoAltura && (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">🪜 Adicional altura (R$)</label>
                    <input type="number" value={f.adicionalAltura || ''} onChange={e => set('adicionalAltura', +e.target.value)}
                      className="w-full border border-orange-200 bg-orange-50/20 rounded-lg px-3 py-2 text-sm" placeholder="0" />
                  </div>
                )}
              </div>

              {/* Valor mínimo */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Valor mínimo de cobrança</label>
                  <button onClick={sugerirValor} disabled={iaLoad === 'valor'} className="text-xs text-blue-600 hover:underline disabled:opacity-50">
                    {iaLoad === 'valor' ? '⏳ Analisando...' : '✨ IA sugerir valor mínimo'}
                  </button>
                </div>
                <input type="number" value={f.valorMinimo || ''} onChange={e => set('valorMinimo', +e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0,00" />
                {f.iaSugestaoValor && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-700 mb-0.5">Justificativa da IA:</p>
                    <p className="text-xs text-blue-800">{f.iaSugestaoValor}</p>
                  </div>
                )}
              </div>

              {/* Resumo */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
                {[
                  [`Mão de obra (${f.horas}h × ${fBRL(f.valorHora)})`, f.horas * f.valorHora],
                  ['Materiais', f.valorMateriais],
                  ['Deslocamento', f.valorDeslocamento],
                  ...(f.adicionalInsalubridade ? [['Adicional insalubridade', f.adicionalInsalubridade]] : []),
                  ...(f.adicionalAltura ? [['Adicional altura', f.adicionalAltura]] : []),
                ].map(([l, v]) => (
                  <div key={String(l)} className="flex justify-between text-sm text-gray-600">
                    <span>{l}</span><span>{fBRL(Number(v))}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 space-y-1">
                  <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{fBRL(subtotal)}</span></div>
                  {f.valorMinimo > subtotal && (
                    <div className="flex justify-between text-xs text-amber-600"><span>Valor mínimo aplicado</span><span>+{fBRL(f.valorMinimo - subtotal)}</span></div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 text-lg"><span>Total</span><span>{fBRL(total)}</span></div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Observações de cobrança</label>
                <textarea value={f.observacoesCobranca} onChange={e => set('observacoesCobranca', e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Condições de pagamento, prazo, forma..." />
              </div>

              <div className="flex justify-between">
                <button onClick={() => nav('parecer')} className="text-sm text-gray-500">← Anterior</button>
                <button className="bg-gray-900 text-white text-sm px-6 py-2 rounded-lg hover:bg-gray-800 font-medium">↓ Gerar laudo em PDF</button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}