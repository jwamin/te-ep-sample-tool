/* global tingConfig */

/**
 * Effect parameter ranges follow EP-2350 guide §7.7 (teenage.engineering/guides/ep-2350).
 * UI uses sliders + selects only (no free numeric fields on effects).
 */

const PLAYMODES = [
  { value: 'oneshot', label: 'oneshot' },
  { value: 'hold', label: 'hold' },
  { value: 'startstop', label: 'startstop' }
]

const EFFECT_OPTIONS = [
  { type: 'SAMPLE', label: 'SAMPLE' },
  { type: 'DIST', label: 'DIST' },
  { type: 'DELAY', label: 'DELAY' },
  { type: 'REVERB', label: 'REVERB' },
  { type: 'LOWPASS', label: 'LOWPASS' },
  { type: 'HARMONY', label: 'HARMONY' },
  { type: 'RING', label: 'RING' },
  { type: 'SSB', label: 'SSB' }
]

/** @type {Record<string, { params: Array<{ key: string, label: string, min: number, max: number, step: number, default: number }>, bus: boolean }>} */
const EFFECT_SCHEMA = {
  SAMPLE: {
    params: [
      { key: 'speed', label: 'Speed', min: 0, max: 4, step: 0.05, default: 1 },
      { key: 'pitch', label: 'Pitch (st)', min: -24, max: 24, step: 0.5, default: 0 },
      { key: 'level', label: 'Level', min: 0, max: 1, step: 0.02, default: 1 },
      { key: 'balance', label: 'Balance', min: 0, max: 1, step: 0.02, default: 0.5 }
    ],
    bus: true
  },
  DIST: {
    params: [
      { key: 'amount', label: 'Amount', min: 0, max: 40, step: 0.5, default: 10 },
      { key: 'mix', label: 'Mix', min: 0, max: 1, step: 0.02, default: 0.5 },
      { key: 'lowpass-cutoff', label: 'Low-pass', min: 0, max: 1, step: 0.01, default: 1 },
      { key: 'highpass-cutoff', label: 'High-pass', min: 0, max: 1, step: 0.01, default: 0 }
    ],
    bus: true
  },
  DELAY: {
    params: [
      { key: 'time', label: 'Time (decay)', min: 0, max: 1.1, step: 0.01, default: 0.5 },
      { key: 'lowpass-cutoff', label: 'Low-pass', min: 0, max: 1, step: 0.01, default: 1 },
      { key: 'highpass-cutoff', label: 'High-pass', min: 0, max: 1, step: 0.01, default: 0 },
      { key: 'wet-level', label: 'Wet', min: 0, max: 1, step: 0.02, default: 0.3 },
      { key: 'dry-level', label: 'Dry', min: 0, max: 1, step: 0.02, default: 0.7 },
      { key: 'echo', label: 'Echo feedback', min: 0, max: 1, step: 0.02, default: 0.3 },
      { key: 'cross-feed', label: 'Cross-feed', min: 0, max: 1, step: 0.02, default: 0 },
      { key: 'balance', label: 'Balance', min: 0, max: 1, step: 0.02, default: 0.5 }
    ],
    bus: true
  },
  REVERB: {
    params: [
      { key: 'dry-level', label: 'Dry', min: 0, max: 1, step: 0.02, default: 0.65 },
      { key: 'wet-level', label: 'Wet', min: 0, max: 1, step: 0.02, default: 0.35 },
      { key: 'time', label: 'Time', min: 0, max: 1, step: 0.02, default: 0.5 },
      { key: 'spring-mix', label: 'Spring mix', min: 0, max: 1, step: 0.02, default: 0.2 },
      { key: 'highpass-cutoff', label: 'High-pass', min: 0, max: 1, step: 0.01, default: 0 }
    ],
    bus: true
  },
  LOWPASS: {
    params: [{ key: 'cutoff', label: 'Cutoff', min: 0, max: 1, step: 0.01, default: 0.5 }],
    bus: true
  },
  HARMONY: {
    params: [
      { key: 'dry-level', label: 'Dry', min: 0, max: 1, step: 0.02, default: 0.8 },
      { key: 'pitch', label: 'Pitch', min: 0.5, max: 2, step: 0.02, default: 1 },
      { key: 'lowpass-cutoff', label: 'Low-pass', min: 0, max: 1, step: 0.01, default: 1 },
      { key: 'highpass-cutoff', label: 'High-pass', min: 0, max: 1, step: 0.01, default: 0 }
    ],
    bus: true
  },
  RING: {
    params: [
      { key: 'frequency', label: 'Frequency (Hz)', min: 0, max: 20000, step: 10, default: 440 },
      { key: 'mix', label: 'Mix', min: 0, max: 1, step: 0.02, default: 0.3 }
    ],
    bus: true
  },
  SSB: {
    params: [{ key: 'frequency', label: 'Frequency (Hz)', min: -20000, max: 20000, step: 50, default: 0 }],
    bus: true
  }
}

function getParamSpec (type, key) {
  const list = EFFECT_SCHEMA[type]?.params || []
  return list.find((p) => p.key === key)
}

function clampToSpec (type, key, val) {
  const spec = getParamSpec(type, key)
  if (!spec) return Number(val) || 0
  let v = Number(val)
  if (!Number.isFinite(v)) v = spec.default
  const { min, max, step } = spec
  v = Math.min(max, Math.max(min, v))
  if (step > 0) {
    v = Math.round((v - min) / step) * step + min
    v = Math.min(max, Math.max(min, v))
  }
  return v
}

function getDefaultParams (type) {
  const out = {}
  for (const p of EFFECT_SCHEMA[type].params) {
    out[p.key] = p.default
  }
  return out
}

function getDefaultEffect (type) {
  return { type, params: getDefaultParams(type), bus: null }
}

function normalizeEffect (eff) {
  const t = EFFECT_SCHEMA[eff.type] ? eff.type : 'SAMPLE'
  const params = { ...getDefaultParams(t), ...(eff.params || {}) }
  for (const p of EFFECT_SCHEMA[t].params) {
    params[p.key] = clampToSpec(t, p.key, params[p.key])
  }
  const bus = eff.bus === 1 || eff.bus === 2 ? eff.bus : null
  return { type: t, params, bus }
}

function basename (p) {
  if (!p) return ''
  const parts = String(p).replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || p
}

function deepClone (o) {
  return JSON.parse(JSON.stringify(o))
}

function createEmptySample () {
  return { path: null, dropLabel: '', playmode: 'oneshot' }
}

function createPreset (pos) {
  return {
    pos,
    name: `Preset ${pos + 1}`,
    comment: '',
    extraMerge: '',
    effects: [getDefaultEffect('SAMPLE')]
  }
}

const state = {
  samples: [0, 1, 2, 3].map(() => createEmptySample()),
  presets: [0, 1, 2, 3].map((i) => createPreset(i)),
  activePreset: 0
}

/** @type {{ fromIndex: number, pointerId: number } | null} */
let graphDrag = null

function setStatus (msg, kind) {
  const el = document.getElementById('status')
  el.textContent = msg || ''
  el.classList.remove('ok', 'err')
  if (kind === 'ok') el.classList.add('ok')
  if (kind === 'err') el.classList.add('err')
}

function formatParamValue (v, spec) {
  if (spec.max > 500 && spec.step >= 10) return String(Math.round(v))
  const d = spec.step >= 1 ? 0 : spec.step >= 0.1 ? 1 : spec.step >= 0.01 ? 2 : 3
  return Number(v).toFixed(d)
}

function effectToJson ({ type, params, bus }) {
  const o = { effect: type }
  const spec = EFFECT_SCHEMA[type]
  if (type === 'SAMPLE') {
    for (const p of spec.params) {
      const v = clampToSpec(type, p.key, params[p.key])
      if (Math.abs(v - p.default) > 1e-5) o[p.key] = v
    }
  } else {
    for (const p of spec.params) {
      o[p.key] = clampToSpec(type, p.key, params[p.key])
    }
  }
  if (bus === 1 || bus === 2) o.BUS = bus
  return o
}

function buildConfig (opts) {
  const forPack = opts && opts.forPack
  const name = document.getElementById('pack-name').value.trim() || 'My pack'
  const samples = []
  for (let i = 0; i < 4; i++) {
    const s = state.samples[i]
    if (!s.path && !s.dropLabel) continue
    let file
    if (forPack) {
      if (!s.path) {
        throw new Error(
          `Slot ${i + 1}: need a file path (drop from Finder or use Browse) to export WAV copies.`
        )
      }
      file = `${i + 1}.wav`
    } else {
      file = s.path ? basename(s.path) : s.dropLabel
    }
    samples.push({ file, playmode: s.playmode, pos: i })
  }

  const presets = state.presets.map((p) => {
    const list = p.effects.map((e) => effectToJson(normalizeEffect(e)))
    const base = { pos: p.pos, list }
    if (p.name && String(p.name).trim()) base.name = String(p.name).trim()
    if (p.comment && String(p.comment).trim()) base.comment = String(p.comment).trim()
    if (p.extraMerge && String(p.extraMerge).trim()) {
      const extra = JSON.parse(String(p.extraMerge).trim())
      if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
        for (const k of Object.keys(extra)) {
          if (k === 'pos' || k === 'list') continue
          base[k] = extra[k]
        }
      }
    }
    return base
  })

  const out = { name, presets }
  if (samples.length) out.samples = samples
  return out
}

function stringifyConfig (obj) {
  return `${JSON.stringify(obj, null, 2)}\n`
}

function updatePreview () {
  try {
    const cfg = buildConfig({ forPack: false })
    document.getElementById('json-preview').value = stringifyConfig(cfg)
  } catch (e) {
    document.getElementById('json-preview').value = `// ${e.message}`
  }
}

function renderSamples () {
  const root = document.getElementById('sample-slots')
  root.innerHTML = ''
  for (let i = 0; i < 4; i++) {
    const s = state.samples[i]
    const el = document.createElement('div')
    el.className = 'drop'
    el.dataset.slot = String(i)
    const label = s.dropLabel || (s.path ? basename(s.path) : '')
    el.innerHTML = `
      <div class="slot-label">Slot ${i + 1} → ${i + 1}.wav on export</div>
      <div class="file-name">${label ? escapeHtml(label) : '<span class="empty-hint">Drop .wav here</span>'}</div>
      <select class="playmode small" data-slot="${i}" aria-label="Play mode slot ${i + 1}">
        ${PLAYMODES.map(
          (pm) =>
            `<option value="${pm.value}" ${s.playmode === pm.value ? 'selected' : ''}>${pm.label}</option>`
        ).join('')}
      </select>
      <div class="drop-actions">
        <button type="button" class="small browse-wav" data-slot="${i}">Browse…</button>
        <button type="button" class="small ghost danger clear-slot" data-slot="${i}">Clear</button>
      </div>
    `
    root.appendChild(el)

    el.addEventListener('dragover', (ev) => {
      ev.preventDefault()
      el.classList.add('dragover')
    })
    el.addEventListener('dragleave', () => el.classList.remove('dragover'))
    el.addEventListener('drop', (ev) => {
      ev.preventDefault()
      el.classList.remove('dragover')
      assignWavFiles(i, ev.dataTransfer.files)
    })
  }
}

function escapeHtml (t) {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function assignWavFiles (slotIndex, fileList) {
  const files = Array.from(fileList || []).filter((f) => /\.wav$/i.test(f.name))
  if (!files.length) {
    setStatus('Only .wav files are accepted.', 'err')
    return
  }
  const f = files[0]
  let p = null
  if (window.tingConfig && typeof tingConfig.getPathForFile === 'function') {
    try {
      p = tingConfig.getPathForFile(f)
    } catch (_) {
      p = null
    }
  }
  state.samples[slotIndex].path = p
  state.samples[slotIndex].dropLabel = f.name
  setStatus(p ? `Slot ${slotIndex + 1}: ${f.name}` : `Slot ${slotIndex + 1}: ${f.name} (path unknown — use Browse to export pack)`, 'ok')
  renderSamples()
  updatePreview()
}

function renderTabs () {
  const root = document.getElementById('preset-tabs')
  root.innerHTML = ''
  for (let i = 0; i < 4; i++) {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = String(i)
    b.className = state.activePreset === i ? 'active' : ''
    b.addEventListener('click', () => {
      state.activePreset = i
      renderTabs()
      renderPresetEditor()
    })
    root.appendChild(b)
  }
}

function renderSliderRow (type, eff, idx, spec) {
  const v = clampToSpec(type, spec.key, eff.params[spec.key])
  eff.params[spec.key] = v
  const id = `fx-${idx}-${spec.key.replace(/[^a-z0-9]/gi, '-')}`
  return `
    <div class="fx-param" data-pidx="${idx}">
      <label for="${id}">${escapeHtml(spec.label)}</label>
      <div class="fx-param-row">
        <input type="range" id="${id}" data-fx="${idx}" data-key="${escapeHtml(spec.key)}"
          min="${spec.min}" max="${spec.max}" step="${spec.step}" value="${v}" />
        <span class="fx-param-val" data-val-for="${id}">${formatParamValue(v, spec)}</span>
      </div>
    </div>`
}

function renderBusSelect (eff, idx) {
  const b = eff.bus
  return `
    <div class="fx-bus-label">Bus routing (§7.10)</div>
    <div class="fx-param-row">
      <select data-fx="${idx}" data-bus-select aria-label="Bus routing">
        <option value="" ${b == null ? 'selected' : ''}>Main (serial)</option>
        <option value="1" ${b === 1 ? 'selected' : ''}>Bus 1</option>
        <option value="2" ${b === 2 ? 'selected' : ''}>Bus 2</option>
      </select>
    </div>`
}

function renderEffectNode (eff, idx) {
  eff = normalizeEffect(eff)
  const type = eff.type
  const schema = EFFECT_SCHEMA[type]
  const opts = EFFECT_OPTIONS.map(
    (o) => `<option value="${o.type}" ${eff.type === o.type ? 'selected' : ''}>${escapeHtml(o.label)}</option>`
  ).join('')
  const paramsHtml = schema.params.map((spec) => renderSliderRow(type, eff, idx, spec)).join('')
  const busHtml = schema.bus ? renderBusSelect(eff, idx) : ''

  return `
    <div class="fx-insert" data-insert="${idx}" aria-label="Insert before this node"></div>
    <div class="fx-node" data-fx="${idx}" data-preset-pos="">
      <div class="fx-node-port fx-node-port-in" aria-hidden="true">
        <button type="button" tabindex="-1" aria-label="Signal in"></button>
      </div>
      <div class="fx-node-core">
        <div class="fx-node-handle" data-drag-handle data-fx="${idx}">
          <span class="fx-grip" aria-hidden="true">⋮⋮</span>
          <select class="fx-node-type" data-fx="${idx}" aria-label="Effect type">${opts}</select>
          <div class="fx-node-actions">
            <button type="button" class="small danger rm-fx" data-fx="${idx}" title="Remove">×</button>
          </div>
        </div>
        ${paramsHtml}
        ${busHtml}
      </div>
      <div class="fx-node-port fx-node-port-out" aria-hidden="true">
        <button type="button" tabindex="-1" aria-label="Signal out"></button>
      </div>
    </div>
  `
}

function redrawFxWires (root) {
  const graph = root.querySelector('.fx-graph')
  const svg = root.querySelector('.fx-graph-svg')
  if (!graph || !svg) return
  const gRect = graph.getBoundingClientRect()
  if (gRect.width < 2 || gRect.height < 2) return
  svg.setAttribute('width', String(Math.ceil(gRect.width)))
  svg.setAttribute('height', String(Math.ceil(gRect.height)))
  const nodes = graph.querySelectorAll('.fx-node')
  const paths = []
  for (let i = 0; i < nodes.length - 1; i++) {
    const outEl = nodes[i].querySelector('.fx-node-port-out button')
    const inEl = nodes[i + 1].querySelector('.fx-node-port-in button')
    if (!outEl || !inEl) continue
    const o = outEl.getBoundingClientRect()
    const inn = inEl.getBoundingClientRect()
    const x1 = o.left + o.width / 2 - gRect.left
    const y1 = o.top + o.height / 2 - gRect.top
    const x2 = inn.left + inn.width / 2 - gRect.left
    const y2 = inn.top + inn.height / 2 - gRect.top
    const mid = (x1 + x2) / 2
    paths.push(`M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${mid.toFixed(1)} ${y1.toFixed(1)}, ${mid.toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`)
  }
  svg.innerHTML = paths.map((d) => `<path d="${d}" />`).join('')
}

function queueWireRedraw (root) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => redrawFxWires(root))
  })
}

function reorderEffects (arr, from, insertBefore) {
  const next = [...arr]
  const [item] = next.splice(from, 1)
  let dest = insertBefore
  if (from < insertBefore) dest -= 1
  dest = Math.max(0, Math.min(next.length, dest))
  next.splice(dest, 0, item)
  return next
}

function clearInsertHover (root) {
  root.querySelectorAll('.fx-insert--hover').forEach((el) => el.classList.remove('fx-insert--hover'))
}

function wireEffectGraph (root, p) {
  const graph = root.querySelector('.fx-graph')
  if (!graph) return

  const panel = document.getElementById('preset-panel')
  if (panel._fxOnResize) window.removeEventListener('resize', panel._fxOnResize)
  panel._fxOnResize = () => queueWireRedraw(root)
  window.addEventListener('resize', panel._fxOnResize)

  const track = root.querySelector('.fx-graph-track')
  if (track) {
    if (track._onScroll) track.removeEventListener('scroll', track._onScroll)
    track._onScroll = () => queueWireRedraw(root)
    track.addEventListener('scroll', track._onScroll, { passive: true })
  }

  const onSlider = (e) => {
    const inp = e.target.closest('input[type="range"][data-fx]')
    if (!inp) return
    const idx = Number(inp.dataset.fx)
    const key = inp.dataset.key
    const eff = p.effects[idx]
    const spec = getParamSpec(eff.type, key)
    if (!spec) return
    const v = clampToSpec(eff.type, key, inp.value)
    eff.params[key] = v
    inp.value = String(v)
    const id = inp.getAttribute('id')
    const out = id && root.querySelector(`[data-val-for="${id}"]`)
    if (out) out.textContent = formatParamValue(v, spec)
    updatePreview()
  }

  root.querySelectorAll('input[type="range"][data-fx]').forEach((inp) => {
    inp.addEventListener('input', onSlider)
  })

  root.querySelectorAll('.fx-node-type').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const idx = Number(e.target.dataset.fx)
      const t = e.target.value
      p.effects[idx] = getDefaultEffect(t)
      renderPresetEditor()
      updatePreview()
    })
  })

  root.querySelectorAll('[data-bus-select]').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const idx = Number(e.target.dataset.fx)
      const v = e.target.value
      p.effects[idx].bus = v === '' ? null : Number(v)
      updatePreview()
    })
  })

  root.querySelectorAll('.rm-fx').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.dataset.fx)
      if (p.effects.length <= 1) {
        setStatus('Chain needs at least one node.', 'err')
        return
      }
      p.effects.splice(idx, 1)
      renderPresetEditor()
      updatePreview()
    })
  })

  root.querySelector('#btn-add-fx')?.addEventListener('click', () => {
    const sel = root.querySelector('#add-fx-type')
    const t = sel && sel.value ? sel.value : 'DELAY'
    p.effects.push(getDefaultEffect(t))
    renderPresetEditor()
    updatePreview()
  })

  root.querySelector('#btn-dup-preset')?.addEventListener('click', () => {
    const next = (state.activePreset + 1) % 4
    state.presets[next] = deepClone(state.presets[state.activePreset])
    state.presets[next].pos = next
    state.activePreset = next
    renderTabs()
    renderPresetEditor()
    updatePreview()
    setStatus(`Duplicated into preset slot ${next}.`, 'ok')
  })

  let lastInsert = -1
  const onMove = (ev) => {
    if (!graphDrag || ev.pointerId !== graphDrag.pointerId) return
    const inserts = [...root.querySelectorAll('.fx-insert')]
    let hover = -1
    let best = Infinity
    for (const el of inserts) {
      const r = el.getBoundingClientRect()
      const cx = (r.left + r.right) / 2
      const d = Math.abs(ev.clientX - cx)
      if (d < best) {
        best = d
        hover = Number(el.dataset.insert)
      }
    }
    if (hover !== lastInsert) {
      clearInsertHover(root)
      const el = inserts.find((x) => Number(x.dataset.insert) === hover)
      if (el) el.classList.add('fx-insert--hover')
      lastInsert = hover
    }
  }

  root.querySelectorAll('[data-drag-handle]').forEach((handle) => {
    handle.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return
      const fromIndex = Number(handle.dataset.fx)
      graphDrag = { fromIndex, pointerId: ev.pointerId }
      graph.classList.add('fx-graph--dragging')
      const node = root.querySelector(`.fx-node[data-fx="${fromIndex}"]`)
      if (node) node.classList.add('fx-node--dragging')
      try {
        handle.setPointerCapture(ev.pointerId)
      } catch (_) {}
      lastInsert = -1

      const finish = (ev2) => {
        if (!graphDrag || ev2.pointerId !== graphDrag.pointerId) return
        const from = graphDrag.fromIndex
        const insertEl = root.querySelector('.fx-insert.fx-insert--hover')
        let insertBefore = from
        if (insertEl && insertEl.dataset.insert != null) {
          insertBefore = Number(insertEl.dataset.insert)
        }
        clearInsertHover(root)
        graph.classList.remove('fx-graph--dragging')
        const n = root.querySelector(`.fx-node[data-fx="${from}"]`)
        if (n) n.classList.remove('fx-node--dragging')
        graphDrag = null
        try {
          handle.releasePointerCapture(ev2.pointerId)
        } catch (_) {}
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', finish)
        document.removeEventListener('pointercancel', finish)
        if (insertBefore !== from) {
          p.effects = reorderEffects(p.effects, from, insertBefore)
          renderPresetEditor()
          updatePreview()
        }
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', finish)
      document.addEventListener('pointercancel', finish)
    })
  })

  queueWireRedraw(root)
}

function renderPresetEditor () {
  const root = document.getElementById('preset-panel')
  const p = state.presets[state.activePreset]
  p.effects = p.effects.map(normalizeEffect)

  const n = p.effects.length
  const nodesHtml = p.effects.map((eff, idx) => renderEffectNode(eff, idx)).join('')
  const lastInsert = `<div class="fx-insert" data-insert="${n}" aria-label="Insert after chain"></div>`

  root.innerHTML = `
    <div class="preset-card">
      <div class="field">
        <label for="preset-name-field">Preset name</label>
        <input type="text" id="preset-name-field" class="preset-name" value="${escapeHtml(p.name)}" />
      </div>
      <div class="field">
        <label for="preset-comment-field">Comment (optional)</label>
        <input type="text" id="preset-comment-field" class="preset-comment" value="${escapeHtml(p.comment)}" />
      </div>
      <h2 style="margin-top:8px">Signal chain</h2>
      <p class="fx-graph-hint">Drag a node by the <strong>⋮⋮</strong> handle to reorder. Signal flows left → right (guide §7.6).</p>
      <div class="fx-graph">
        <svg class="fx-graph-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg>
        <div class="fx-graph-track">
          ${nodesHtml}
          ${lastInsert}
        </div>
      </div>
      <div class="add-node-row">
        <label for="add-fx-type" class="sr-only">Add effect</label>
        <select id="add-fx-type" aria-label="Effect to add">
          ${EFFECT_OPTIONS.map((o) => `<option value="${o.type}">${escapeHtml(o.label)}</option>`).join('')}
        </select>
        <button type="button" class="small" id="btn-add-fx">Add node</button>
        <button type="button" class="small" id="btn-dup-preset">Duplicate to next slot</button>
      </div>
      <details class="modulation-details">
        <summary>Advanced: merge modulation JSON (<code>handle</code>, <code>shake</code>, <code>lfo</code>)</summary>
        <div class="field" style="margin-top:10px;margin-bottom:0">
          <textarea class="preset-extra" spellcheck="false" rows="4" placeholder='{ "handle": { "row": 0, "param": "cutoff", "depth": 0.8 } }'>${escapeHtml(p.extraMerge)}</textarea>
        </div>
      </details>
    </div>
  `

  root.querySelector('#preset-name-field').addEventListener('input', (e) => {
    p.name = e.target.value
    updatePreview()
  })
  root.querySelector('#preset-comment-field').addEventListener('input', (e) => {
    p.comment = e.target.value
    updatePreview()
  })
  root.querySelector('.preset-extra').addEventListener('input', (e) => {
    p.extraMerge = e.target.value
    updatePreview()
  })

  wireEffectGraph(root, p)
}

function wireGlobal () {
  document.getElementById('pack-name').addEventListener('input', updatePreview)

  document.getElementById('sample-slots').addEventListener('change', (e) => {
    const sel = e.target.closest('select.playmode')
    if (!sel) return
    const i = Number(sel.dataset.slot)
    state.samples[i].playmode = sel.value
    updatePreview()
  })

  document.getElementById('sample-slots').addEventListener('click', async (e) => {
    const browse = e.target.closest('.browse-wav')
    if (browse) {
      const i = Number(browse.dataset.slot)
      const path = await tingConfig.pickWav()
      if (!path) return
      state.samples[i].path = path
      state.samples[i].dropLabel = basename(path)
      renderSamples()
      updatePreview()
      setStatus(`Slot ${i + 1}: ${basename(path)}`, 'ok')
      return
    }
    const clear = e.target.closest('.clear-slot')
    if (clear) {
      const i = Number(clear.dataset.slot)
      state.samples[i] = createEmptySample()
      renderSamples()
      updatePreview()
      setStatus(`Cleared slot ${i + 1}.`, 'ok')
    }
  })

  document.getElementById('btn-copy').addEventListener('click', async () => {
    try {
      const cfg = buildConfig({ forPack: false })
      const text = stringifyConfig(cfg)
      await tingConfig.copyJson(text)
      setStatus('JSON copied to clipboard.', 'ok')
    } catch (err) {
      setStatus(err.message || String(err), 'err')
    }
  })

  document.getElementById('btn-save').addEventListener('click', async () => {
    try {
      const cfg = buildConfig({ forPack: false })
      const text = stringifyConfig(cfg)
      const res = await tingConfig.saveJson(text)
      if (res && res.ok) setStatus(`Saved ${res.filePath}`, 'ok')
      else setStatus('Save cancelled.', '')
    } catch (err) {
      setStatus(err.message || String(err), 'err')
    }
  })

  document.getElementById('btn-export-pack').addEventListener('click', async () => {
    try {
      const cfg = buildConfig({ forPack: true })
      const text = stringifyConfig(cfg)
      const files = state.samples.map((s) => s.path)
      const res = await tingConfig.exportPack({ jsonString: text, files })
      if (res && res.ok) setStatus(`Exported to ${res.dir}`, 'ok')
      else setStatus('Export cancelled.', '')
    } catch (err) {
      setStatus(err.message || String(err), 'err')
    }
  })

  document.getElementById('link-guide').addEventListener('click', (ev) => {
    ev.preventDefault()
    tingConfig.openGuide()
  })
}

function render () {
  renderSamples()
  renderTabs()
  renderPresetEditor()
  updatePreview()
}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.tingConfig) {
    setStatus('Preload bridge missing.', 'err')
    return
  }
  wireGlobal()
  render()
})
