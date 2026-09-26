/* PSD View: all parsing and rendering stays in this browser tab. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const colors = { 0: 'Bitmap', 1: 'Grayscale', 2: 'Indexed', 3: 'RGB', 4: 'CMYK', 7: 'Multichannel', 8: 'Duotone', 9: 'Lab' };
  const state = { psd: null, header: null, file: null, selected: null, mode: 'composite', zoom: 1, autoFit: true, composite: null, fonts: [], collapsed: new Set(), loadId: 0 };
  const els = {
    input: $('file-input'), open: $('open-button'), emptyOpen: $('empty-open'), filebar: $('filebar'),
    fileName: $('file-name'), fileStatus: $('file-status'), facts: $('file-facts'),
    layerList: $('layer-list'), layerCount: $('layer-count'), search: $('layer-search'),
    composite: $('view-composite'), layer: $('view-layer'), zoomIn: $('zoom-in'),
    zoomOut: $('zoom-out'), zoomFit: $('zoom-fit'), zoomInput: $('zoom-input'),
    toggleLayers: $('toggle-layers'), toggleDetails: $('toggle-details'),
    stage: $('stage'), empty: $('empty-state'), outer: $('canvas-outer'), artboard: $('artboard'),
    message: $('stage-message'), previewLabel: $('preview-label'),
    details: $('details-panel'), fonts: $('fonts-panel'), fontCount: $('font-count'),
    tabDetails: $('tab-details'), tabFonts: $('tab-fonts'), overlay: $('drop-overlay')
  };

  function html(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
  function fmt(n) { return Number.isFinite(n) ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(n) : '—'; }
  function bytes(n) { return n < 1024 * 1024 ? `${fmt(n / 1024)} KB` : `${fmt(n / (1024 * 1024))} MB`; }
  function kind(layer) {
    if (Array.isArray(layer.children)) return 'Nhóm';
    if (layer.text) return 'Text';
    if (layer.adjustment) return 'Điều chỉnh';
    if (layer.placedLayer) return 'Smart Object';
    if (layer.vectorMask || layer.vectorFill) return 'Vector / Shape';
    return 'Ảnh / Pixel';
  }
  function icon(layer) {
    if (Array.isArray(layer.children)) return '▣';
    if (layer.text) return 'T';
    if (layer.adjustment) return '◐';
    if (layer.placedLayer) return '◇';
    if (layer.vectorMask || layer.vectorFill) return '⬡';
    return '▧';
  }
  function rows(items) { return `<dl>${items.map(([key, value]) => `<div class="kv"><dt>${html(key)}</dt><dd>${html(value)}</dd></div>`).join('')}</dl>`; }
  function section(title, items) { return `<h3>${html(title)}</h3>${rows(items)}`; }
  function headerFrom(buffer) {
    if (buffer.byteLength < 26) throw new Error('File quá ngắn để là PSD/PSB.');
    const view = new DataView(buffer);
    const signature = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
    if (signature !== '8BPS') throw new Error('Đây không phải file PSD/PSB hợp lệ.');
    const version = view.getUint16(4, false);
    if (version !== 1 && version !== 2) throw new Error(`Phiên bản PSD không được hỗ trợ: ${version}.`);
    return {
      version, channels: view.getUint16(12, false), height: view.getUint32(14, false),
      width: view.getUint32(18, false), depth: view.getUint16(22, false), colorMode: view.getUint16(24, false)
    };
  }
  function walk(layers, fn) { for (const layer of layers || []) { fn(layer); if (Array.isArray(layer.children)) walk(layer.children, fn); } }
  function countLayers(layers) { let n = 0; walk(layers, () => n++); return n; }
  function textFonts(layer) {
    const found = new Map();
    const add = (style) => {
      const name = style?.font?.name;
      if (!name) return;
      const entry = found.get(name) || { name, sizes: new Set() };
      if (Number.isFinite(style.fontSize)) entry.sizes.add(style.fontSize);
      found.set(name, entry);
    };
    add(layer.text?.style);
    for (const run of layer.text?.styleRuns || []) add(run.style);
    return [...found.values()];
  }
  function collectFonts(psd) {
    const found = new Map();
    walk(psd.children, layer => {
      for (const item of textFonts(layer)) {
        const entry = found.get(item.name) || { name: item.name, sizes: new Set(), layers: new Set() };
        item.sizes.forEach(size => entry.sizes.add(size));
        entry.layers.add(layer.name || 'Layer không tên');
        found.set(item.name, entry);
      }
    });
    return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
  function setStatus(message, error = false) {
    els.fileStatus.textContent = message;
    els.fileStatus.classList.toggle('error', error);
  }
  function showMessage(message) {
    els.message.textContent = message;
    els.message.hidden = !message;
  }
  function setFacts() {
    const h = state.header;
    els.facts.textContent = `${fmt(h.width)} × ${fmt(h.height)} px  ·  ${colors[h.colorMode] || `Mã ${h.colorMode}`}  ·  ${h.depth} bit/kênh  ·  ${h.channels} kênh  ·  ${bytes(state.file.size)}  ·  ${h.version === 2 ? 'PSB' : 'PSD'}`;
  }
  function renderDetails() {
    const h = state.header;
    if (!h) { els.details.innerHTML = `<p class="muted">${state.file ? 'Không đọc được file PSD/PSB hợp lệ.' : 'Chọn file để xem thông tin.'}</p>`; return; }
    const resolution = state.psd?.imageResources?.resolutionInfo;
    const base = [
      ['Tên file', state.file.name], ['Kích thước', `${fmt(h.width)} × ${fmt(h.height)} px`],
      ['Hệ màu', colors[h.colorMode] || `Mã ${h.colorMode}`], ['Độ sâu màu', `${h.depth} bit/kênh`],
      ['Số kênh', h.channels], ['Dung lượng file', bytes(state.file.size)],
      ['Định dạng', h.version === 2 ? 'PSB (Large Document)' : 'PSD']
    ];
    if (resolution?.horizontalResolution) base.push(['Độ phân giải', `${fmt(resolution.horizontalResolution)} ${resolution.horizontalResolutionUnit || 'PPI'}`]);
    let markup = section('Tài liệu', base);
    if (!state.psd) markup += '<div class="notice">Không đọc được đầy đủ ảnh và layer của file này. Thông tin tài liệu ở trên được đọc trực tiếp từ header.</div>';
    const layer = state.selected;
    if (layer) {
      const width = Math.max(0, (layer.right ?? 0) - (layer.left ?? 0));
      const height = Math.max(0, (layer.bottom ?? 0) - (layer.top ?? 0));
      markup += section('Layer đã chọn', [
        ['Tên', layer.name || 'Layer không tên'], ['Loại', kind(layer)],
        ['Hiển thị', layer.hidden ? 'Ẩn' : 'Có'], ['Vị trí', `${fmt(layer.left ?? 0)}, ${fmt(layer.top ?? 0)} px`],
        ['Kích thước', `${fmt(width)} × ${fmt(height)} px`],
        ['Opacity', `${fmt((layer.opacity ?? 1) * 100)}%`],
        ['Blend mode', layer.blendMode || 'normal'], ['Clipping', layer.clipping ? 'Có' : 'Không']
      ]);
      if (layer.text) {
        const fonts = textFonts(layer);
        markup += '<h3>Nội dung text</h3><div class="text-preview">' + html(layer.text.text || '(Trống)') + '</div>';
        markup += section('Kiểu chữ', [
          ['Font', fonts.length ? fonts.map(f => f.name).join(', ') : 'Không có metadata font'],
          ['Cỡ chữ', fonts.length ? [...new Set(fonts.flatMap(f => [...f.sizes]))].map(n => `${fmt(n)} pt`).join(', ') || '—' : '—']
        ]);
      }
    }
    els.details.innerHTML = markup;
  }
  function renderFonts() {
    els.fontCount.textContent = state.fonts.length ? `(${state.fonts.length})` : '';
    if (!state.psd) { els.fonts.innerHTML = '<p class="muted">Chưa có dữ liệu font.</p>'; return; }
    if (!state.fonts.length) { els.fonts.innerHTML = '<p class="muted">Không tìm thấy font trong metadata text layer.</p>'; return; }
    els.fonts.innerHTML = `<p class="muted">Font được ghi trong file PSD. Đây không phải danh sách font đã cài trên máy.</p>` + state.fonts.map(f =>
      `<div class="font-card"><strong>${html(f.name)}</strong><small>${html(f.layers.size)} layer${f.sizes.size ? ` · ${[...f.sizes].sort((a,b)=>a-b).map(n => fmt(n) + ' pt').join(', ')}` : ''}</small></div>`
    ).join('');
  }
  function hasMatch(layer, query) {
    if ((layer.name || '').toLocaleLowerCase().includes(query)) return true;
    return Array.isArray(layer.children) && layer.children.some(child => hasMatch(child, query));
  }
  function renderLayers() {
    const psd = state.psd;
    els.layerCount.textContent = psd ? `(${countLayers(psd.children)})` : '';
    els.layerList.replaceChildren();
    if (!psd) { els.layerList.innerHTML = '<p class="muted panel-placeholder">Không có dữ liệu layer.</p>'; return; }
    const query = els.search.value.trim().toLocaleLowerCase();
    let visible = 0;
    function append(layers, container) {
      for (const layer of layers || []) {
        if (query && !hasMatch(layer, query)) continue;
        visible++;
        const isGroup = Array.isArray(layer.children);
        const row = document.createElement('button');
        row.type = 'button';
        row.className = `layer-row${layer === state.selected ? ' selected' : ''}${layer.hidden ? ' is-hidden' : ''}`;
        row.setAttribute('aria-label', `${layer.name || 'Layer không tên'}, ${kind(layer)}${layer.hidden ? ', đang ẩn' : ''}`);
        row.innerHTML = `<span class="twisty">${isGroup ? (query || !state.collapsed.has(layer) ? '▾' : '▸') : ''}</span><span class="layer-icon">${icon(layer)}</span><span class="layer-name"></span>${layer.hidden ? '<span class="layer-hidden">Ẩn</span>' : ''}`;
        row.querySelector('.layer-name').textContent = layer.name || 'Layer không tên';
        row.addEventListener('click', () => {
          if (isGroup && state.selected === layer) {
            if (state.collapsed.has(layer)) state.collapsed.delete(layer); else state.collapsed.add(layer);
          }
          state.selected = layer;
          renderLayers(); renderDetails(); renderPreview();
        });
        container.appendChild(row);
        if (isGroup && (query || !state.collapsed.has(layer))) {
          const children = document.createElement('div');
          children.className = 'layer-children';
          container.appendChild(children);
          append(layer.children, children);
        }
      }
    }
    append(psd.children, els.layerList);
    if (!visible) els.layerList.innerHTML = `<p class="muted panel-placeholder">${query ? 'Không tìm thấy layer.' : 'File không có layer.'}</p>`;
  }
  function fitZoom() {
    const h = state.header;
    if (!h?.width || !h?.height) return;
    const rect = els.stage.getBoundingClientRect();
    state.zoom = Math.min(1, Math.max(.02, (rect.width - 64) / h.width), Math.max(.02, (rect.height - 64) / h.height));
    state.autoFit = true;
    applyZoom();
    els.stage.scrollLeft = 0;
    els.stage.scrollTop = 0;
  }
  function applyZoom() {
    const h = state.header;
    if (!h) return;
    els.outer.style.width = `${h.width * state.zoom}px`;
    els.outer.style.height = `${h.height * state.zoom}px`;
    els.artboard.style.width = `${h.width}px`;
    els.artboard.style.height = `${h.height}px`;
    els.artboard.style.transform = `scale(${state.zoom})`;
    els.zoomInput.value = fmt(state.zoom * 100);
  }
  function zoomTo(nextZoom, clientX, clientY) {
    if (!state.psd) return;
    const oldZoom = state.zoom;
    const zoom = Math.min(32, Math.max(.02, nextZoom));
    if (!Number.isFinite(zoom) || zoom === oldZoom) return;
    const before = els.outer.getBoundingClientRect();
    const imageX = (clientX - before.left) / oldZoom;
    const imageY = (clientY - before.top) / oldZoom;
    state.zoom = zoom;
    state.autoFit = false;
    applyZoom();
    const after = els.outer.getBoundingClientRect();
    els.stage.scrollLeft += after.left + imageX * zoom - clientX;
    els.stage.scrollTop += after.top + imageY * zoom - clientY;
  }
  function zoomAtCenter(factor) {
    const rect = els.stage.getBoundingClientRect();
    zoomTo(state.zoom * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }
  function setPanelOpen(side, open) {
    const left = side === 'layers';
    const button = left ? els.toggleLayers : els.toggleDetails;
    document.getElementById('app').classList.toggle(left ? 'layers-collapsed' : 'details-collapsed', !open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', `${open ? 'Thu gọn' : 'Hiện'} bảng ${left ? 'Layers' : 'Chi tiết'}`);
    if (state.psd && state.autoFit) requestAnimationFrame(fitZoom);
  }
  function renderPreview() {
    if (!state.psd) return;
    els.artboard.replaceChildren();
    showMessage('');
    let image;
    try {
      if (state.mode === 'layer') {
        if (!state.selected) {
          showMessage('Chọn một layer ở cột bên trái để xem riêng.');
        } else if (Array.isArray(state.selected.children)) {
          showMessage('Đây là nhóm layer. Chọn một layer bên trong nhóm để xem riêng.');
        } else {
          image = agPsd.getLayerCanvas(state.selected);
          if (!image) showMessage('Layer này không có dữ liệu ảnh riêng để hiển thị.');
          else {
            image.style.left = `${state.selected.left || 0}px`;
            image.style.top = `${state.selected.top || 0}px`;
          }
        }
      } else {
        if (!state.composite) state.composite = agPsd.getCompositeCanvas(state.psd);
        image = state.composite;
        if (!image) showMessage('File không có ảnh gộp lưu sẵn để xem trước.');
        else { image.style.left = '0'; image.style.top = '0'; }
      }
      if (image) els.artboard.appendChild(image);
      if (state.mode === 'composite' && state.selected && !Array.isArray(state.selected.children)) {
        const layer = state.selected;
        const w = Math.max(0, (layer.right || 0) - (layer.left || 0));
        const h = Math.max(0, (layer.bottom || 0) - (layer.top || 0));
        if (w && h) {
          const outline = document.createElement('div');
          outline.className = 'layer-outline';
          Object.assign(outline.style, { left: `${layer.left || 0}px`, top: `${layer.top || 0}px`, width: `${w}px`, height: `${h}px` });
          els.artboard.appendChild(outline);
        }
      }
    } catch (error) {
      showMessage(`Không hiển thị được ảnh: ${error.message || error}`);
    }
    els.previewLabel.textContent = state.mode === 'layer' ? `Layer: ${state.selected?.name || 'Chưa chọn'}` : 'Ảnh gộp lưu trong file PSD';
  }
  function setMode(mode) {
    state.mode = mode;
    els.composite.classList.toggle('active', mode === 'composite');
    els.layer.classList.toggle('active', mode === 'layer');
    renderPreview();
  }
  function selectTab(tab) {
    const fonts = tab === 'fonts';
    els.tabFonts.classList.toggle('active', fonts);
    els.tabDetails.classList.toggle('active', !fonts);
    els.tabFonts.setAttribute('aria-selected', String(fonts));
    els.tabDetails.setAttribute('aria-selected', String(!fonts));
    els.fonts.hidden = !fonts;
    els.details.hidden = fonts;
  }
  async function openFile(file) {
    if (!file) return;
    const loadId = ++state.loadId;
    state.psd = null; state.header = null; state.file = file; state.selected = null;
    state.composite = null; state.fonts = []; state.collapsed.clear(); state.mode = 'composite';
    els.filebar.hidden = false; els.fileName.textContent = file.name;
    els.facts.textContent = ''; els.previewLabel.textContent = 'Đang đọc file'; els.zoomInput.value = '—';
    els.empty.hidden = true; els.outer.hidden = true; els.artboard.replaceChildren();
    els.search.value = ''; els.search.disabled = true;
    [els.composite, els.layer, els.zoomIn, els.zoomOut, els.zoomFit, els.zoomInput].forEach(control => control.disabled = true);
    els.stage.classList.remove('has-document');
    setStatus('Đang đọc file…'); showMessage('Đang đọc file PSD…');
    renderLayers(); renderDetails(); renderFonts();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      const buffer = await file.arrayBuffer();
      if (loadId !== state.loadId) return;
      state.header = headerFrom(buffer);
      setFacts(); renderDetails();
      if (typeof agPsd === 'undefined') throw new Error('Không tải được thư viện đọc PSD.');
      state.psd = agPsd.readPsd(buffer, { useRawData: true, skipThumbnail: true });
      if (loadId !== state.loadId) return;
      state.fonts = collectFonts(state.psd);
      setStatus('Đã mở');
      els.search.disabled = false;
      [els.composite, els.layer, els.zoomIn, els.zoomOut, els.zoomFit, els.zoomInput].forEach(control => control.disabled = false);
      els.stage.classList.add('has-document');
      els.outer.hidden = false;
      els.composite.classList.add('active'); els.layer.classList.remove('active');
      renderLayers(); renderDetails(); renderFonts(); fitZoom(); renderPreview();
    } catch (error) {
      if (loadId !== state.loadId) return;
      const message = error?.message || String(error);
      setStatus(state.header ? 'Chỉ đọc được thông tin cơ bản' : 'Không mở được file', true);
      showMessage(`Không thể đọc ảnh hoặc layer: ${message}`);
      renderLayers(); renderDetails(); renderFonts();
      els.previewLabel.textContent = 'Không có ảnh xem trước';
    }
  }

  els.open.addEventListener('click', () => els.input.click());
  els.emptyOpen.addEventListener('click', () => els.input.click());
  els.input.addEventListener('change', () => { openFile(els.input.files?.[0]); els.input.value = ''; });
  els.search.addEventListener('input', renderLayers);
  els.composite.addEventListener('click', () => setMode('composite'));
  els.layer.addEventListener('click', () => setMode('layer'));
  els.toggleLayers.addEventListener('click', () => setPanelOpen('layers', els.toggleLayers.getAttribute('aria-expanded') !== 'true'));
  els.toggleDetails.addEventListener('click', () => setPanelOpen('details', els.toggleDetails.getAttribute('aria-expanded') !== 'true'));
  els.zoomFit.addEventListener('click', fitZoom);
  els.zoomIn.addEventListener('click', () => zoomAtCenter(1.25));
  els.zoomOut.addEventListener('click', () => zoomAtCenter(1 / 1.25));
  els.zoomInput.addEventListener('focus', () => els.zoomInput.select());
  function commitZoomInput() {
    const percent = Number.parseFloat(els.zoomInput.value.trim().replace('%', '').replace(',', '.'));
    if (Number.isFinite(percent) && percent >= 2 && percent <= 3200) {
      const rect = els.stage.getBoundingClientRect();
      zoomTo(percent / 100, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
    applyZoom();
  }
  els.zoomInput.addEventListener('change', commitZoomInput);
  els.zoomInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') { commitZoomInput(); els.zoomInput.blur(); }
    if (event.key === 'Escape') { applyZoom(); els.zoomInput.blur(); }
  });
  els.stage.addEventListener('wheel', event => {
    if (!state.psd) return;
    event.preventDefault();
    const delta = Math.max(-4, Math.min(4, event.deltaY / 100));
    zoomTo(state.zoom * Math.pow(1.2, -delta), event.clientX, event.clientY);
  }, { passive: false });
  let pan = null;
  els.stage.addEventListener('pointerdown', event => {
    if (!state.psd || !els.outer.contains(event.target) || (event.button !== 0 && event.button !== 1)) return;
    event.preventDefault();
    pan = { x: event.clientX, y: event.clientY, left: els.stage.scrollLeft, top: els.stage.scrollTop };
    els.stage.classList.add('is-panning');
    els.stage.setPointerCapture(event.pointerId);
  });
  els.stage.addEventListener('pointermove', event => {
    if (!pan) return;
    els.stage.scrollLeft = pan.left - (event.clientX - pan.x);
    els.stage.scrollTop = pan.top - (event.clientY - pan.y);
  });
  function stopPan() { pan = null; els.stage.classList.remove('is-panning'); }
  els.stage.addEventListener('pointerup', stopPan);
  els.stage.addEventListener('pointercancel', stopPan);
  els.stage.addEventListener('lostpointercapture', stopPan);
  window.addEventListener('keydown', event => {
    if (!state.psd || !(event.ctrlKey || event.metaKey) || /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return;
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomAtCenter(1.25); }
    else if (event.key === '-') { event.preventDefault(); zoomAtCenter(1 / 1.25); }
    else if (event.key === '0') { event.preventDefault(); fitZoom(); }
  });
  els.tabDetails.addEventListener('click', () => selectTab('details'));
  els.tabFonts.addEventListener('click', () => selectTab('fonts'));
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { if (state.autoFit && state.psd) fitZoom(); }).observe(els.stage);
  else window.addEventListener('resize', () => { if (state.autoFit && state.psd) fitZoom(); });
  let dragCount = 0;
  window.addEventListener('dragenter', event => { if ([...event.dataTransfer?.types || []].includes('Files')) { event.preventDefault(); dragCount++; els.overlay.hidden = false; } });
  window.addEventListener('dragover', event => { if ([...event.dataTransfer?.types || []].includes('Files')) event.preventDefault(); });
  window.addEventListener('dragleave', event => { event.preventDefault(); dragCount = Math.max(0, dragCount - 1); if (!dragCount) els.overlay.hidden = true; });
  window.addEventListener('drop', event => { event.preventDefault(); dragCount = 0; els.overlay.hidden = true; openFile(event.dataTransfer?.files?.[0]); });
})();
