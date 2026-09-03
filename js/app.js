/**
 * Expedição: Objetos Ocultos - Controlador Principal da Aplicação
 */
class ExpedicaoApp {
  constructor() {
    this.init();
  }

  init() {
    this.bindNavigation();
    this.renderMenuTrail();
    this.renderCampaignMap();
    window.ExpedicaoState.updateHUD();
    window.AdminStudio.renderLevelsManager();
  }

  bindNavigation() {
    // 1. Menu Principal
    const btnContinue = document.getElementById('menu-btn-continue');
    const btnCampaign = document.getElementById('menu-btn-campaign');
    const btnCasual = document.getElementById('menu-btn-casual');
    const btnDesafio = document.getElementById('menu-btn-desafio');

    if (btnContinue) btnContinue.onclick = () => this.playLastLevel();
    if (btnCampaign) btnCampaign.onclick = () => this.openCampaign();
    if (btnCasual) btnCasual.onclick = () => this.openCasual();
    if (btnDesafio) btnDesafio.onclick = () => this.openDesafio();

    // 2. Rodapé
    const btnShop = document.getElementById('footer-btn-shop');
    const btnDaily = document.getElementById('footer-btn-daily');
    const btnSettings = document.getElementById('footer-btn-settings');
    const btnStudio = document.getElementById('footer-btn-studio');

    if (btnShop) btnShop.onclick = () => this.openShopModal();
    if (btnDaily) btnDaily.onclick = () => this.openDailyModal();
    if (btnSettings) btnSettings.onclick = () => this.openSettingsModal();
    if (btnStudio) btnStudio.onclick = () => this.openAdminStudio();

    // 3. Modais Close
    document.querySelectorAll('.modal-close, .btn-modal-cancel').forEach(btn => {
      btn.onclick = (e) => {
        const modal = e.target.closest('.app-modal');
        if (modal) modal.classList.remove('active');
      };
    });

    document.querySelectorAll('.app-modal').forEach(modal => {
      modal.onclick = (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      };
    });

    // 4. Iniciar partida a partir do jogo
    const btnBackTable = document.getElementById('game-btn-back');
    if (btnBackTable) btnBackTable.onclick = () => {
      if (confirm('Deseja sair da fase atual e voltar ao menu?')) {
        window.ExpedicaoGame.stopTimer();
        this.showScreen('menu');
      }
    };
  }

  showScreen(screenId) {
    document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`screen-${screenId}`);
    if (target) {
      target.classList.add('active');
    }

    const topHud = document.querySelector('.top-hud');
    const footerBar = document.querySelector('.bottom-footer-bar');

    if (screenId === 'menu') {
      if (topHud) topHud.style.display = 'flex';
      if (footerBar) footerBar.style.display = 'flex';
      this.renderMenuTrail();
    } else if (screenId === 'campaign') {
      if (topHud) topHud.style.display = 'flex';
      if (footerBar) footerBar.style.display = 'none';
      this.renderCampaignMap();
    } else {
      // No Jogo (game) ou no Estúdio (studio): Esconde HUD global e rodapé para 100% de tela limpa!
      if (topHud) topHud.style.display = 'none';
      if (footerBar) footerBar.style.display = 'none';
    }

    window.ExpedicaoState.updateHUD();
  }

  openCampaign() {
    window.ExpedicaoState.currentMode = 'campanha';
    this.renderCampaignMap();
    this.showScreen('campaign');
    try { window.ExpedicaoSounds.playClick(); } catch(e){}
  }

  openCasual() {
    window.ExpedicaoState.currentMode = 'casual';
    this.renderCampaignMap();
    this.showScreen('campaign');
    try { window.ExpedicaoSounds.playClick(); } catch(e){}
  }

  openDesafio() {
    window.ExpedicaoState.currentMode = 'desafio';
    this.renderCampaignMap();
    this.showScreen('campaign');
    try { window.ExpedicaoSounds.playClick(); } catch(e){}
  }

  playLastLevel() {
    const lvlIdx = window.ExpedicaoState.profile.lastCompletedLevel || 0;
    const safeIdx = Math.min(lvlIdx, window.ExpedicaoState.levels.length - 1);
    this.startLevelByIndex(Math.max(0, safeIdx));
  }

  playNextLevel() {
    const victoryModal = document.getElementById('modal-victory');
    if (victoryModal) victoryModal.classList.remove('active');

    const currentIdx = window.ExpedicaoState.currentLevelIndex || 0;
    const nextIdx = currentIdx + 1;

    if (nextIdx < window.ExpedicaoState.levels.length) {
      window.ExpedicaoState.profile.lastCompletedLevel = nextIdx;
      window.ExpedicaoState.saveProfile();
      this.startLevelByIndex(nextIdx);
    } else {
      alert('🎉 Incrível! Você completou todas as expedições disponíveis na Campanha!');
      this.openCampaign();
    }
  }

  closeVictoryAndGoCampaign() {
    const victoryModal = document.getElementById('modal-victory');
    if (victoryModal) victoryModal.classList.remove('active');
    this.openCampaign();
  }

  startLevelByIndex(index, isTestMode = false) {
    const level = window.ExpedicaoState.levels[index] || window.ExpedicaoState.levels[0];
    if (!level) return;

    // No modo de teste do criador ou modo casual, não gasta energia
    if (!isTestMode && !window.ExpedicaoState.useEnergy(10)) {
      alert('⚡ Energia insuficiente! Aguarde a recarga automática ou compre mais na Loja do Explorador.');
      return;
    }

    window.ExpedicaoState.currentLevelIndex = index;
    this.showScreen('game');

    const titleEl = document.getElementById('game-level-title');
    if (titleEl) titleEl.textContent = `${index + 1}. ${level.title}`;

    window.ExpedicaoGame.startLevel(level, window.ExpedicaoState.currentMode);
  }

  renderMenuTrail() {
    const trailEl = document.getElementById('menu-levels-trail');
    const levels = window.ExpedicaoState.levels;

    if (!levels || levels.length === 0) {
      if (trailEl) trailEl.innerHTML = '<p style="color:#94a3b8;font-size:12px;padding:10px;">Nenhum cenário criado ainda. Clique em "👑 Criador" no rodapé para montar seu primeiro mapa!</p>';
      return;
    }

    const currentIdx = Math.min(window.ExpedicaoState.profile.lastCompletedLevel || 0, levels.length - 1);
    const activeLevel = levels[currentIdx] || levels[0];

    // Atualiza o Stage Hero (Jogar Agora)
    if (activeLevel) {
      const heroThumb = document.getElementById('hero-level-thumb');
      const heroBadge = document.getElementById('hero-level-badge');
      const heroTitle = document.getElementById('hero-level-title');
      const heroDesc = document.getElementById('hero-level-desc');
      const heroStars = document.getElementById('hero-stars-row');

      if (heroThumb) heroThumb.src = activeLevel.image;
      if (heroBadge) heroBadge.textContent = `FASE ${currentIdx + 1}`;
      if (heroTitle) heroTitle.textContent = activeLevel.title;
      if (heroDesc) heroDesc.textContent = `${activeLevel.items.length} objetos escondidos para encontrar sob pressão do relógio!`;

      const stars = window.ExpedicaoState.profile.levelStars[activeLevel.id] || 0;
      let sHtml = '';
      for (let i = 1; i <= 3; i++) sHtml += `<span class="p-star ${i <= stars ? 'active' : ''}">${i <= stars ? '⭐' : '⚪'}</span>`;
      if (heroStars) heroStars.innerHTML = sHtml;
    }

    // Renderiza a Trilha de Capítulos
    if (trailEl) {
      let html = '';
      levels.forEach((lvl, idx) => {
        const isCurrent = idx === currentIdx;
        const stars = window.ExpedicaoState.profile.levelStars[lvl.id] || 0;
        let sHtml = '';
        for (let i = 1; i <= 3; i++) sHtml += (i <= stars ? '⭐' : '⚪');

        html += `
          <div class="saga-node-card ${isCurrent ? 'active-node' : ''}" onclick="window.ExpedicaoApp.startLevelByIndex(${idx})">
            <div class="saga-node-thumb">
              <img src="${lvl.image}" alt="${lvl.title}">
              <div class="node-badge-tag">Capítulo ${idx + 1}</div>
            </div>
            <div class="node-card-body">
              <div>
                <div class="node-title-txt">${lvl.title}</div>
                <div class="node-meta-txt">${lvl.items.length} itens • ${lvl.timeLimit}s</div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                <span style="font-size:11px;">${sHtml}</span>
                <span style="font-size:11px;color:#10b981;font-weight:900;">JOGAR ▶</span>
              </div>
            </div>
          </div>
        `;
      });
      trailEl.innerHTML = html;
    }
  }

  renderCampaignMap() {
    const mapGrid = document.getElementById('campaign-levels-grid');
    if (!mapGrid) return;

    let html = '';
    window.ExpedicaoState.levels.forEach((lvl, idx) => {
      const stars = window.ExpedicaoState.profile.levelStars[lvl.id] || 0;
      let starsHtml = '';
      for (let s = 1; s <= 3; s++) {
        starsHtml += `<span class="star-icon ${s <= stars ? 'earned' : ''}">⭐</span>`;
      }

      html += `
        <div class="campaign-level-card" onclick="window.ExpedicaoApp.startLevelByIndex(${idx})">
          <div class="level-thumb-wrap">
            <img src="${lvl.image}" class="level-thumb-img" alt="${lvl.title}">
            <div class="level-badge-num">Fase ${idx + 1}</div>
          </div>
          <div class="level-card-info">
            <h4 class="level-card-title">${lvl.title}</h4>
            <p class="level-card-sub">${lvl.items.length} objetos • ${lvl.timeLimit}s</p>
            <div class="level-stars-row">${starsHtml}</div>
          </div>
          <button class="btn btn-play-card">Jogar ▶</button>
        </div>
      `;
    });

    mapGrid.innerHTML = html;
  }

  openAdminStudio() {
    window.AdminStudio.createNewLevel(); // Sempre inicia limpo para uma nova adição
    this.showScreen('studio');
    window.AdminStudio.renderLevelsManager();
    try { window.ExpedicaoSounds.playClick(); } catch(e){}
  }

  openShopModal() {
    const m = document.getElementById('modal-shop');
    if (m) m.classList.add('active');
    try { window.ExpedicaoSounds.playClick(); } catch(e){}
  }

  openDailyModal() {
    const m = document.getElementById('modal-daily');
    if (m) m.classList.add('active');
    try { window.ExpedicaoSounds.playClick(); } catch(e){}
  }

  openSettingsModal() {
    const m = document.getElementById('modal-settings');
    if (m) m.classList.add('active');
    try { window.ExpedicaoSounds.playClick(); } catch(e){}
  }

  showVictoryModal(title, stars, score, xp, coins) {
    const m = document.getElementById('modal-victory');
    if (!m) return;

    document.getElementById('victory-level-title').textContent = title;
    document.getElementById('victory-score-val').textContent = score.toLocaleString('pt-BR');
    document.getElementById('victory-xp-val').textContent = `+${xp} XP`;
    document.getElementById('victory-coins-val').textContent = `+${coins} Moedas`;

    let starsHtml = '';
    for (let s = 1; s <= 3; s++) {
      starsHtml += `<span class="victory-star ${s <= stars ? 'earned' : ''}">⭐</span>`;
    }
    document.getElementById('victory-stars-box').innerHTML = starsHtml;

    m.classList.add('active');
  }

  buyShopItem(type, costCoins, costGems) {
    if (costCoins > 0 && window.ExpedicaoState.profile.coins < costCoins) {
      alert('Moedas insuficientes!');
      return;
    }
    if (costGems > 0 && window.ExpedicaoState.profile.diamonds < costGems) {
      alert('Diamantes insuficientes!');
      return;
    }

    if (costCoins > 0) window.ExpedicaoState.profile.coins -= costCoins;
    if (costGems > 0) window.ExpedicaoState.profile.diamonds -= costGems;

    if (type === 'hint') window.ExpedicaoState.profile.tools.hints += 3;
    if (type === 'energy') window.ExpedicaoState.profile.energy = 100;
    if (type === 'coins') window.ExpedicaoState.profile.coins += 1000;

    window.ExpedicaoState.saveProfile();
    try { window.ExpedicaoSounds.playCoins(); } catch(e){}
    alert('Compra realizada com sucesso!');
  }

  claimDailyReward() {
    const now = Date.now();
    const last = window.ExpedicaoState.profile.lastDailyReward || 0;
    const cooldown = 24 * 60 * 60 * 1000;

    if (now - last < cooldown && last !== 0) {
      alert('Você já resgatou seu baú diário hoje! Volte amanhã.');
      return;
    }

    window.ExpedicaoState.profile.lastDailyReward = now;
    window.ExpedicaoState.profile.coins += 250;
    window.ExpedicaoState.profile.diamonds += 5;
    window.ExpedicaoState.profile.tools.hints += 2;
    window.ExpedicaoState.saveProfile();

    try { window.ExpedicaoSounds.playVictory(); } catch(e){}
    alert('🎁 Baú Diário Resgatado: +250 Moedas, +5 Gemas e +2 Dicas!');
    document.getElementById('modal-daily').classList.remove('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.ExpedicaoApp = new ExpedicaoApp();
});
