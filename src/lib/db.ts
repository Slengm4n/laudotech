// src/lib/db.ts
// Funções reutilizáveis para acessar o banco via Supabase
// Use no servidor (Server Components, API Routes)

import { createClient } from './supabase/server'
import type { NovoLaudoForm, StatusCobranca, StatusLaudo } from './types'

// ─── LAUDOS ────────────────────────────────────────────────

export async function getLaudos(filtros?: { status?: StatusLaudo; cliente_id?: string }) {
  const supabase = await createClient()

  let query = supabase
    .from('laudos_completos')
    .select('*')
    .order('criado_em', { ascending: false })

  if (filtros?.status) query = query.eq('status', filtros.status)
  if (filtros?.cliente_id) query = query.eq('cliente_id', filtros.cliente_id)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getLaudoById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('laudos_completos')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function criarLaudo(form: NovoLaudoForm) {
  const supabase = await createClient()

  // Se vier cliente novo, cadastra antes
  let clienteId = form.cliente_id
  if (!clienteId && form.cliente_nome_novo) {
    const { data: novoCliente, error: errCliente } = await supabase
      .from('clientes')
      .insert({ nome: form.cliente_nome_novo, cnpj: form.cliente_cnpj_novo })
      .select()
      .single()
    if (errCliente) throw errCliente
    clienteId = novoCliente.id
  }

  const { data, error } = await supabase
    .from('laudos')
    .insert({
      cliente_id: clienteId,
      tipo_servico: form.tipo_servico,
      diagnostico: form.diagnostico,
      recomendacoes: form.recomendacoes,
      urgencia: form.urgencia,
      data_visita: form.data_visita,
      tecnico_nome: form.tecnico_nome,
      tecnico_crea: form.tecnico_crea,
      horas: form.horas,
      valor_hora: form.valor_hora,
      valor_materiais: form.valor_materiais,
      observacoes: form.observacoes,
      status: 'rascunho',
    })
    .select()
    .single()

  if (error) throw error

  // Cria cobrança automaticamente
  await supabase.from('cobrancas').insert({
    laudo_id: data.id,
    cliente_id: clienteId,
    valor: data.valor_total,
    status: 'pendente',
    data_emissao: new Date().toISOString().split('T')[0],
  })

  return data
}

export async function atualizarStatusLaudo(id: string, status: StatusLaudo, pdfUrl?: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('laudos')
    .update({ status, ...(pdfUrl ? { pdf_url: pdfUrl } : {}), atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── CLIENTES ───────────────────────────────────────────────

export async function getClientes() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nome')
  if (error) throw error
  return data
}

// ─── FINANCEIRO ─────────────────────────────────────────────

export async function getResumoFinanceiro() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resumo_financeiro_mensal')
    .select('*')
    .limit(12)
  if (error) throw error
  return data
}

export async function getCobrancas(filtros?: { status?: StatusCobranca }) {
  const supabase = await createClient()
  let query = supabase
    .from('cobrancas')
    .select('*, laudos(numero, tipo_servico), clientes(nome)')
    .order('criado_em', { ascending: false })
  if (filtros?.status) query = query.eq('status', filtros.status)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function marcarCobrancaPaga(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cobrancas')
    .update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── IMAGENS ────────────────────────────────────────────────

export async function uploadImagem(laudoId: string, file: File) {
  const supabase = await createClient()

  const caminho = `laudos/${laudoId}/${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage
    .from('laudos')
    .upload(caminho, file)
  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from('laudos').getPublicUrl(caminho)

  const { data, error } = await supabase
    .from('imagens_laudo')
    .insert({ laudo_id: laudoId, url: urlData.publicUrl })
    .select()
    .single()
  if (error) throw error
  return data
}