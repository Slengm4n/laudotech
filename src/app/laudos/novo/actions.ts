// src/app/laudos/novo/actions.ts
"use server"

import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY não configurada no servidor.");
}

// Inicializa o cliente do Gemini
const genAI = new GoogleGenerativeAI(apiKey);

export async function chamarIAServer(prompt: string): Promise<string> {
  try {
    // Pegamos o modelo e já definimos a System Instruction (O Agente)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: "Você é um perito técnico e redator especialista em laudos de engenharia e segurança do trabalho. Sua linguagem é estritamente formal, objetiva e baseada em normas técnicas brasileiras."
    });

    // Chama o modelo apenas com o texto
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error("Erro na API do Gemini:", error);
    throw new Error("Falha ao gerar texto com o Gemini.");
  }
}

export async function descreverImagemServer(base64: string, mediaType: string, promptTexto: string): Promise<string> {
  try {
    // Podemos usar o mesmo modelo para imagens (o Gemini 1.5 é multimodal)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Prepara o objeto da imagem no formato exigido pelo SDK
    const imagePart = {
      inlineData: {
        data: base64,
        mimeType: mediaType,
      },
    };

    // Passa um array contendo o texto e a imagem
    const result = await model.generateContent([promptTexto, imagePart]);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error("Erro na API do Gemini (Imagem):", error);
    throw new Error("Falha ao descrever imagem com o Gemini.");
  }
}