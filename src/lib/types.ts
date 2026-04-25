// src/lib/types.ts
// Tipos TypeScript que espelham as tabelas do Supabase

export type Urgencia = 'baixo' | 'medio' | 'alto' | 'critico'
export type StatusLaudo = 'rascunho' | 'concluido' | 'cancelado'
export type StatusCobranca = 'pendente' | 'pago' | 'cancelado'

export interface Cliente {
  id: string
  nome: string
  cnpj?: string
  email?: string
  telefone?: string
  endereco?: string
  criado_em: string
  atualizado_em: string
}

export interface Laudo {
  id: string
  numero: number
  cliente_id?: string
  tipo_servico: string
  diagnostico?: string
  recomendacoes?: string
  urgencia: Urgencia
  data_visita: string
  tecnico_nome?: string
  tecnico_crea?: string
  status: StatusLaudo
  pdf_url?: string
  horas: number
  valor_hora: number
  valor_materiais: number
  valor_total: number        // coluna gerada (horas * valor_hora + materiais)
  observacoes?: string
  criado_em: string
  atualizado_em: string
}

export interface ImagemLaudo {
  id: string
  laudo_id: string
  url: string
  legenda?: string
  ordem: number
  criado_em: string
}

export interface Cobranca {
  id: string
  laudo_id: string
  cliente_id?: string
  valor: number
  status: StatusCobranca
  data_emissao: string
  data_vencimento?: string
  data_pagamento?: string
  forma_pagamento?: string
  observacoes?: string
  criado_em: string
}

// View: laudo com dados do cliente e cobrança
export interface LaudoCompleto extends Laudo {
  cliente_nome?: string
  cliente_cnpj?: string
  cliente_email?: string
  cliente_telefone?: string
  cobranca_status?: StatusCobranca
  cobranca_valor?: number
  data_pagamento?: string
}

// Para formulário de novo laudo
export interface NovoLaudoForm {
  cliente_id?: string
  cliente_nome_novo?: string  // se cadastrar cliente na hora
  cliente_cnpj_novo?: string
  tipo_servico: string
  diagnostico: string
  recomendacoes: string
  urgencia: Urgencia
  data_visita: string
  tecnico_nome: string
  tecnico_crea: string
  horas: number
  valor_hora: number
  valor_materiais: number
  observacoes?: string
}