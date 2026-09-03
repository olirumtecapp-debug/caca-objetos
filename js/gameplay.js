/**
 * Expedição: Objetos Ocultos - Motor de Gameplay (Cena Interativa)
 */
class ExpedicaoGameplay {
  constructor() {
    this.currentLevel = null;
    this.foundItems = new Set();
    this.score = 0;
    this.timeLeft = 120;
    this.timerInterval = null;
    this.isGameOver = false;

    // Ferramentas
    this.lensActive = false;
    this.uvActive = false;

    // Zoom & Pan Interativo
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isMouseDown = false;
    this.isPanning = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.startPanX = 0;
    this.startPanY = 0;
    this.hasDragged = false;

    this.initElements();
  }

  initElements() {
    this.sceneWrap = document.getElementById('game-scene-wrap');
    this.stageInner = document.getElementById('game-stage-inner');
    this.mainCanvas = document.getElementById('game-main-canvas');
    this.lens = document.getElementById('game-lens');
    this.lensCanvas = document.getElementById('game-lens-canvas');
    this.itemsListEl = document.getElementById('game-items-checklist');
    this.timerDisplay = document.getElementById('game-timer-display');
    this.scoreDisplay = document.getElementById('game-score-display');
    this.foundCounter = document.getElementById('game-found-counter');
    this.zoomDisplay = document.getElementById('game-zoom-display');

    if (this.sceneWrap && !this._listenersBound) {
      this._listenersBound = true;

      // 1. Zoom com a rodinha do mouse (wheel) em qualquer ponto da tela de jogo
      const handleWheel = (e) => {
        // Verifica se a tela de jogo está ativa
        const screenGame = document.getElementById('screen-game');
        if (!screenGame || !screenGame.classList.contains('active')) return;
        
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.20 : -0.20;
        this.setZoom(this.zoomLevel + delta);
      };

      this.sceneWrap.addEventListener('wheel', handleWheel, { passive: false });

      // 2. Pan ao clicar e arrastar com o mouse
      this.sceneWrap.addEventListener('mousedown', (e) => {
        if (e.target.closest('.game-floating-zoom')) return;

        this.isMouseDown = true;
        this.hasDragged = false;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.startPanX = this.panX;
        this.startPanY = this.panY;
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.isMouseDown) return;
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        const dist = Math.hypot(dx, dy);

        if (dist > 5) {
          this.hasDragged = true;
          this.isPanning = true;
          if (this.sceneWrap) this.sceneWrap.classList.add('panning');

          this.panX = this.startPanX + dx;
          this.panY = this.startPanY + dy;
          this.updateTransform();
        }
      });

      window.addEventListener('mouseup', () => {
        if (this.isMouseDown) {
          this.isMouseDown = false;
          if (this.isPanning) {
            this.isPanning = false;
            if (this.sceneWrap) this.sceneWrap.classList.remove('panning');
          }
        }
      });

      // 3. Clique para marcar objetos (apenas se não tiver arrastado a tela)
      if (this.mainCanvas) {
        this.mainCanvas.addEventListener('click', (e) => {
          if (!this.hasDragged) {
            this.handleCanvasClick(e);
          }
        });
        this.mainCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.mainCanvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
      }

      window.addEventListener('resize', () => this.repositionPins());
    }
  }

  setZoom(val) {
    this.zoomLevel = Math.max(1.0, Math.min(3.5, Number(val.toFixed(2))));
    if (this.zoomLevel === 1.0) {
      this.panX = 0;
      this.panY = 0;
    }
    if (this.zoomDisplay) {
      this.zoomDisplay.textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }
    this.updateTransform();
  }

  zoomIn() {
    this.setZoom(this.zoomLevel + 0.25);
  }

  zoomOut() {
    this.setZoom(this.zoomLevel - 0.25);
  }

  resetZoom() {
    this.setZoom(1.0);
  }

  updateTransform() {
    if (!this.stageInner) {
      this.stageInner = document.getElementById('game-stage-inner');
    }
    if (this.stageInner) {
      this.stageInner.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
    }
  }

  startLevel(levelData, mode = 'campanha') {
    this.initElements();
    this.currentLevel = levelData;
    this.foundItems.clear();
    this.score = 0;
    this.isGameOver = false;
    this.lensActive = false;
    this.uvActive = false;
    this.resetZoom();

    // LIMPA RIGOROSAMENTE TODOS OS PINOS E MARCAÇÕES DA FASE ANTERIOR
    this.clearFoundBadges();

    if (this.lens) this.lens.style.display = 'none';
    if (this.sceneWrap) this.sceneWrap.classList.remove('uv-mode-active');

    // Modo de Jogo
    if (mode === 'casual') {
      this.timeLeft = 9999;
      if (this.timerDisplay) this.timerDisplay.textContent = 'Modo Zen 🌿';
    } else if (mode === 'desafio') {
      this.timeLeft = Math.floor((levelData.timeLimit || 120) * 0.75); // 25% menos tempo no desafio
    } else {
      this.timeLeft = levelData.timeLimit || 120;
    }

    this.updateStatsDisplay();
    this.renderChecklist();
    this.loadSceneImage(levelData.image);
    this.startTimer();
  }

  loadSceneImage(src) {
    this.clearFoundBadges();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this.loadedImage = img;
      this.drawMainScene();
      this.clearFoundBadges();
    };
    img.src = src;
  }

  drawMainScene() {
    if (!this.mainCanvas || !this.loadedImage) return;
    const ctx = this.mainCanvas.getContext('2d');
    
    // Dimensões naturais 1:1 para precisão matemática perfeita em qualquer foto
    this.mainCanvas.width = this.loadedImage.naturalWidth || 1200;
    this.mainCanvas.height = this.loadedImage.naturalHeight || 800;

    ctx.drawImage(this.loadedImage, 0, 0, this.mainCanvas.width, this.mainCanvas.height);
  }

  handleMouseMove(e) {
    if (!this.lensActive || !this.lens || !this.lensCanvas || !this.loadedImage) return;

    const rect = this.mainCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    this.updateLens(mouseX, mouseY, rect);
  }

  handleTouchMove(e) {
    if (!this.lensActive || !this.lens || !this.lensCanvas || !this.loadedImage) return;
    const touch = e.touches[0];
    const rect = this.mainCanvas.getBoundingClientRect();
    const mouseX = touch.clientX - rect.left;
    const mouseY = touch.clientY - rect.top;

    this.updateLens(mouseX, mouseY, rect);
  }

  updateLens(x, y, rect) {
    this.lens.style.display = 'block';
    this.lens.style.left = `${x}px`;
    this.lens.style.top = `${y}px`;

    const ctxLens = this.lensCanvas.getContext('2d');
    const zoom = 2.2;
    const lensRadius = this.lensCanvas.width / 2;

    const scaleX = this.mainCanvas.width / rect.width;
    const scaleY = this.mainCanvas.height / rect.height;

    const sourceX = x * scaleX;
    const sourceY = y * scaleY;

    ctxLens.clearRect(0, 0, this.lensCanvas.width, this.lensCanvas.height);
    ctxLens.save();
    
    // Máscara circular
    ctxLens.beginPath();
    ctxLens.arc(lensRadius, lensRadius, lensRadius, 0, Math.PI * 2);
    ctxLens.clip();

    ctxLens.drawImage(
      this.loadedImage,
      sourceX - (lensRadius / zoom),
      sourceY - (lensRadius / zoom),
      (this.lensCanvas.width / zoom),
      (this.lensCanvas.height / zoom),
      0, 0, this.lensCanvas.width, this.lensCanvas.height
    );

    ctxLens.restore();
  }

  handleCanvasClick(e) {
    if (this.isGameOver || !this.currentLevel) return;

    // Debounce obrigatório para impedir múltiplos disparos no mesmo clique
    const now = Date.now();
    if (this.lastGameplayClick && (now - this.lastGameplayClick < 350)) {
      return;
    }
    this.lastGameplayClick = now;

    const rect = this.mainCanvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const clickX = ((clientX - rect.left) / rect.width) * 100;
    const clickY = ((clientY - rect.top) / rect.height) * 100;

    let foundAny = false;

    // Busca o item mais próximo do clique (dispara APENAS 1 item por clique)
    let bestMatch = null;
    let closestDist = Infinity;

    for (const item of this.currentLevel.items) {
      if (this.foundItems.has(item.id)) continue;

      const padX = Math.max(2, item.w * 0.15);
      const padY = Math.max(2, item.h * 0.15);

      const minX = item.x - padX;
      const maxX = item.x + item.w + padX;
      const minY = item.y - padY;
      const maxY = item.y + item.h + padY;

      if (clickX >= minX && clickX <= maxX && clickY >= minY && clickY <= maxY) {
        const centerX = item.x + item.w / 2;
        const centerY = item.y + item.h / 2;
        const dist = Math.hypot(clickX - centerX, clickY - centerY);
        if (dist < closestDist) {
          closestDist = dist;
          bestMatch = item;
        }
      }
    }

    if (bestMatch) {
      this.discoverItem(bestMatch, clientX, clientY);
      foundAny = true;
    }

    if (!foundAny) {
      // Penalidade de clique incorreto no Modo Desafio
      if (window.ExpedicaoState.currentMode === 'desafio') {
        this.timeLeft = Math.max(0, this.timeLeft - 5);
        try { window.ExpedicaoSounds.playError(); } catch(err){}
        this.showPenaltyFlash();
      }
    }
  }

  discoverItem(item, screenX, screenY) {
    this.foundItems.add(item.id);
    this.score += 250;
    try { window.ExpedicaoSounds.playItemFound(); } catch(e){}

    this.createSparkles(screenX, screenY);
    this.createFoundBadge(item);
    this.updateStatsDisplay();
    this.renderChecklist();

    // Verifica vitória
    if (this.foundItems.size === this.currentLevel.items.length) {
      this.handleVictory();
    }
  }

  createFoundBadge(item) {
    const stage = document.getElementById('game-stage-inner') || document.getElementById('game-scene-wrap');
    if (!stage || !this.mainCanvas) return;

    // Fixa o pino diretamente em percentual sobre o contêiner do palco
    const posX = item.x + item.w / 2;
    const posY = item.y + item.h / 2;

    const badge = document.createElement('div');
    badge.className = 'game-found-pin';
    badge.id = `found-pin-${item.id}`;
    badge.style.left = `${posX}%`;
    badge.style.top = `${posY}%`;

    badge.innerHTML = `
      <div class="found-pin-ring"></div>
      <div class="found-pin-box">
        <span class="found-pin-check">✓</span>
        <span class="found-pin-text">${item.name}</span>
      </div>
    `;

    stage.appendChild(badge);
  }

  repositionPins() {
    if (!this.currentLevel || !this.mainCanvas) return;
    const wrap = document.getElementById('game-scene-wrap');
    if (!wrap) return;

    const rect = this.mainCanvas.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();

    this.currentLevel.items.forEach(item => {
      if (this.foundItems.has(item.id)) {
        const pin = document.getElementById(`found-pin-${item.id}`);
        if (pin) {
          const centerX = item.x + item.w / 2;
          const centerY = item.y + item.h / 2;
          const posX = (rect.left - wrapRect.left) + (centerX / 100) * rect.width;
          const posY = (rect.top - wrapRect.top) + (centerY / 100) * rect.height;
          pin.style.left = `${posX}px`;
          pin.style.top = `${posY}px`;
        }
      }
    });
  }

  clearFoundBadges() {
    document.querySelectorAll('.game-found-pin').forEach(el => el.remove());
  }

  createSparkles(x, y) {
    for (let i = 0; i < 12; i++) {
      const spark = document.createElement('div');
      spark.className = 'game-sparkle';
      spark.style.left = `${x + (Math.random() * 40 - 20)}px`;
      spark.style.top = `${y + (Math.random() * 40 - 20)}px`;
      document.body.appendChild(spark);
      setTimeout(() => spark.remove(), 800);
    }
  }

  showPenaltyFlash() {
    const flash = document.createElement('div');
    flash.className = 'penalty-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 400);
  }

  useHint() {
    if (window.ExpedicaoState.profile.tools.hints <= 0) {
      alert('Você não possui Dicas! Compre mais na Loja do Explorador.');
      return;
    }

    const unFound = this.currentLevel.items.filter(it => !this.foundItems.has(it.id));
    if (unFound.length === 0) return;

    window.ExpedicaoState.profile.tools.hints--;
    window.ExpedicaoState.saveProfile();
    try { window.ExpedicaoSounds.playHint(); } catch(e){}

    const target = unFound[Math.floor(Math.random() * unFound.length)];
    this.showHintPulse(target);
  }

  showHintPulse(item) {
    const rect = this.mainCanvas.getBoundingClientRect();
    const hintEl = document.createElement('div');
    hintEl.className = 'hint-pulse-ring';
    
    const posX = rect.left + (item.x / 100) * rect.width;
    const posY = rect.top + (item.y / 100) * rect.height;
    const width = (item.w / 100) * rect.width;
    const height = (item.h / 100) * rect.height;

    hintEl.style.left = `${posX + width / 2}px`;
    hintEl.style.top = `${posY + height / 2}px`;
    document.body.appendChild(hintEl);

    setTimeout(() => hintEl.remove(), 3500);
  }

  toggleLens() {
    this.lensActive = !this.lensActive;
    if (!this.lensActive && this.lens) this.lens.style.display = 'none';
    try { window.ExpedicaoSounds.playLensToggle(); } catch(e){}
    const btn = document.getElementById('game-btn-lens');
    if (btn) btn.classList.toggle('active', this.lensActive);
  }

  toggleUV() {
    this.uvActive = !this.uvActive;
    if (this.sceneWrap) this.sceneWrap.classList.toggle('uv-mode-active', this.uvActive);
    try { window.ExpedicaoSounds.playClick(); } catch(e){}
    const btn = document.getElementById('game-btn-uv');
    if (btn) btn.classList.toggle('active', this.uvActive);
  }

  renderChecklist() {
    if (!this.itemsListEl || !this.currentLevel) return;

    let html = '';
    this.currentLevel.items.forEach(item => {
      const isFound = this.foundItems.has(item.id);
      html += `
        <div class="checklist-item ${isFound ? 'found' : ''}">
          <span class="checklist-icon">${isFound ? '✅' : '🔍'}</span>
          <span class="checklist-name">${item.name}</span>
        </div>
      `;
    });

    this.itemsListEl.innerHTML = html;
  }

  updateStatsDisplay() {
    if (this.scoreDisplay) this.scoreDisplay.textContent = this.score.toLocaleString('pt-BR');
    if (this.foundCounter && this.currentLevel) {
      this.foundCounter.textContent = `${this.foundItems.size}/${this.currentLevel.items.length}`;
    }
  }

  startTimer() {
    this.stopTimer();
    if (window.ExpedicaoState.currentMode === 'casual') return;

    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      const min = String(Math.floor(this.timeLeft / 60)).padStart(2, '0');
      const sec = String(this.timeLeft % 60).padStart(2, '0');
      if (this.timerDisplay) this.timerDisplay.textContent = `${min}:${sec}`;

      if (this.timeLeft <= 0) {
        this.stopTimer();
        this.handleGameOver();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleVictory() {
    this.stopTimer();
    this.isGameOver = true;
    try { window.ExpedicaoSounds.playVictory(); } catch(e){}

    // Recompensas
    const xpReward = 150;
    const coinsReward = 200;
    window.ExpedicaoState.addXP(xpReward);
    window.ExpedicaoState.addCoins(coinsReward);

    // Calcula estrelas (1 a 3)
    let stars = 3;
    if (this.timeLeft < (this.currentLevel.timeLimit * 0.3)) stars = 1;
    else if (this.timeLeft < (this.currentLevel.timeLimit * 0.6)) stars = 2;

    window.ExpedicaoState.profile.levelStars[this.currentLevel.id] = Math.max(
      window.ExpedicaoState.profile.levelStars[this.currentLevel.id] || 0,
      stars
    );
    // Atualiza o progresso para liberar a próxima fase
    const curIdx = window.ExpedicaoState.currentLevelIndex || 0;
    window.ExpedicaoState.profile.lastCompletedLevel = Math.max(
      window.ExpedicaoState.profile.lastCompletedLevel || 0,
      curIdx + 1
    );
    window.ExpedicaoState.saveProfile();

    setTimeout(() => {
      window.ExpedicaoApp.showVictoryModal(this.currentLevel.title, stars, this.score, xpReward, coinsReward);
    }, 800);
  }

  handleGameOver() {
    this.isGameOver = true;
    try { window.ExpedicaoSounds.playError(); } catch(e){}
    alert('⏱️ O tempo acabou! Tente novamente ou use mais Dicas.');
    window.ExpedicaoApp.showScreen('campaign');
  }
}

window.ExpedicaoGame = new ExpedicaoGameplay();
