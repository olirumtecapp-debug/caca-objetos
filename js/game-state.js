/**
 * Expedição: Objetos Ocultos - Estado Global e Gerenciamento de Fases
 */
const DEFAULT_PRESET_LEVELS = [
  {
    id: "lvl_navio",
    title: "1. Navio Pirata",
    subtitle: "Cabine do Capitão & Tesouros",
    image: "assets/navio_pirata.png",
    timeLimit: 120,
    items: [
      { id: "item_n1", name: "Diário de bordo", x: 9.0, y: 70.0, w: 20.0, h: 20.0 },
      { id: "item_n2", name: "Tapa-olho", x: 33.0, y: 69.0, w: 8.0, h: 14.0 },
      { id: "item_n3", name: "Mapa do tesouro", x: 37.0, y: 47.0, w: 7.0, h: 14.5 },
      { id: "item_n4", name: "Bússola", x: 44.5, y: 47.0, w: 10.5, h: 15.0 },
      { id: "item_n5", name: "Garrafa de rum", x: 56.5, y: 75.0, w: 7.5, h: 17.0 },
      { id: "item_n6", name: "Caneca de grogue", x: 65.5, y: 51.5, w: 8.5, h: 14.0 },
      { id: "item_n7", name: "Papagaio de madeira", x: 61.0, y: 20.0, w: 6.5, h: 17.5 },
      { id: "item_n8", name: "Espada", x: 75.5, y: 18.5, w: 19.5, h: 18.0 },
      { id: "item_n9", name: "Moeda de ouro", x: 78.5, y: 47.0, w: 16.5, h: 13.5 },
      { id: "item_n10", name: "Bola de canhão", x: 76.0, y: 90.0, w: 9.0, h: 10.0 }
    ]
  },
  {
    id: "lvl_jardim",
    title: "2. Jardim Botânico",
    subtitle: "Estufa Encantada de Plantas Raras",
    image: "assets/jardim_botanico.png",
    timeLimit: 140,
    items: [
      { id: "item_j1", name: "Borboleta azul", x: 74.5, y: 30.5, w: 7.0, h: 7.0 },
      { id: "item_j2", name: "Tesoura de poda", x: 34.0, y: 54.0, w: 11.0, h: 9.0 },
      { id: "item_j3", name: "Regador de cobre", x: 31.5, y: 38.0, w: 10.0, h: 11.0 },
      { id: "item_j4", name: "Estátua de sapo", x: 47.0, y: 63.0, w: 9.0, h: 9.0 },
      { id: "item_j5", name: "Lupa", x: 59.0, y: 54.0, w: 7.0, h: 8.0 },
      { id: "item_j6", name: "Vaso rachado", x: 25.0, y: 72.0, w: 12.0, h: 11.0 },
      { id: "item_j7", name: "Espátula de jardim", x: 40.0, y: 83.0, w: 7.0, h: 13.0 },
      { id: "item_j8", name: "Orquídea rara", x: 48.0, y: 18.0, w: 9.0, h: 9.0 },
      { id: "item_j9", name: "Mangueira de regar", x: 68.5, y: 52.0, w: 11.0, h: 11.0 },
      { id: "item_j10", name: "Relógio de sol", x: 75.5, y: 68.0, w: 11.0, h: 10.0 }
    ]
  },
  {
    id: "lvl_1",
    title: "3. Mesa do Arqueólogo",
    subtitle: "Gabinete de Antiguidades & Relíquias",
    image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80",
    timeLimit: 120,
    items: [
      { id: "item_1", name: "Relógio Despertador", x: 27, y: 34, w: 14, h: 19 },
      { id: "item_2", name: "Tesoura Antiga", x: 61, y: 53, w: 12, h: 17 },
      { id: "item_3", name: "Vela & Candelabro", x: 77, y: 16, w: 13, h: 24 },
      { id: "item_4", name: "Livro de Couro", x: 11, y: 58, w: 20, h: 27 },
      { id: "item_5", name: "Xícara de Café", x: 44, y: 66, w: 13, h: 18 }
    ]
  },
  {
    id: "lvl_2",
    title: "4. Biblioteca Secreta",
    subtitle: "Gabinete de Estudos & Mapas",
    image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80",
    timeLimit: 140,
    items: [
      { id: "item_6", name: "Globo Terrestre", x: 69, y: 23, w: 16, h: 24 },
      { id: "item_7", name: "Lupa de Leitura", x: 34, y: 56, w: 12, h: 16 },
      { id: "item_8", name: "Frasco de Tinta", x: 17, y: 46, w: 13, h: 18 },
      { id: "item_9", name: "Luminária de Estudo", x: 9, y: 10, w: 17, h: 30 },
      { id: "item_10", name: "Caixa Entalhada", x: 51, y: 63, w: 18, h: 20 }
    ]
  }
];

class ExpedicaoGameState {
  constructor() {
    this.profile = this.loadProfile();
    this.levels = this.loadLevels();
    this.currentLevelIndex = 0;
    this.currentMode = 'campanha'; // 'campanha' | 'casual' | 'desafio'
    this.checkPassiveEnergyRegen();
    this.initIndexedDB();
  }

  initIndexedDB() {
    try {
      const request = indexedDB.open('IncrivelCacaObjetosDB', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('levels_store')) {
          db.createObjectStore('levels_store', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        this.syncWithIndexedDB();
      };
    } catch(err) {
      console.warn('IndexedDB unavailable, using LocalStorage fallback');
    }
  }

  syncWithIndexedDB() {
    if (!this.db) return;
    try {
      const tx = this.db.transaction('levels_store', 'readonly');
      const store = tx.objectStore('levels_store');
      const req = store.getAll();
      req.onsuccess = () => {
        const idbLevels = req.result;
        if (Array.isArray(idbLevels) && idbLevels.length > this.levels.length) {
          this.levels = idbLevels;
          if (window.ExpedicaoApp) {
            window.ExpedicaoApp.renderMenuTrail();
            window.ExpedicaoApp.renderCampaignMap();
          }
        }
      };
    } catch(e) {}
  }

  checkPassiveEnergyRegen() {
    // Regenera 1 energia a cada 60 segundos automaticamente
    const now = Date.now();
    const last = this.profile.lastEnergyTimestamp || now;
    const elapsedSeconds = Math.floor((now - last) / 1000);
    const gained = Math.floor(elapsedSeconds / 60);

    if (gained > 0 && this.profile.energy < this.profile.maxEnergy) {
      this.profile.energy = Math.min(this.profile.maxEnergy, this.profile.energy + gained);
      this.profile.lastEnergyTimestamp = now;
      this.saveProfile();
    }

    // Intervalo contínuo em tempo real
    setInterval(() => {
      if (this.profile.energy < this.profile.maxEnergy) {
        this.profile.energy = Math.min(this.profile.maxEnergy, this.profile.energy + 1);
        this.profile.lastEnergyTimestamp = Date.now();
        this.saveProfile();
      }
    }, 60000);
  }

  loadProfile() {
    const saved = localStorage.getItem('expedicao_profile_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return {
      level: 1,
      xp: 0,
      xpNext: 500,
      energy: 100,
      maxEnergy: 100,
      coins: 150,
      diamonds: 10,
      tools: {
        magnifier: 3,
        uvLens: 2,
        hints: 3
      },
      lastCompletedLevel: 0,
      levelStars: {}, // { lvl_1: 3, lvl_2: 2 }
      lastDailyReward: 0
    };
  }

  saveProfile() {
    localStorage.setItem('expedicao_profile_v1', JSON.stringify(this.profile));
    this.updateHUD();
  }

  loadLevels() {
    const saved = localStorage.getItem('expedicao_custom_levels_v1');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Respeita 100% estritamente o que o usuário salvou no navegador
          return parsed;
        }
      } catch(e) {}
    }
    return [...DEFAULT_PRESET_LEVELS];
  }

  saveLevels() {
    try {
      localStorage.setItem('expedicao_custom_levels_v1', JSON.stringify(this.levels));
    } catch(e) {
      console.warn('LocalStorage quota reached, relying on IndexedDB:', e);
    }

    // Gravação segura no IndexedDB (armazenamento de grande capacidade ilimitado)
    if (this.db) {
      try {
        const tx = this.db.transaction('levels_store', 'readwrite');
        const store = tx.objectStore('levels_store');
        store.clear();
        this.levels.forEach(lvl => store.put(lvl));
      } catch(err) {
        console.error('Error saving to IndexedDB:', err);
      }
    }
  }

  addXP(amount) {
    this.profile.xp += amount;
    while (this.profile.xp >= this.profile.xpNext) {
      this.profile.xp -= this.profile.xpNext;
      this.profile.level++;
      this.profile.xpNext = Math.floor(this.profile.xpNext * 1.35);
      this.profile.diamonds += 2;
      this.profile.coins += 100;
      this.profile.energy = Math.min(this.profile.maxEnergy, this.profile.energy + 20);
      try { window.ExpedicaoSounds.playVictory(); } catch(e){}
    }
    this.saveProfile();
  }

  addCoins(amount) {
    this.profile.coins += amount;
    this.saveProfile();
    try { window.ExpedicaoSounds.playCoins(); } catch(e){}
  }

  addDiamonds(amount) {
    this.profile.diamonds += amount;
    this.saveProfile();
  }

  useEnergy(amount = 10) {
    if (this.currentMode === 'casual') return true; // Casual não gasta energia
    if (this.profile.energy >= amount) {
      this.profile.energy -= amount;
      this.saveProfile();
      return true;
    }
    return false;
  }

  updateHUD() {
    // Nível e XP
    const lvlEl = document.getElementById('hud-player-level');
    const xpFill = document.getElementById('hud-xp-fill');
    const xpText = document.getElementById('hud-xp-text');
    if (lvlEl) lvlEl.textContent = `Nível ${this.profile.level}`;
    if (xpFill) xpFill.style.width = `${Math.min(100, (this.profile.xp / this.profile.xpNext) * 100)}%`;
    if (xpText) xpText.textContent = `${this.profile.xp} / ${this.profile.xpNext} XP`;

    // Energia
    const energyEl = document.getElementById('hud-energy-val');
    const energyFill = document.getElementById('hud-energy-fill');
    if (energyEl) energyEl.textContent = `${this.profile.energy}/${this.profile.maxEnergy}`;
    if (energyFill) energyFill.style.width = `${(this.profile.energy / this.profile.maxEnergy) * 100}%`;

    // Moedas e Gemas
    const coinsEl = document.getElementById('hud-coins-val');
    const diamondsEl = document.getElementById('hud-diamonds-val');
    if (coinsEl) coinsEl.textContent = this.profile.coins.toLocaleString('pt-BR');
    if (diamondsEl) diamondsEl.textContent = this.profile.diamonds.toLocaleString('pt-BR');

    // Ferramentas no HUD do jogo
    const hintCount = document.getElementById('btn-hint-count');
    if (hintCount) hintCount.textContent = this.profile.tools.hints;
  }
}

window.ExpedicaoState = new ExpedicaoGameState();
