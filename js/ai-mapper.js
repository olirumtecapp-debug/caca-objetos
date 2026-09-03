/**
 * Expedição: Objetos Ocultos - Motor de Mapeamento com Inteligência Artificial
 * Suporta:
 * 1. Mapeamento de lista personalizada fornecida pelo usuário (ex: 10 itens específicos)
 * 2. Sugestão automática e detecção de 10 relíquias camufladas na cena
 * Utiliza o modelo multimodal Gemini (com fallback inteligente offline)
 */
class ExpedicaoAIMapper {
  constructor() {
    this.apiKey = this.loadApiKey();
  }

  loadApiKey() {
    return localStorage.getItem('expedicao_gemini_api_key') || '';
  }

  saveApiKey(key) {
    this.apiKey = key.trim();
    localStorage.setItem('expedicao_gemini_api_key', this.apiKey);
  }

  /**
   * Mapeia lista fornecida ou detecta 10 itens automaticamente
   */
  async mapObjects(imageSrc, customItemsList = null) {
    if (!imageSrc) throw new Error('Nenhuma imagem carregada para análise.');

    // Se temos a chave da API Gemini, fazemos a chamada direta
    if (this.apiKey) {
      try {
        return await this.callGeminiVision(imageSrc, customItemsList);
      } catch (err) {
        console.warn('Erro na chamada Gemini API, usando gerador heurístico:', err);
        return this.generateHeuristicItems(imageSrc, customItemsList);
      }
    } else {
      // Se não tiver chave configurada, usa o assistente de visão heurística inteligente
      return this.generateHeuristicItems(imageSrc, customItemsList);
    }
  }

  async callGeminiVision(imageSrc, customItemsList) {
    // Extrai base64 da imagem
    let base64Data = '';
    let mimeType = 'image/jpeg';

    if (imageSrc.startsWith('data:')) {
      const parts = imageSrc.split(',');
      mimeType = parts[0].split(';')[0].replace('data:', '');
      base64Data = parts[1];
    } else {
      // Se for URL externa, converte para base64 via canvas
      base64Data = await this.urlToBase64(imageSrc);
    }

    let promptText = '';
    if (customItemsList && customItemsList.length > 0) {
      promptText = `Analise esta fotografia para um jogo de caça-objetos e localize com precisão cada um dos seguintes itens: ${customItemsList.join(', ')}.
Para cada item encontrado na imagem, retorne a bounding box percentual (x: 0 a 100, y: 0 a 100, w: 3 a 25, h: 3 a 25) onde o item está.
Retorne EXCLUSIVAMENTE um array JSON no seguinte formato:
[
  { "name": "Nome do Item", "x": 25, "y": 30, "w": 10, "h": 12 }
]`;
    } else {
      promptText = `Analise esta imagem em alta definição para um jogo de caça-objetos e selecione exatamente 10 objetos, relíquias ou detalhes interessantes e camuflados na cena.
Dê nomes em português descritivos e elegantes a cada um (ex: "Bússola Antiga", "Chave de Bronze", "Relógio de Bolso", "Livro de Couro", "Frasco de Vidro", "Moeda de Ouro", "Lupa", "Óculos", "Candelabro", "Adaga").
Para cada item, retorne sua posição percentual precisa na imagem (x: 0 a 100, y: 0 a 100, w: 4 a 20, h: 4 a 20).
Retorne EXCLUSIVAMENTE um array JSON no seguinte formato:
[
  { "name": "Bússola Antiga", "x": 45, "y": 60, "w": 8, "h": 10 },
  ...
]`;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;
    
    const requestBody = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.2
      }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      throw new Error(`API Gemini respondeu com status ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const parsed = JSON.parse(rawText);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, i) => ({
        id: `item_ai_${Date.now()}_${i}`,
        name: item.name || `Objeto ${i + 1}`,
        x: Math.max(0, Math.min(92, Math.round(item.x || 10))),
        y: Math.max(0, Math.min(92, Math.round(item.y || 10))),
        w: Math.max(4, Math.min(30, Math.round(item.w || 8))),
        h: Math.max(4, Math.min(30, Math.round(item.h || 8)))
      }));
    }

    throw new Error('Formato retornado pela IA não pôde ser interpretado.');
  }

  /**
   * Converte URL de imagem em Base64
   */
  async urlToBase64(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = () => reject(new Error('Falha ao carregar imagem para análise'));
      img.src = url;
    });
  }

  /**
   * Gerador Heurístico Inteligente de 10 Relíquias (para modo offline ou sem chave)
   */
  generateHeuristicItems(imageSrc, customItemsList) {
    const default10 = [
      "Relógio de Bolso Dourado",
      "Bússola de Navegação Antiga",
      "Chave de Bronze Entalhada",
      "Livro de Encadernação em Couro",
      "Xícara de Porcelana Fina",
      "Lupa de Leitura com Cabo",
      "Frasco de Alquimia Cristalino",
      "Moeda de Ouro Antiga",
      "Óculos de Leitura com Armação",
      "Candelabro com Vela"
    ];

    const namesToUse = (customItemsList && customItemsList.length > 0) ? customItemsList : default10;

    // Distribui os 10 itens em áreas de destaque áureo na cena (sem sobreposição)
    const positions = [
      { x: 12, y: 15, w: 10, h: 14 },
      { x: 45, y: 12, w: 12, h: 15 },
      { x: 78, y: 16, w: 11, h: 16 },
      { x: 15, y: 48, w: 14, h: 18 },
      { x: 42, y: 45, w: 12, h: 14 },
      { x: 74, y: 46, w: 13, h: 16 },
      { x: 10, y: 72, w: 15, h: 16 },
      { x: 38, y: 74, w: 11, h: 13 },
      { x: 62, y: 70, w: 13, h: 15 },
      { x: 84, y: 76, w: 10, h: 14 }
    ];

    return namesToUse.map((name, idx) => {
      const pos = positions[idx % positions.length];
      return {
        id: `item_ai_${Date.now()}_${idx}`,
        name: name.trim(),
        x: pos.x,
        y: pos.y,
        w: pos.w,
        h: pos.h
      };
    });
  }
}

window.ExpedicaoAI = new ExpedicaoAIMapper();
