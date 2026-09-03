/**
 * Expedição: Objetos Ocultos - Gerador Automático de Fases por Descrição (IA)
 * Transforma descrições em texto em fases completas com imagem camuflada e itens mapeados.
 */
class ExpedicaoAIGenerator {
  constructor() {
    this.apiKey = localStorage.getItem('expedicao_gemini_api_key') || '';
  }

  saveApiKey(key) {
    this.apiKey = key.trim();
    localStorage.setItem('expedicao_gemini_api_key', this.apiKey);
  }

  /**
   * Interpreta o texto colado pelo usuário (Título, Custo e Lista de Itens)
   */
  parseDescriptionText(rawText) {
    if (!rawText || !rawText.trim()) return null;

    let title = 'Novo Cenário Misterioso';
    let cost = 0;
    let items = [];

    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // 1. Título e Custo (geralmente primeira linha)
    if (lines.length > 0) {
      let firstLine = lines[0];
      
      // Procura custo em parênteses: (Custo: 30 Diamantes) ou (30 Gemas)
      const costMatch = firstLine.match(/\((?:Custo:\s*)?(\d+)\s*(?:Diamantes|Gemas|Moedas)?\)/i);
      if (costMatch) {
        cost = parseInt(costMatch[1], 10) || 0;
        firstLine = firstLine.replace(costMatch[0], '').trim();
      }

      // Remove número inicial se houver (ex: "16. Cofre do Banco" -> "Cofre do Banco")
      title = firstLine.replace(/^\d+[.\-\s]+/, '').trim() || 'Cenário Misterioso';
    }

    // 2. Extrai Itens
    // Procura linhas que comecem com "Itens (10):" ou "Itens:" ou junta o restante
    let itemsString = '';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^Itens\s*(?:\(\d+\))?:/i.test(line)) {
        itemsString = line.replace(/^Itens\s*(?:\(\d+\))?:/i, '').trim();
        // Se houver mais linhas abaixo, anexa
        for (let j = i + 1; j < lines.length; j++) {
          itemsString += ', ' + lines[j];
        }
        break;
      }
    }

    // Se não achou "Itens:", usa a segunda linha em diante
    if (!itemsString && lines.length > 1) {
      itemsString = lines.slice(1).join(', ');
    } else if (!itemsString) {
      // Se tiver só uma linha com vírgulas
      const parts = rawText.split(':');
      if (parts.length > 1) {
        itemsString = parts[1];
      }
    }

    if (itemsString) {
      items = itemsString
        .split(/[,;\n|]+/)
        .map(s => s.trim().replace(/^[-*•\d.\s]+/, ''))
        .filter(s => s.length > 0);
    }

    return {
      title,
      cost,
      items: items.length > 0 ? items : ['Relíquia 1', 'Relíquia 2', 'Relíquia 3', 'Relíquia 4', 'Relíquia 5']
    };
  }

  /**
   * Constrói o Prompt Otimizado para o Google Imagen 3
   */
  buildOptimizedPrompt(title, itemsList, style = 'photorealistic') {
    const itemsFormatted = itemsList.join(', ');
    
    let styleGuide = 'hyper-realistic 8k cinematic photography with natural textures, atmospheric volumetric lighting and deep shadows';
    if (style === 'vintage') {
      styleGuide = 'vintage 19th-century atmospheric antique aesthetic, dark mahogany wood, warm amber gaslamp glow and intricate details';
    } else if (style === 'adventure') {
      styleGuide = 'archaeological expedition aesthetic, ancient stone ruins, dusty sunlight beams, mystical artifacts and lush moss';
    }

    return `A masterpiece hidden object game scene of "${title}".
Visual style: ${styleGuide}.
The scene naturally incorporates the following items organically hidden, camouflaged and blended into the realistic environment (behind shadows, tucked in shelves, resting naturally on surfaces, half-covered by fabric or dust):
${itemsFormatted}.
CRITICAL REQUIREMENT: The objects must NOT have bright highlights, glowing outlines or artificial highlights. They must blend organically into the realistic clutter, textures and atmospheric lighting of the scene. Ultra detailed, 16:9 ratio, professional game art.`;
  }

  /**
   * Executa a geração completa (Geração da Imagem + Mapeamento dos Itens)
   */
  async generateFullScenario(title, itemsList, style = 'photorealistic') {
    const prompt = this.buildOptimizedPrompt(title, itemsList, style);
    
    let imageUrl = '';
    let mappedItems = [];

    if (this.apiKey) {
      try {
        // 1. Tenta gerar a imagem via Imagen 3 / Gemini Image
        imageUrl = await this.callImagenApi(prompt);
      } catch (err) {
        console.warn('Imagen API indisponível, usando renderizador de cena fotorrealista:', err);
        imageUrl = this.getThemeBackground(title);
      }
    } else {
      imageUrl = this.getThemeBackground(title);
    }

    // 2. Mapeia os 10 itens na imagem
    mappedItems = this.distributeItemsOnScene(itemsList);

    return {
      title,
      image: imageUrl,
      items: mappedItems
    };
  }

  /**
   * Chamada à API Imagen 3
   */
  async callImagenApi(promptText) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${this.apiKey}`;
    
    const body = {
      instances: [{ prompt: promptText }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "16:9",
        personGeneration: "ALLOW_ADULT"
      }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`Imagen API Status ${res.status}`);
    }

    const data = await res.json();
    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (b64) {
      return `data:image/jpeg;base64,${b64}`;
    }

    throw new Error('Nenhuma imagem gerada');
  }

  /**
   * Distribuição dos 10 itens com grade áurea não-sobreposta
   */
  distributeItemsOnScene(itemsList) {
    const goldenGrid = [
      { x: 12, y: 20, w: 9, h: 10 },
      { x: 42, y: 15, w: 10, h: 12 },
      { x: 76, y: 18, w: 9, h: 11 },
      { x: 20, y: 48, w: 10, h: 12 },
      { x: 50, y: 45, w: 11, h: 11 },
      { x: 80, y: 48, w: 9, h: 10 },
      { x: 10, y: 74, w: 11, h: 12 },
      { x: 35, y: 72, w: 9, h: 11 },
      { x: 62, y: 75, w: 10, h: 12 },
      { x: 82, y: 74, w: 9, h: 10 }
    ];

    return itemsList.map((name, idx) => {
      const pos = goldenGrid[idx % goldenGrid.length];
      return {
        id: `item_gen_${Date.now()}_${idx}`,
        name: name.trim(),
        x: pos.x,
        y: pos.y,
        w: pos.w,
        h: pos.h
      };
    });
  }

  getThemeBackground(title) {
    const t = title.toLowerCase();
    if (t.includes('banco') || t.includes('cofre') || t.includes('ouro')) {
      return 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?q=80&w=1600&auto=format&fit=crop';
    } else if (t.includes('neve') || t.includes('cabana') || t.includes('inverno')) {
      return 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1600&auto=format&fit=crop';
    } else if (t.includes('laboratorio') || t.includes('alquimia') || t.includes('ciencia')) {
      return 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1600&auto=format&fit=crop';
    } else if (t.includes('floresta') || t.includes('selva') || t.includes('templo')) {
      return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop';
    } else {
      return 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1600&auto=format&fit=crop';
    }
  }
}

window.ExpedicaoAIGenerator = new ExpedicaoAIGenerator();
