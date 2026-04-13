/* global tingConfig */

const GUIDE_URL = 'https://teenage.engineering/guides/ep-2350'

const PLAYMODES = [
  { value: 'oneshot', label: 'oneshot' },
  { value: 'hold', label: 'hold' },
  { value: 'startstop', label: 'startstop' }
]

const EFFECT_OPTIONS = [
  { type: 'SAMPLE', label: 'SAMPLE' },
  { type: 'DIST', label: 'DIST (distortion)' },
  { type: 'DELAY', label: 'DELAY (echo)' },
  { type: 'REVERB', label: 'REVERB' },
  { type: 'LOWPASS', label: 'LOWPASS' },
  { type: 'HARMONY', label: 'HARMONY' },
  { type: 'RING', label: 'RING' },
  { type: 'SSB', label: 'SSB' }
]

const DEFAULT_PARAMS = {
  SAMPLE: {},
  DIST: { amount: 10, mix: 0.5, 'lowpass-cutoff': 1, 'highpass-cutoff': 0 },
  DELAY: {
    time: 0.5,
    'lowpass-cutoff': 1,
    'highpass-cutoff': 0,
    'wet-level': 0.3,
    'dry-level': 0.7,
    echo: 0.3,
    'cross-feed': 0,
    balance: 0.5
  },
  REVERB: {
    time: 0.5,
    'wet-level': 0.35,
    'dry-level': 0.65,
    'spring-mix': 0.2,
    'highpass-cutoff': 0
  },
  LOWPASS: { cutoff: 0.5 },
  HARMONY: { 'dry-level': 0.8, pitch: 1, 'lowpass-cutoff': 1, 'highpass-cutoff': 0 },
  RING: { frequency: 440, mix: 0.3 },
  SSB: { frequency: 2000 }
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
    effects: [{ type: 'SAMPLE', params: { ...DEFAULT_PARAMS.SAMPLE } }]
  }
}

const state = {
  samples: [0, 1, 2, 3].map(() => createEmptySample()),
  presets: [0, 1, 2, 3].map((i) => createPreset(i)),
  activePreset: 0
}

function setStatus (msg, kind) {
  const el = document.getElementById('status')
  el.textContent = msg || ''
  el.classList.remove('ok', 'err')
  if (kind === 'ok') el.classList.add('ok')
  if (kind === 'err') el.classList.add('err')
}

function effectToJson ({ type, params }) {
  const o = { effect: type }
  if (type === 'SAMPLE') return o
  for (const [k, v] of Object.entries(params)) {
    const n = typeof v === 'number' ? v : Number(v)
    if (!Number.isFinite(n)) continue
    o[k] = n
  }
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
    const list = p.effects.map(effectToJson)
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

function paramKeysFor (type) {
  const d = DEFAULT_PARAMS[type]
  return Object.keys(d)
}

function renderPresetEditor () {
  const root = document.getElementById('preset-panel')
  const p = state.presets[state.activePreset]
  const effectsHtml = p.effects
    .map((eff, idx) => {
      const opts = EFFECT_OPTIONS.map(
        (o) => `<option value="${o.type}" ${eff.type === o.type ? 'selected' : ''}>${escapeHtml(o.label)}</option>`
      ).join('')
      const keys = paramKeysFor(eff.type)
      const paramsHtml = keys
        .map((key) => {
          const v = eff.params[key] != null ? eff.params[key] : DEFAULT_PARAMS[eff.type][key]
          return `
          <label>${escapeHtml(key)}
            <input type="number" step="any" data-preset="${p.pos}" data-fx="${idx}" data-param="${escapeHtml(key)}" value="${v}" />
          </label>`
        })
        .join('')
      return `
      <div class="effect-row" data-preset="${p.pos}" data-fx="${idx}">
        <div class="effect-row-head">
          <select class="fx-type" data-preset="${p.pos}" data-fx="${idx}" aria-label="Effect type">${opts}</select>
          <button type="button" class="small move-fx-up" data-preset="${p.pos}" data-fx="${idx}">Up</button>
          <button type="button" class="small move-fx-down" data-preset="${p.pos}" data-fx="${idx}">Down</button>
          <button type="button" class="small danger rm-fx" data-preset="${p.pos}" data-fx="${idx}">Remove</button>
        </div>
        ${keys.length ? `<div class="param-grid">${paramsHtml}</div>` : '<p class="empty-hint" style="margin:0;color:var(--muted);font-size:0.8rem;">No extra parameters.</p>'}
      </div>`
    })
    .join('')

  root.innerHTML = `
    <div class="preset-card">
      <div class="field">
        <label>Preset name</label>
        <input type="text" class="preset-name" data-preset="${p.pos}" value="${escapeHtml(p.name)}" />
      </div>
      <div class="field">
        <label>Comment (optional)</label>
        <input type="text" class="preset-comment" data-preset="${p.pos}" value="${escapeHtml(p.comment)}" />
      </div>
      <h2 style="margin-top:8px">Effect chain</h2>
      ${effectsHtml}
      <div class="row-actions">
        <button type="button" class="small" id="btn-add-fx">Add effect</button>
        <button type="button" class="small" id="btn-dup-preset">Duplicate to next slot</button>
      </div>
      <div class="field" style="margin-top:16px">
        <label>Merge JSON (optional <code>handle</code>, <code>shake</code>, <code>lfo</code>, …)</label>
        <textarea class="preset-extra" data-preset="${p.pos}" spellcheck="false" placeholder='{ "handle": { "row": 0, "param": "cutoff", "depth": 0.8 } }'>${escapeHtml(p.extraMerge)}</textarea>
      </div>
    </div>
  `

  root.querySelector('.preset-name').addEventListener('input', (e) => {
    p.name = e.target.value
    updatePreview()
  })
  root.querySelector('.preset-comment').addEventListener('input', (e) => {
    p.comment = e.target.value
    updatePreview()
  })
  root.querySelector('.preset-extra').addEventListener('input', (e) => {
    p.extraMerge = e.target.value
    updatePreview()
  })

  root.querySelectorAll('.fx-type').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const idx = Number(e.target.dataset.fx)
      const type = e.target.value
      p.effects[idx] = { type, params: deepClone(DEFAULT_PARAMS[type]) }
      renderPresetEditor()
      updatePreview()
    })
  })

  root.querySelectorAll('.param-grid input').forEach((inp) => {
    inp.addEventListener('input', (e) => {
      const idx = Number(e.target.dataset.fx)
      const key = e.target.dataset.param
      const n = Number(e.target.value)
      p.effects[idx].params[key] = Number.isFinite(n) ? n : e.target.value
      updatePreview()
    })
  })

  root.querySelectorAll('.rm-fx').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.dataset.fx)
      if (p.effects.length <= 1) {
        setStatus('Keep at least one effect row.', 'err')
        return
      }
      p.effects.splice(idx, 1)
      renderPresetEditor()
      updatePreview()
    })
  })

  root.querySelectorAll('.move-fx-up').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.dataset.fx)
      if (idx <= 0) return
      ;[p.effects[idx - 1], p.effects[idx]] = [p.effects[idx], p.effects[idx - 1]]
      renderPresetEditor()
      updatePreview()
    })
  })

  root.querySelectorAll('.move-fx-down').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.dataset.fx)
      if (idx >= p.effects.length - 1) return
      ;[p.effects[idx + 1], p.effects[idx]] = [p.effects[idx], p.effects[idx + 1]]
      renderPresetEditor()
      updatePreview()
    })
  })

  root.querySelector('#btn-add-fx').addEventListener('click', () => {
    const t = 'DELAY'
    p.effects.push({ type: t, params: deepClone(DEFAULT_PARAMS[t]) })
    renderPresetEditor()
    updatePreview()
  })

  root.querySelector('#btn-dup-preset').addEventListener('click', () => {
    const next = (state.activePreset + 1) % 4
    state.presets[next] = deepClone(state.presets[state.activePreset])
    state.presets[next].pos = next
    state.activePreset = next
    renderTabs()
    renderPresetEditor()
    updatePreview()
    setStatus(`Duplicated into preset slot ${next}.`, 'ok')
  })
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
