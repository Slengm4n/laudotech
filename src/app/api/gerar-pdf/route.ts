// src/app/api/gerar-pdf/route.ts
// Recebe o ID do laudo, busca os dados e gera o PDF

import { NextRequest, NextResponse } from 'next/server'
import { getLaudoById } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { laudoId } = await req.json()
    if (!laudoId) return NextResponse.json({ error: 'laudoId obrigatório' }, { status: 400 })

    const laudo = await getLaudoById(laudoId)
    if (!laudo) return NextResponse.json({ error: 'Laudo não encontrado' }, { status: 404 })

    // Busca imagens do laudo
    const supabase = await createClient()
    const { data: imagens } = await supabase
      .from('imagens_laudo')
      .select('url, legenda')
      .eq('laudo_id', laudoId)
      .order('ordem')

    // HTML do laudo com o template da empresa
    const html = gerarHtmlLaudo(laudo, imagens ?? [])

    // Gera o PDF usando Puppeteer (funciona no Vercel com @sparticuz/chromium)
    const chromium = await import('@sparticuz/chromium').then(m => m.default)
    const puppeteer = await import('puppeteer-core').then(m => m.default)

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
      printBackground: true,
    })
    await browser.close()

    // Upload do PDF para o Supabase Storage
    const caminho = `pdfs/laudo-${laudo.numero.toString().padStart(3,'0')}.pdf`
    await supabase.storage.from('laudos').upload(caminho, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

    const { data: urlData } = supabase.storage.from('laudos').getPublicUrl(caminho)

    // Atualiza o laudo com a URL do PDF e muda para concluído
    await supabase
      .from('laudos')
      .update({ pdf_url: urlData.publicUrl, status: 'concluido' })
      .eq('id', laudoId)

    return NextResponse.json({ pdfUrl: urlData.publicUrl })
  } catch (err) {
    console.error('Erro ao gerar PDF:', err)
    return NextResponse.json({ error: 'Erro interno ao gerar PDF' }, { status: 500 })
  }
}

// ─── Template HTML do laudo ─────────────────────────────────
function gerarHtmlLaudo(laudo: any, imagens: any[]) {
  const urgenciaCor: Record<string, string> = {
    baixo: '#16a34a', medio: '#d97706', alto: '#ea580c', critico: '#dc2626'
  }
  const cor = urgenciaCor[laudo.urgencia] ?? '#374151'
  const dataFormatada = new Date(laudo.data_visita + 'T12:00:00').toLocaleDateString('pt-BR')
  const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(laudo.valor_total)

  const imagensHtml = imagens.map(img => `
    <div style="margin-bottom:12px;">
      <img src="${img.url}" style="max-width:100%;border-radius:6px;border:1px solid #e5e7eb;" />
      ${img.legenda ? `<p style="font-size:11px;color:#6b7280;margin-top:4px;text-align:center;">${img.legenda}</p>` : ''}
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; font-size: 13px; line-height: 1.6; }
    .header { border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .empresa-nome { font-size: 20px; font-weight: 700; }
    .empresa-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .laudo-numero { font-size: 14px; font-weight: 600; text-align: right; }
    .laudo-data { font-size: 11px; color: #6b7280; text-align: right; margin-top: 2px; }
    .secao { margin-bottom: 20px; }
    .secao-titulo { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 10px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .campo-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
    .campo-val { font-size: 13px; font-weight: 500; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; color: white; }
    .texto-bloco { background: #f9fafb; border-left: 3px solid #e5e7eb; padding: 10px 14px; border-radius: 4px; font-size: 13px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-end; }
    .assinatura { text-align: center; }
    .assinatura-linha { border-top: 1px solid #374151; width: 180px; margin: 0 auto 6px; }
    .valor-total { font-size: 18px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="empresa-nome">Empresa Técnica do Pai</div>
      <div class="empresa-sub">CNPJ: 00.000.000/0001-00 · CREA: XX-000000-0</div>
      <div class="empresa-sub">contato@empresa.com.br · (11) 99999-9999</div>
    </div>
    <div>
      <div class="laudo-numero">LAUDO Nº ${laudo.numero.toString().padStart(3,'0')}/${new Date().getFullYear()}</div>
      <div class="laudo-data">Emitido em ${new Date().toLocaleDateString('pt-BR')}</div>
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">Dados da visita</div>
    <div class="grid-2">
      <div><div class="campo-label">Cliente</div><div class="campo-val">${laudo.cliente_nome ?? '—'}</div></div>
      <div><div class="campo-label">CNPJ</div><div class="campo-val">${laudo.cliente_cnpj ?? '—'}</div></div>
      <div style="margin-top:10px"><div class="campo-label">Data da visita</div><div class="campo-val">${dataFormatada}</div></div>
      <div style="margin-top:10px"><div class="campo-label">Tipo de serviço</div><div class="campo-val">${laudo.tipo_servico}</div></div>
      <div style="margin-top:10px"><div class="campo-label">Técnico responsável</div><div class="campo-val">${laudo.tecnico_nome ?? '—'}${laudo.tecnico_crea ? ' · CREA ' + laudo.tecnico_crea : ''}</div></div>
      <div style="margin-top:10px"><div class="campo-label">Urgência</div><div class="campo-val"><span class="badge" style="background:${cor}">${laudo.urgencia.toUpperCase()}</span></div></div>
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">Diagnóstico técnico</div>
    <div class="texto-bloco">${laudo.diagnostico?.replace(/\n/g, '<br>') ?? '—'}</div>
  </div>

  <div class="secao">
    <div class="secao-titulo">Recomendações</div>
    <div class="texto-bloco">${laudo.recomendacoes?.replace(/\n/g, '<br>') ?? '—'}</div>
  </div>

  ${imagens.length > 0 ? `
  <div class="secao">
    <div class="secao-titulo">Registros fotográficos</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      ${imagensHtml}
    </div>
  </div>` : ''}

  ${laudo.observacoes ? `
  <div class="secao">
    <div class="secao-titulo">Observações adicionais</div>
    <div class="texto-bloco">${laudo.observacoes.replace(/\n/g, '<br>')}</div>
  </div>` : ''}

  <div class="secao" style="background:#f9fafb;padding:14px;border-radius:8px;">
    <div class="secao-titulo">Estimativa de serviço</div>
    <div class="grid-2">
      <div><div class="campo-label">Horas trabalhadas</div><div class="campo-val">${laudo.horas}h × R$ ${laudo.valor_hora}/h</div></div>
      <div><div class="campo-label">Materiais / despesas</div><div class="campo-val">R$ ${laudo.valor_materiais}</div></div>
    </div>
    <div style="text-align:right;margin-top:12px;">
      <div class="campo-label">Total estimado</div>
      <div class="valor-total">${valorFormatado}</div>
    </div>
  </div>

  <div class="footer">
    <div style="font-size:11px;color:#9ca3af;">Este documento é um laudo técnico com fins informativos.<br>Valores sujeitos a confirmação após análise detalhada.</div>
    <div class="assinatura">
      <div class="assinatura-linha"></div>
      <div style="font-size:12px;font-weight:600;">${laudo.tecnico_nome ?? 'Técnico Responsável'}</div>
      ${laudo.tecnico_crea ? `<div style="font-size:11px;color:#6b7280;">CREA: ${laudo.tecnico_crea}</div>` : ''}
    </div>
  </div>
</body>
</html>`
}