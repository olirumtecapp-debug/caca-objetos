/**
 * Expedição: Objetos Ocultos - Estúdio do Criador (Admin Studio)
 * Fluxo Perfeito:
 * 1. Dê cliques na foto para marcar as caixas #1, #2, #3...
 * 2. Cole a lista de texto (Ex: 1. Bússola, 2. Mapa, 3. Papagaio...)
 * 3. Clique em "⚡ Aplicar Nomes" e o sistema configura tudo automaticamente!
 */
class ExpedicaoAdminStudio {
  constructor() {
    this.activeLevelIndex = -1;
    this.currentImageSrc = null;
    this.currentItems = []; // [{ id, name, x, y, w, h }]
    this.selectedItemIndex = -1;
    
    this.zoomLevel = 1.0;
    this.activeTool = 'mark'; // 'mark' | 'pan'
    this.lastClickTime = 0;

    this.isPanning = false;
    this.panX = 0;
    this.panY = 0;
    this.startPanX = 0;
    this.startPanY = 0;
    this.panStartX = 0;
    this.panStartY = 0;
    this.isSpacePressed = false;
    this.lastBoxInteractionTime = 0;

    this.init();
  }

  init() {
    this.bindEvents();
    this.bindToolbars();
    this.bindBulkNamesPanel();
    this.bindStudioTabs();
    this.bindAIGenerator();
  }

  bindStudioTabs() {
    const tabManual = document.getElementById('tab-studio-manual');
    const tabAIGen = document.getElementById('tab-studio-ai-gen');
    const aiView = document.getElementById('studio-ai-gen-view');

    if (tabManual && tabAIGen && aiView) {
      tabManual.onclick = () => {
        tabManual.classList.add('active');
        tabAIGen.classList.remove('active');
        aiView.style.display = 'none';
      };

      tabAIGen.onclick = () => {
        tabAIGen.classList.add('active');
        tabManual.classList.remove('active');
        aiView.style.display = 'block';
      };
    }
  }

  bindAIGenerator() {
    const btnKey = document.getElementById('studio-ai-key-btn');
    const keyBox = document.getElementById('studio-ai-key-box');
    const keyVal = document.getElementById('studio-ai-key-val');
    const btnSaveKey = document.getElementById('studio-ai-key-save');

    if (keyVal && window.ExpedicaoAIGenerator) {
      keyVal.value = window.ExpedicaoAIGenerator.apiKey;
    }

    if (btnKey && keyBox) {
      btnKey.onclick = () => {
        keyBox.style.display = keyBox.style.display === 'none' ? 'block' : 'none';
      };
    }

    if (btnSaveKey && keyVal) {
      btnSaveKey.onclick = () => {
        window.ExpedicaoAIGenerator.saveApiKey(keyVal.value);
        alert('🔑 Chave Google AI salva com sucesso!');
        keyBox.style.display = 'none';
      };
    }

    const btnRunGen = document.getElementById('studio-btn-run-ai-gen');
    if (btnRunGen) {
      btnRunGen.onclick = () => this.runAIFullGeneration();
    }
  }

  async runAIFullGeneration() {
    const textInput = document.getElementById('studio-ai-prompt-input');
    const styleSelect = document.getElementById('studio-ai-style-select');
    const loadingEl = document.getElementById('studio-ai-gen-loading');

    const rawText = (textInput && textInput.value.trim()) || '';
    if (!rawText) {
      alert('Cole a descrição do cenário e a lista de itens!');
      return;
    }

    const parsed = window.ExpedicaoAIGenerator.parseDescriptionText(rawText);
    if (!parsed || parsed.items.length === 0) {
      alert('Não foi possível identificar os itens no texto informado.');
      return;
    }

    const style = (styleSelect && styleSelect.value) || 'photorealistic';
    if (loadingEl) loadingEl.style.display = 'block';

    try {
      const generated = await window.ExpedicaoAIGenerator.generateFullScenario(parsed.title, parsed.items, style);

      const titleInput = document.getElementById('studio-level-title');
      const subtitleInput = document.getElementById('studio-level-subtitle');
      if (titleInput) titleInput.value = generated.title;
      if (subtitleInput) subtitleInput.value = `${generated.items.length} Relíquias Camufladas`;

      this.currentItems = generated.items;
      this.setImage(generated.image);
      this.renderItemsList();

      const tabManual = document.getElementById('tab-studio-manual');
      const tabAIGen = document.getElementById('tab-studio-ai-gen');
      const aiView = document.getElementById('studio-ai-gen-view');
      if (tabManual) tabManual.classList.add('active');
      if (tabAIGen) tabAIGen.classList.remove('active');
      if (aiView) aiView.style.display = 'none';

      try { window.ExpedicaoSounds.playVictory(); } catch(e){}
    } catch(err) {
      alert('Erro ao gerar cenário: ' + err.message);
    } finally {
      if (loadingEl) loadingEl.style.display = 'none';
    }
  }

  bindEvents() {
    const fileInput = document.getElementById('studio-file-input');
    if (fileInput) {
      fileInput.onchange = (e) => this.handleImageUpload(e);
    }

    const btnLoadUrl = document.getElementById('studio-btn-load-url');
    if (btnLoadUrl) {
      btnLoadUrl.onclick = () => {
        const urlInput = document.getElementById('studio-url-input');
        const url = urlInput ? urlInput.value.trim() : '';
        if (url) this.setImage(url);
      };
    }

    const drawCanvas = document.getElementById('studio-draw-layer');
    if (drawCanvas) {
      drawCanvas.onclick = (e) => this.handleLayerClick(e);
    }

    const btnSave = document.getElementById('studio-btn-save-level');
    if (btnSave) {
      btnSave.onclick = () => this.saveCurrentLevel();
    }

    const btnTestNow = document.getElementById('studio-btn-test-now');
    if (btnTestNow) {
      btnTestNow.onclick = () => this.testCurrentScenario();
    }

    const btnNew = document.getElementById('studio-btn-new-level');
    if (btnNew) {
      btnNew.onclick = () => this.createNewLevel();
    }

    const btnExport = document.getElementById('studio-btn-export');
    if (btnExport) {
      btnExport.onclick = () => this.exportLevelsJSON();
    }

    const btnImport = document.getElementById('studio-btn-import');
    const importInput = document.getElementById('studio-import-file');
    if (btnImport && importInput) {
      btnImport.onclick = () => importInput.click();
      importInput.onchange = (e) => this.importLevelsJSON(e);
    }
  }

  bindToolbars() {
    const btnMark = document.getElementById('studio-tool-mark');
    const btnPan = document.getElementById('studio-tool-pan');
    const wrap = document.getElementById('studio-img-wrap');

    if (btnMark) btnMark.onclick = () => this.setTool('mark');
    if (btnPan) btnPan.onclick = () => this.setTool('pan');

    // Suporte a segurar Barra de Espaço para Pan instantâneo
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (!this.isSpacePressed) {
          this.isSpacePressed = true;
          if (wrap) wrap.classList.add('mode-pan');
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isSpacePressed = false;
        if (wrap && this.activeTool !== 'pan') wrap.classList.remove('mode-pan');
      }
    });

    if (wrap) {
      wrap.addEventListener('mousedown', (e) => {
        // Se clicar nos controles ou botões de deletar, ignora
        if (e.target.closest('.box-del-btn') || e.target.closest('.box-resize-handle')) return;

        const canPan = this.activeTool === 'pan' || this.isSpacePressed || e.button === 1 || e.button === 2;
        if (canPan) {
          this.isPanning = true;
          this.panStartX = e.clientX;
          this.panStartY = e.clientY;
          this.startPanX = this.panX;
          this.startPanY = this.panY;
          wrap.classList.add('panning');
          e.preventDefault();
        }
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.isPanning) return;
        const dx = e.clientX - this.panStartX;
        const dy = e.clientY - this.panStartY;
        this.panX = this.startPanX + dx;
        this.panY = this.startPanY + dy;
        this.updateStageTransform();
      });

      window.addEventListener('mouseup', () => {
        if (this.isPanning) {
          this.isPanning = false;
          if (wrap) wrap.classList.remove('panning');
        }
      });

      // Zoom suave com scroll do mouse
      wrap.addEventListener('wheel', (e) => {
        if (!this.currentImageSrc) return;
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.20 : -0.20;
        this.setZoom(this.zoomLevel + delta);
      }, { passive: false });
    }

    const btnIn = document.getElementById('studio-zoom-in');
    const btnOut = document.getElementById('studio-zoom-out');
    const btnReset = document.getElementById('studio-zoom-reset');
    const slider = document.getElementById('studio-zoom-slider');

    if (btnIn) btnIn.onclick = () => this.setZoom(this.zoomLevel + 0.25);
    if (btnOut) btnOut.onclick = () => this.setZoom(this.zoomLevel - 0.25);
    if (btnReset) btnReset.onclick = () => {
      this.panX = 0;
      this.panY = 0;
      this.setZoom(1.0);
    };
    if (slider) {
      slider.oninput = (e) => this.setZoom(Number(e.target.value) / 100);
    }
  }

  updateStageTransform() {
    const stage = document.getElementById('studio-stage');
    if (stage) {
      stage.style.transform = `translate(${this.panX}px, ${this.panY}px)`;
    }
  }

  bindBulkNamesPanel() {
    const btnApply = document.getElementById('studio-btn-apply-bulk-names');
    if (btnApply) {
      btnApply.onclick = () => this.applyBulkNamesFromText();
    }

    const btnQuickAdd = document.getElementById('studio-btn-add-quick-item');
    const inputQuick = document.getElementById('studio-quick-item-input');
    if (btnQuickAdd && inputQuick) {
      const addFn = () => {
        const val = inputQuick.value.trim();
        if (!val) return;
        this.currentItems.push({
          id: 'item_' + Date.now() + '_' + (this.currentItems.length + 1),
          name: val,
          x: null,
          y: null,
          w: 10,
          h: 10
        });
        inputQuick.value = '';
        this.renderItemBoxes();
        this.renderItemsList();
      };
      btnQuickAdd.onclick = addFn;
      inputQuick.onkeydown = (e) => {
        if (e.key === 'Enter') addFn();
      };
    }
  }

  /**
   * Pega a lista de texto colada (Ex: 1. Bússola, 2. Mapa, 3. Papagaio...)
   * e atribui sequencialmente às caixas #1, #2, #3 marcadas na foto!
   */
  applyBulkNamesFromText() {
    const textarea = document.getElementById('studio-custom-list-input');
    const rawText = (textarea && textarea.value.trim()) || '';

    if (!rawText) {
      alert('Cole sua lista de nomes na caixa de texto primeiro! Ex: 1. Bússola, 2. Mapa do tesouro, 3. Papagaio de madeira');
      return;
    }

    // Extrai nomes limpando prefixos de numeração (1., 1 -, #1, etc.)
    const parsedNames = rawText
      .split(/[,;\n|]+/)
      .map(line => line.trim().replace(/^[#\d\s\.\-\:\)]+/, '').trim())
      .filter(name => name.length > 0);

    if (parsedNames.length === 0) {
      alert('Nenhum nome válido identificado.');
      return;
    }

    // Se já existem caixas marcadas na foto, atribui os nomes diretamente a elas!
    if (this.currentItems.length > 0) {
      parsedNames.forEach((name, idx) => {
        if (this.currentItems[idx]) {
          this.currentItems[idx].name = name;
        } else {
          // Se colou mais nomes do que caixas, adiciona como itens pendentes
          this.currentItems.push({
            id: 'item_' + Date.now() + '_' + idx,
            name: name,
            x: null,
            y: null,
            w: 10,
            h: 10
          });
        }
      });

      this.renderItemBoxes();
      this.renderItemsList();
      try { window.ExpedicaoSounds.playVictory(); } catch(e){}
      alert(`🎉 ${parsedNames.length} nomes foram aplicados com sucesso às caixas marcadas!`);
      return;
    }

    // Se ainda não marcou nenhuma caixa na foto, inicializa os itens para marcar depois
    this.currentItems = parsedNames.map((name, idx) => ({
      id: 'item_' + Date.now() + '_' + idx,
      name: name,
      x: null,
      y: null,
      w: 10,
      h: 10
    }));

    this.renderItemBoxes();
    this.renderItemsList();
    try { window.ExpedicaoSounds.playVictory(); } catch(e){}
    alert(`📋 ${parsedNames.length} itens cadastrados! Agora dê 1 clique na foto para posicionar cada um ou use o botão 'Marcar'.`);
  }

  handleLayerClick(e) {
    if (this.activeTool !== 'mark' || !this.currentImageSrc) return;

    const layer = document.getElementById('studio-draw-layer');
    
    // Se o clique foi em cima de uma caixa, botão, handle ou etiqueta, NÃO faz nada no canvas!
    if (e.target !== layer) return;

    const now = Date.now();
    if (now - this.lastClickTime < 300) return; // Debounce
    if (now - this.lastBoxInteractionTime < 300) return; // Bloqueia clique logo após arrastar
    this.lastClickTime = now;

    const rect = layer.getBoundingClientRect();

    const clientX = e.clientX;
    const clientY = e.clientY;

    const clickX = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const clickY = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

    // Se temos um item específico selecionado para reposicionar
    if (this.selectedItemIndex >= 0 && this.selectedItemIndex < this.currentItems.length) {
      const item = this.currentItems[this.selectedItemIndex];
      const boxW = item.w || 10;
      const boxH = item.h || 10;

      item.x = Math.max(0, Math.min(100 - boxW, Math.round(clickX - boxW / 2)));
      item.y = Math.max(0, Math.min(100 - boxH, Math.round(clickY - boxH / 2)));

      try { window.ExpedicaoSounds.playItemFound(); } catch(err){}

      // Procura o próximo item não posicionado
      const nextUnplaced = this.currentItems.findIndex((it, idx) => idx > this.selectedItemIndex && it.x === null);
      this.selectedItemIndex = nextUnplaced !== -1 ? nextUnplaced : -1;

      this.renderItemBoxes();
      this.renderItemsList();
      this.updatePromptBanner();
      return;
    }

    // Se há itens cadastrados sem posição, preenche o primeiro disponível
    const firstUnplaced = this.currentItems.findIndex(it => it.x === null);
    if (firstUnplaced !== -1) {
      const item = this.currentItems[firstUnplaced];
      item.x = Math.max(0, Math.min(90, Math.round(clickX - 5)));
      item.y = Math.max(0, Math.min(90, Math.round(clickY - 5)));
      try { window.ExpedicaoSounds.playItemFound(); } catch(err){}
      this.renderItemBoxes();
      this.renderItemsList();
      return;
    }

    // Criação 100% instantânea da caixa sem nenhum popup ou interrupção
    const nextNum = this.currentItems.length + 1;
    const newItem = {
      id: 'item_' + Date.now() + '_' + nextNum,
      name: 'Objeto #' + nextNum,
      x: Math.max(0, Math.min(90, Math.round(clickX - 6))),
      y: Math.max(0, Math.min(90, Math.round(clickY - 6))),
      w: 12,
      h: 12
    };

    this.currentItems.push(newItem);
    try { window.ExpedicaoSounds.playItemFound(); } catch(err){}
    this.renderItemBoxes();
    this.renderItemsList();
  }

  selectItemForPlacement(index) {
    if (index >= 0 && index < this.currentItems.length) {
      this.selectedItemIndex = index;
      this.setTool('mark');
      this.renderItemsList();
      this.updatePromptBanner();
    }
  }

  updatePromptBanner() {
    const banner = document.getElementById('studio-queue-banner');
    if (!banner) return;

    if (this.selectedItemIndex >= 0 && this.selectedItemIndex < this.currentItems.length) {
      const item = this.currentItems[this.selectedItemIndex];
      banner.style.display = 'flex';
      banner.innerHTML = `
        <span style="font-size:18px;">👉</span>
        <div style="flex:1;">
          <span style="font-size:12px;color:#fff;">Clique na foto onde deseja posicionar o item:</span>
          <strong style="font-size:15px;color:#fde68a;margin-left:6px;">#${this.selectedItemIndex + 1}: ${item.name}</strong>
        </div>
        <button class="btn btn-sm" onclick="window.AdminStudio.closeBanner()" style="background:#475569;color:#fff;padding:4px 8px;font-size:11px;border:none;">✕ Cancelar</button>
      `;
    } else {
      banner.style.display = 'none';
    }
  }

  closeBanner() {
    this.selectedItemIndex = -1;
    this.updatePromptBanner();
    this.renderItemsList();
  }

  setTool(tool) {
    this.activeTool = tool;
    const btnMark = document.getElementById('studio-tool-mark');
    const btnPan = document.getElementById('studio-tool-pan');
    const wrap = document.getElementById('studio-img-wrap');

    if (btnMark) btnMark.classList.toggle('active-tool', tool === 'mark');
    if (btnPan) btnPan.classList.toggle('active-tool', tool === 'pan');
    if (wrap) wrap.classList.toggle('mode-pan', tool === 'pan');
  }

  setZoom(val) {
    this.zoomLevel = Math.max(0.5, Math.min(4.0, Number(val.toFixed(2))));
    
    const stage = document.getElementById('studio-stage');
    const img = document.getElementById('studio-preview-img');
    const layer = document.getElementById('studio-draw-layer');
    const valEl = document.getElementById('studio-zoom-val');
    const slider = document.getElementById('studio-zoom-slider');

    const pct = Math.round(this.zoomLevel * 100);
    if (valEl) valEl.textContent = `${pct}%`;
    if (slider) slider.value = pct;

    if (img && stage) {
      const baseW = this.baseWidth || 800;
      const baseH = this.baseHeight || 500;
      const targetW = Math.round(baseW * this.zoomLevel);
      const targetH = Math.round(baseH * this.zoomLevel);

      stage.style.width = `${targetW}px`;
      stage.style.height = `${targetH}px`;
      img.style.width = `${targetW}px`;
      img.style.height = `${targetH}px`;
      img.style.maxWidth = 'none';
      img.style.maxHeight = 'none';

      if (layer) {
        layer.style.width = `${targetW}px`;
        layer.style.height = `${targetH}px`;
      }

      this.updateStageTransform();
    }

    this.renderItemBoxes();
  }

  handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const rawData = evt.target.result;
      const tempImg = new Image();
      tempImg.onload = () => {
        const maxDim = 1920;
        let w = tempImg.naturalWidth || tempImg.width || 1200;
        let h = tempImg.naturalHeight || tempImg.height || 800;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(tempImg, 0, 0, w, h);

        // Otimiza para JPEG HD com qualidade impecável sem estourar o limite do navegador
        const optimized = canvas.toDataURL('image/jpeg', 0.90);
        this.setImage(optimized);
      };
      tempImg.onerror = () => {
        this.setImage(rawData);
      };
      tempImg.src = rawData;
    };
    reader.readAsDataURL(file);
  }

  setImage(src) {
    this.currentImageSrc = src;
    const stage = document.getElementById('studio-stage');
    const previewImg = document.getElementById('studio-preview-img');
    const emptyMsg = document.getElementById('studio-empty-msg');
    
    if (previewImg && stage) {
      previewImg.src = src;
      stage.style.display = 'inline-block';
      if (emptyMsg) emptyMsg.style.display = 'none';

      previewImg.onload = () => {
        this.naturalWidth = previewImg.naturalWidth || 1200;
        this.naturalHeight = previewImg.naturalHeight || 800;
        
        const wrap = document.getElementById('studio-img-wrap');
        const availW = (wrap ? wrap.clientWidth : 900) - 30;
        const availH = (wrap ? wrap.clientHeight : 600) - 30;
        
        const aspect = this.naturalWidth / this.naturalHeight;
        let w = availW;
        let h = w / aspect;
        
        if (h > availH) {
          h = availH;
          w = h * aspect;
        }
        
        this.baseWidth = Math.max(300, Math.round(w));
        this.baseHeight = Math.max(200, Math.round(h));
        
        this.setZoom(1.0);
        this.renderItemBoxes();
      };
    }
  }

  renderItemBoxes() {
    const layer = document.getElementById('studio-draw-layer');
    if (!layer) return;

    layer.querySelectorAll('.studio-saved-box').forEach(b => b.remove());

    this.currentItems.forEach((item, idx) => {
      if (item.x === null || item.y === null) return;

      const box = document.createElement('div');
      box.className = 'studio-saved-box';
      box.id = `studio-box-${idx}`;
      box.style.left = `${item.x}%`;
      box.style.top = `${item.y}%`;
      box.style.width = `${item.w}%`;
      box.style.height = `${item.h}%`;

      const isSelected = this.selectedItemIndex === idx;
      if (isSelected) {
        box.style.borderColor = '#38bdf8';
        box.style.boxShadow = '0 0 15px #38bdf8';
      }

      box.innerHTML = `
        <div class="box-header-tag">
          <span class="box-num-badge">#${idx + 1}</span>
          <span class="box-title-text">${item.name}</span>
          <button class="box-del-btn" title="Remover da Foto" onclick="event.stopPropagation(); window.AdminStudio.deleteItem(${idx});">✕</button>
        </div>
        <div class="box-resize-handle" title="Arraste para redimensionar"></div>
      `;

      this.makeBoxInteractive(box, idx);
      layer.appendChild(box);
    });
  }

  makeBoxInteractive(boxEl, idx) {
    let isMoving = false;
    let isResizing = false;
    let hasMoved = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0, initialW = 0, initialH = 0;

    boxEl.onclick = (e) => {
      e.stopPropagation(); // Impede o clique de vazar para a foto!
    };

    boxEl.onmousedown = (e) => {
      if (this.activeTool === 'pan') return;
      e.stopPropagation();

      const layer = document.getElementById('studio-draw-layer');
      const rect = layer.getBoundingClientRect();

      startX = e.clientX;
      startY = e.clientY;
      initialLeft = this.currentItems[idx].x;
      initialTop = this.currentItems[idx].y;
      initialW = this.currentItems[idx].w;
      initialH = this.currentItems[idx].h;
      hasMoved = false;

      if (e.target.classList.contains('box-resize-handle')) {
        isResizing = true;
      } else if (!e.target.classList.contains('box-del-btn')) {
        isMoving = true;
      }

      const onMouseMove = (moveEvt) => {
        const dx = ((moveEvt.clientX - startX) / rect.width) * 100;
        const dy = ((moveEvt.clientY - startY) / rect.height) * 100;

        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          hasMoved = true;
        }

        if (isMoving) {
          const newX = Math.max(0, Math.min(95, Math.round(initialLeft + dx)));
          const newY = Math.max(0, Math.min(95, Math.round(initialTop + dy)));
          this.currentItems[idx].x = newX;
          this.currentItems[idx].y = newY;
          boxEl.style.left = `${newX}%`;
          boxEl.style.top = `${newY}%`;
        } else if (isResizing) {
          const newW = Math.max(3, Math.min(60, Math.round(initialW + dx)));
          const newH = Math.max(3, Math.min(60, Math.round(initialH + dy)));
          this.currentItems[idx].w = newW;
          this.currentItems[idx].h = newH;
          boxEl.style.width = `${newW}%`;
          boxEl.style.height = `${newH}%`;
        }
      };

      const onMouseUp = () => {
        isMoving = false;
        isResizing = false;
        this.lastBoxInteractionTime = Date.now();
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };
  }

  renderItemsList() {
    const listEl = document.getElementById('studio-items-table');
    const countEl = document.getElementById('studio-items-count');
    if (!listEl) return;

    const placedCount = this.currentItems.filter(it => it.x !== null).length;
    const totalCount = this.currentItems.length;
    if (countEl) countEl.textContent = `${placedCount} na foto`;

    if (this.currentItems.length === 0) {
      listEl.innerHTML = '<p class="text-muted text-center py-4" style="font-size:11px;color:#94a3b8;">Dê cliques na foto para criar as caixas ou cole sua lista de nomes acima.</p>';
      return;
    }

    let html = '<div class="items-grid-admin">';
    this.currentItems.forEach((item, idx) => {
      const isPlaced = item.x !== null;
      const isSelected = this.selectedItemIndex === idx;

      html += `
        <div class="admin-item-card ${isSelected ? 'selected-queue-card' : ''}" style="${isSelected ? 'border-color:#fbbf24;box-shadow:0 0 12px rgba(245,158,11,0.35);' : ''}">
          <div class="admin-item-info" style="display:flex;align-items:center;gap:6px;flex:1;">
            <span class="admin-item-num" style="background:${isPlaced ? '#10b981' : '#475569'};color:#fff;">#${idx + 1}</span>
            <input type="text" class="admin-item-name-input" value="${item.name}" 
              oninput="window.AdminStudio.updateItemNameDirectly(${idx}, this.value)" 
              placeholder="Nome do objeto...">
          </div>
          <div style="display:flex;gap:4px;align-items:center;">
            <button class="btn btn-sm" onclick="window.AdminStudio.selectItemForPlacement(${idx})" 
              title="${isPlaced ? 'Mover na Foto' : 'Marcar na Foto'}" 
              style="padding:3px 8px;font-size:10px;background:${isPlaced ? '#334155' : '#f59e0b'};color:${isPlaced ? '#fde68a' : '#1a0f02'};font-weight:bold;border:none;">
              ${isPlaced ? '🎯 Mover' : '📍 Marcar'}
            </button>
            <button class="btn-icon-del" onclick="window.AdminStudio.deleteItem(${idx})" title="Excluir Item">🗑️</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    listEl.innerHTML = html;
  }

  updateItemNameDirectly(idx, newName) {
    if (this.currentItems[idx]) {
      this.currentItems[idx].name = newName;
      const box = document.getElementById(`studio-box-${idx}`);
      if (box) {
        const titleEl = box.querySelector('.box-title-text');
        if (titleEl) titleEl.textContent = newName;
      }
    }
  }

  deleteItem(idx) {
    this.currentItems.splice(idx, 1);
    if (this.selectedItemIndex === idx) this.selectedItemIndex = -1;
    this.renderItemBoxes();
    this.renderItemsList();
    this.updatePromptBanner();
  }

  createNewLevel() {
    this.activeLevelIndex = -1;
    this.currentImageSrc = null;
    this.currentItems = [];
    this.selectedItemIndex = -1;

    const titleInput = document.getElementById('studio-level-title');
    const subtitleInput = document.getElementById('studio-level-subtitle');
    const timeInput = document.getElementById('studio-level-time');
    const fileInput = document.getElementById('studio-file-input');
    const urlInput = document.getElementById('studio-url-input');
    const customListInput = document.getElementById('studio-custom-list-input');
    const stage = document.getElementById('studio-stage');
    const previewImg = document.getElementById('studio-preview-img');
    const emptyMsg = document.getElementById('studio-empty-msg');
    const queueBanner = document.getElementById('studio-queue-banner');

    if (titleInput) titleInput.value = 'Nova Expedição ' + (window.ExpedicaoState.levels.length + 1);
    if (subtitleInput) subtitleInput.value = 'Exploração de Relíquias';
    if (timeInput) timeInput.value = '120';
    if (fileInput) fileInput.value = '';
    if (urlInput) urlInput.value = '';
    if (customListInput) customListInput.value = '';
    if (previewImg) previewImg.src = '';
    if (stage) stage.style.display = 'none';
    if (emptyMsg) emptyMsg.style.display = 'block';
    if (queueBanner) queueBanner.style.display = 'none';

    this.renderItemBoxes();
    this.renderItemsList();
  }

  editLevel(index) {
    const lvl = window.ExpedicaoState.levels[index];
    if (!lvl) return;

    this.activeLevelIndex = index;
    this.currentItems = JSON.parse(JSON.stringify(lvl.items || []));
    this.selectedItemIndex = -1;

    const titleInput = document.getElementById('studio-level-title');
    const subtitleInput = document.getElementById('studio-level-subtitle');
    const timeInput = document.getElementById('studio-level-time');

    if (titleInput) titleInput.value = lvl.title || '';
    if (subtitleInput) subtitleInput.value = lvl.subtitle || '';
    if (timeInput) timeInput.value = lvl.timeLimit || 120;

    this.setImage(lvl.image);
    this.renderItemsList();

    window.ExpedicaoApp.showScreen('studio');
  }

  deleteLevel(index) {
    const lvl = window.ExpedicaoState.levels[index];
    const name = lvl ? lvl.title : 'este cenário';
    if (confirm(`Tem certeza que deseja excluir "${name}"?`)) {
      window.ExpedicaoState.levels.splice(index, 1);
      window.ExpedicaoState.saveLevels();
      this.renderLevelsManager();
      window.ExpedicaoApp.renderCampaignMap();
      if (this.activeLevelIndex === index) {
        this.createNewLevel();
      }
    }
  }

  saveCurrentLevel(silent = false) {
    if (!this.currentImageSrc) {
      alert('Carregue uma imagem para o cenário!');
      return;
    }

    const placedItems = this.currentItems.filter(it => it.x !== null);
    if (placedItems.length === 0) {
      alert('Marque pelo menos 1 objeto na imagem antes de salvar!');
      return;
    }

    const titleInput = document.getElementById('studio-level-title');
    const subtitleInput = document.getElementById('studio-level-subtitle');
    const timeInput = document.getElementById('studio-level-time');

    const title = (titleInput && titleInput.value.trim()) || 'Cenário Misterioso';
    const subtitle = (subtitleInput && subtitleInput.value.trim()) || 'Relíquias Ocultas';
    const timeLimit = Number(timeInput ? timeInput.value : 120) || 120;

    // Salva exatamente o que está nos inputs
    const inputs = document.querySelectorAll('#studio-items-table .admin-item-name-input');
    inputs.forEach((input, i) => {
      const val = input.value.trim();
      if (val && this.currentItems[i]) {
        this.currentItems[i].name = val;
      }
    });

    const cleanItems = placedItems.map((it, idx) => ({
      id: it.id || ('item_' + Date.now() + '_' + idx),
      name: it.name.trim(),
      x: Math.max(0, Math.min(95, Math.round(it.x))),
      y: Math.max(0, Math.min(95, Math.round(it.y))),
      w: Math.max(3, Math.min(60, Math.round(it.w || 10))),
      h: Math.max(3, Math.min(60, Math.round(it.h || 10)))
    }));

    const levelData = {
      id: this.activeLevelIndex >= 0 ? window.ExpedicaoState.levels[this.activeLevelIndex].id : 'lvl_' + Date.now(),
      title,
      subtitle,
      image: this.currentImageSrc,
      timeLimit,
      items: cleanItems
    };

    if (this.activeLevelIndex >= 0) {
      window.ExpedicaoState.levels[this.activeLevelIndex] = levelData;
      if (!silent) alert(`✅ Fase "${title}" atualizada com sucesso!`);
    } else {
      window.ExpedicaoState.levels.push(levelData);
      this.activeLevelIndex = window.ExpedicaoState.levels.length - 1;
      if (!silent) alert(`🎉 Nova fase "${title}" salva com sucesso!`);
    }

    window.ExpedicaoState.saveLevels();
    this.renderLevelsManager();
    window.ExpedicaoApp.renderCampaignMap();
    try { window.ExpedicaoSounds.playVictory(); } catch(e){}
  }

  testCurrentScenario() {
    if (!this.currentImageSrc) {
      alert('Carregue uma imagem antes de testar!');
      return;
    }
    const placedItems = this.currentItems.filter(it => it.x !== null);
    if (placedItems.length === 0) {
      alert('Marque pelo menos 1 objeto na imagem para poder testar!');
      return;
    }

    this.saveCurrentLevel(true);
    const targetIdx = this.activeLevelIndex >= 0 ? this.activeLevelIndex : (window.ExpedicaoState.levels.length - 1);
    // Modo de Teste: NUNCA consome energia!
    window.ExpedicaoApp.startLevelByIndex(targetIdx, true);
  }

  playLevel(index) {
    if (index >= 0 && index < window.ExpedicaoState.levels.length) {
      window.ExpedicaoApp.startLevel(index);
    }
  }

  renderLevelsManager() {
    const listEl = document.getElementById('studio-levels-list');
    if (!listEl) return;

    let html = '';
    window.ExpedicaoState.levels.forEach((lvl, idx) => {
      html += `
        <div class="studio-level-row">
          <img src="${lvl.image}" class="studio-level-thumb" alt="${lvl.title}">
          <div class="studio-level-row-info">
            <span class="studio-level-row-title">${idx + 1}. ${lvl.title}</span>
            <span class="studio-level-row-sub">${lvl.items.length} objetos • ${lvl.timeLimit}s</span>
          </div>
          <div class="studio-level-row-actions">
            <button class="btn btn-sm" onclick="window.AdminStudio.playLevel(${idx})" style="background:#10b981;color:#fff;font-weight:bold;padding:4px 8px;" title="Jogar esta fase">▶️ Jogar</button>
            <button class="btn btn-sm" onclick="window.AdminStudio.editLevel(${idx})" title="Editar no Estúdio">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="window.AdminStudio.deleteLevel(${idx})" title="Excluir">🗑️</button>
          </div>
        </div>
      `;
    });

    listEl.innerHTML = html;
  }

  exportLevelsJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.ExpedicaoState.levels, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "expedicao_fases.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  importLevelsJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (Array.isArray(imported) && imported.length > 0) {
          window.ExpedicaoState.levels = imported;
          window.ExpedicaoState.saveLevels();
          this.renderLevelsManager();
          window.ExpedicaoApp.renderCampaignMap();
          alert(`🎉 ${imported.length} fases importadas com sucesso!`);
        }
      } catch(err) {
        alert('Erro ao importar arquivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  }
}

window.AdminStudio = new ExpedicaoAdminStudio();
