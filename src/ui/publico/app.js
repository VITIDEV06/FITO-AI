/* =========================================
   FITOAI — App Controller
   ========================================= */

;(function () {
  'use strict'

  /* --- DOM References --- */
  const $ = (sel) => document.querySelector(sel)
  const $$ = (sel) => document.querySelectorAll(sel)

  const screens = {
    inicio: $('#screenInicio'),
    historial: $('#screenHistorial'),
    estado: $('#screenEstado')
  }

  const navItems = $$('.nav-item')
  const bottomNav = $('#bottomNav')

  const formulario = $('#formularioAnalisis')
  const entrada = $('#entradaObservacion')
  const charCount = $('#charCount')
  const selectorCultivo = $('#selectorCultivo')
  const botonAnalizar = $('#botonAnalizar')
  const botonMic = $('#botonMic')
  const botonDetenerVoz = $('#botonDetenerVoz')
  const voiceStatus = $('#voiceStatus')
  const voiceText = $('#voiceText')
  const botonAdjuntar = $('#botonAdjuntar')
  const inputImagen = $('#inputImagen')
  const imagePreviewContainer = $('#imagePreviewContainer')
  const imagePreview = $('#imagePreview')
  const imageRemove = $('#imageRemove')
  const resultadoContainer = $('#resultadoContainer')
  const resultadoBody = $('#resultadoBody')
  const botonTTS = $('#botonTTS')

  const historialLista = $('#historialLista')
  const historialVacio = $('#historialVacio')
  const historialLoading = $('#historialLoading')
  const historialCount = $('#historialCount')
  const botonLimpiarHistorial = $('#botonLimpiarHistorial')
  const botonIrAnalisis = $('#botonIrAnalisis')

  const modalDetalle = $('#modalDetalle')
  const modalBody = $('#modalBody')
  const modalTitle = $('#modalTitle')
  const botonCerrarModal = $('#botonCerrarModal')

  const modalConfirmar = $('#modalConfirmar')
  const confirmCancelar = $('#confirmCancelar')
  const confirmarEliminar = $('#confirmarEliminar')

  const toast = $('#toast')
  const toastText = $('#toastText')
  const toastIcon = $('#toastIcon')

  /* --- State --- */
  let imagenBase64 = null
  let grabando = false
  let mediaRecorder = null
  let historial = []
  let pantallaActual = 'screenInicio'

  /* --- Initialize --- */
  function init() {
    poblarCultivos()
    bindEvents()
    cargarHistorial()
    verificarEstado()
    navegarA('screenInicio')
  }

  /* --- Navigation --- */
  function navegarA(screenId) {
    pantallaActual = screenId
    Object.values(screens).forEach((s) => {
      if (s) s.classList.remove('screen--active')
    })
    const target = screens[screenId] || $(`#${screenId}`)
    if (target) target.classList.add('screen--active')

    navItems.forEach((item) => {
      const isActive = item.dataset.screen === screenId
      item.classList.toggle('nav-item--active', isActive)
    })

    if (screenId === 'screenHistorial') {
      mostrarLoadingHistorial()
      setTimeout(() => cargarHistorial(), 300)
    }
  }

  /* --- Cultivos --- */
  async function poblarCultivos() {
    selectorCultivo.innerHTML = '<option value="">Seleccionar cultivo...</option>'
    try {
      const res = await fetch('/api/cultivos')
      if (!res.ok) throw new Error('No se pudieron cargar los cultivos')
      const data = await res.json()
      const cultivos = data.cultivos || []
      cultivos.forEach((c) => {
        const opt = document.createElement('option')
        opt.value = c.nombre || ''
        opt.textContent = c.nombre ? c.nombre.charAt(0).toUpperCase() + c.nombre.slice(1) : c.nombre
        selectorCultivo.appendChild(opt)
      })
    } catch (err) {
      console.error('✖ No se pudieron cargar los cultivos:', err.message)
    }
  }

  /* --- Event Bindings --- */
  function bindEvents() {
    navItems.forEach((item) => {
      item.addEventListener('click', () => navegarA(item.dataset.screen))
    })

    formulario.addEventListener('submit', onAnalizar)

    entrada.addEventListener('input', () => {
      charCount.textContent = `${entrada.value.length}/500`
    })

    botonMic.addEventListener('click', onToggleMic)
    botonDetenerVoz.addEventListener('click', onDetenerMic)

    botonAdjuntar.addEventListener('click', () => inputImagen.click())
    inputImagen.addEventListener('change', onImagenSeleccionada)
    imageRemove.addEventListener('click', onEliminarImagen)

    botonTTS.addEventListener('click', onTTS)

    botonLimpiarHistorial.addEventListener('click', onLimpiarHistorial)
    botonIrAnalisis.addEventListener('click', () => navegarA('screenInicio'))

    botonCerrarModal.addEventListener('click', cerrarModalDetalle)
    modalDetalle.addEventListener('click', (e) => {
      if (e.target === modalDetalle) cerrarModalDetalle()
    })

    confirmCancelar.addEventListener('click', cerrarConfirmar)
    confirmarEliminar.addEventListener('click', onConfirmarLimpiar)

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        cerrarModalDetalle()
        cerrarConfirmar()
      }
    })
  }

  /* --- Analizar --- */
  async function onAnalizar(e) {
    e.preventDefault()
    const texto = entrada.value.trim()
    if (!texto && !imagenBase64) {
      mostrarToast('Escribe una observación o adjunta una imagen', 'warning')
      return
    }

    setBotonCargando(true)
    mostrarResultadoEstado('loading')

    try {
      const body = {
        texto: texto || 'Observación con imagen',
        cultivo: selectorCultivo.value || ''
      }
      if (imagenBase64) body.imagen = imagenBase64

      const res = await fetch('/api/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al analizar')

      renderResultado(data.observacion?.analisis || data.analisis || {})
      mostrarToast('Análisis completado', 'success')
      entrada.value = ''
      charCount.textContent = '0/500'
      onEliminarImagen()
      cargarHistorial()
    } catch (err) {
      console.error('✖ FITOAI no pudo completar el análisis local:', err)
      mostrarResultadoEstado('error', err.message || 'FITOAI no pudo completar el análisis local.')
    } finally {
      setBotonCargando(false)
    }
  }

  function setBotonCargando(cargando) {
    const btnText = botonAnalizar.querySelector('.btn-text')
    const btnLoader = botonAnalizar.querySelector('.btn-loader')
    const btnArrow = botonAnalizar.querySelector('.btn-arrow')

    if (cargando) {
      botonAnalizar.classList.add('ocupado')
      botonAnalizar.disabled = true
      btnText.classList.add('oculto')
      btnArrow.classList.add('oculto')
      btnLoader.classList.remove('oculto')
    } else {
      botonAnalizar.classList.remove('ocupado')
      botonAnalizar.disabled = false
      btnText.classList.remove('oculto')
      btnArrow.classList.remove('oculto')
      btnLoader.classList.add('oculto')
    }
  }

  /* --- Render Resultado --- */
  function renderResultado(analisis) {
    resultadoContainer.classList.remove('oculto')

    const certidumbre = analisis.nivelCertidumbre || 'bajo'
    const certClass = `badge-certidumbre badge-certidumbre--${certidumbre}`
    const certLabel = certidumbre.charAt(0).toUpperCase() + certidumbre.slice(1)

    let html = ''

    html += `
      <div class="result-section">
        <div class="result-cultivo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/>
            <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>
            <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>
          </svg>
          ${analisis.cultivo || 'No identificado'}
        </div>
      </div>
    `

    if (analisis.sintomas && analisis.sintomas.length) {
      html += `
        <div class="result-section">
          <div class="result-section-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Síntomas detectados
          </div>
          <ul class="result-list">
            ${analisis.sintomas.map((s) => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      `
    }

    if (analisis.posiblesCausas && analisis.posiblesCausas.length) {
      html += `
        <div class="result-section">
          <div class="result-section-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Posibles causas
          </div>
          <ul class="result-list">
            ${analisis.posiblesCausas.map((c) => `<li>${c}</li>`).join('')}
          </ul>
        </div>
      `
    }

    html += `
      <div class="result-section">
        <div class="result-section-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Nivel de certidumbre
        </div>
        <span class="${certClass}">${certLabel}</span>
      </div>
    `

    if (analisis.proximosPasos && analisis.proximosPasos.length) {
      html += `
        <div class="result-section">
          <div class="result-section-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            Próximos pasos
          </div>
          <ul class="result-list">
            ${analisis.proximosPasos.map((p) => `<li>${p}</li>`).join('')}
          </ul>
        </div>
      `
    }

    if (analisis.informacionFaltante && analisis.informacionFaltante.length) {
      html += `
        <div class="result-section">
          <div class="result-section-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Información faltante
          </div>
          <ul class="result-list">
            ${analisis.informacionFaltante.map((i) => `<li>${i}</li>`).join('')}
          </ul>
        </div>
      `
    }

    const descargo = analisis.descargoResponsabilidad || 'Este análisis es orientativo y no sustituye la evaluación de un especialista agrícola.'
    html += `<p class="result-disclaimer">${descargo}</p>`

    resultadoBody.innerHTML = html

    resultadoContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  function mostrarResultadoEstado(estado, mensaje) {
    resultadoContainer.classList.remove('oculto')
    if (estado === 'loading') {
      resultadoBody.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;padding:32px 0;gap:12px;">
          <svg class="spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" stroke-dasharray="50" stroke-dashoffset="20"/>
          </svg>
          <span style="color:var(--color-text-secondary);font-size:var(--font-size-sm);font-weight:500;">Analizando con QVAC...</span>
        </div>
      `
    } else if (estado === 'empty') {
      resultadoContainer.classList.add('oculto')
      resultadoBody.innerHTML = ''
    } else if (estado === 'error') {
      resultadoBody.innerHTML = `
        <div class="result-error">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>FITOAI no pudo completar el análisis local.</p>
          ${mensaje ? `<code>${escapeHtml(mensaje)}</code>` : ''}
          <p class="result-error-hint">Revisa la consola del navegador para ver el detalle técnico y verifica que el servidor local con QVAC esté en ejecución.</p>
        </div>
      `
    }
  }

  /* --- Voz --- */
  async function onToggleMic() {
    if (grabando) return onDetenerMic()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      const chunks = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        voiceStatus.classList.add('oculto')
        botonMic.classList.remove('grabando')

        try {
          const blob = new Blob(chunks, { type: 'audio/webm' })
          const pcmBase64 = await convertirBlobAPcm(blob)

          mostrarToast('Procesando audio...', 'info')

          const res = await fetch('/api/voz/analizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: pcmBase64, texto: '' })
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Error transcribiendo')

          entrada.value = data.transcripcion || ''
          charCount.textContent = `${entrada.value.length}/500`
          mostrarToast('Transcripción completada', 'success')

          if (data.audioRespuesta) {
            new Audio('data:audio/wav;base64,' + data.audioRespuesta).play().catch(() => {})
          }
          cargarHistorial()
        } catch (err) {
          console.error('✖ No se pudo procesar la voz:', err)
          mostrarToast('FITOAI no pudo procesar el audio localmente', 'error')
        }

        stream.getTracks().forEach((t) => t.stop())
      }

      mediaRecorder.start()
      grabando = true
      botonMic.classList.add('grabando')
      voiceStatus.classList.remove('oculto')
      voiceText.textContent = 'Grabando... habla al micrófono'
    } catch (err) {
      mostrarToast('No se pudo acceder al micrófono', 'error')
    }
  }

  function onDetenerMic() {
    if (mediaRecorder && grabando) {
      mediaRecorder.stop()
      grabando = false
      voiceText.textContent = 'Procesando...'
    }
  }

  /* --- Imagen --- */
  function onImagenSeleccionada(e) {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      mostrarToast('La imagen no puede superar 5 MB', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      imagenBase64 = ev.target.result
      imagePreview.src = imagenBase64
      imagePreviewContainer.classList.remove('oculto')
    }
    reader.readAsDataURL(file)
  }

  function onEliminarImagen() {
    imagenBase64 = null
    inputImagen.value = ''
    imagePreview.src = ''
    imagePreviewContainer.classList.add('oculto')
  }

  /* --- TTS --- */
  async function onTTS() {
    const texto = entrada.value.trim() || resultadoBody.textContent?.trim()
    if (!texto) {
      mostrarToast('No hay texto para sintetizar', 'warning')
      return
    }

    try {
      mostrarToast('Sintetizando voz...', 'info')
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto })
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Error TTS')

      if (!data && res.headers.get('Content-Type')?.includes('audio')) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.onended = () => URL.revokeObjectURL(url)
        audio.play()
        mostrarToast('Reproduciendo audio', 'success')
        return
      }

      if (data && data.sinAudio) {
        throw new Error('La síntesis de voz local no estuvo disponible')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.play()
      mostrarToast('Reproduciendo audio', 'success')
    } catch (err) {
      console.error('✖ Falló la síntesis de voz local:', err)
      mostrarToast('FITOAI no pudo sintetizar la voz localmente', 'error')
    }
  }

  /* --- Historial --- */
  async function cargarHistorial() {
    try {
      const res = await fetch('/api/observaciones')
      if (!res.ok) throw new Error('No se pudo cargar el historial')
      const data = await res.json()
      historial = data.observaciones || []
    } catch (err) {
      console.error('✖ No se pudo cargar el historial:', err)
      historial = []
    }

    ocultarLoadingHistorial()
    renderHistorial()
  }

  function renderHistorial() {
    if (historial.length === 0) {
      historialLista.classList.add('oculto')
      historialVacio.classList.remove('oculto')
      historialCount.textContent = '0 análisis realizados'
      return
    }

    historialVacio.classList.add('oculto')
    historialLista.classList.remove('oculto')
    historialCount.textContent = `${historial.length} análisis realizados`

    const sorted = [...historial].sort((a, b) => new Date(b.fecha || b.createdAt) - new Date(a.fecha || a.createdAt))

    historialLista.innerHTML = sorted.map((obs) => {
      const fecha = formatearFecha(obs.fecha || obs.createdAt)
      const cultivo = obs.cultivo || 'Sin cultivo'
      const texto = obs.textoOriginal || obs.observacion || ''
      const certidumbre = obs.analisis?.nivelCertidumbre || 'bajo'

      return `
        <div class="history-item" data-id="${obs.id}" onclick="window.FITOAI.verDetalle('${obs.id}')">
          <div class="history-item-header">
            <span class="history-item-date">${fecha}</span>
            <span class="history-item-cultivo">${cultivo}</span>
          </div>
          <p class="history-item-text">${escapeHtml(texto)}</p>
          <div class="history-item-footer">
            <span class="badge-certidumbre badge-certidumbre--${certidumbre}">${certidumbre.charAt(0).toUpperCase() + certidumbre.slice(1)}</span>
            <div class="history-item-actions">
              <button class="history-btn history-btn--danger" onclick="event.stopPropagation(); window.FITOAI.eliminarObservacion('${obs.id}')" title="Eliminar">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      `
    }).join('')
  }

  function mostrarLoadingHistorial() {
    historialLista.classList.add('oculto')
    historialVacio.classList.add('oculto')
    historialLoading.classList.remove('oculto')
  }

  function ocultarLoadingHistorial() {
    historialLoading.classList.add('oculto')
  }

  /* --- Detalle Modal --- */
  function verDetalle(id) {
    const obs = historial.find((o) => o.id === id)
    if (!obs) return

    const analisis = obs.analisis || {}
    const certidumbre = analisis.nivelCertidumbre || 'bajo'
    const certLabel = certidumbre.charAt(0).toUpperCase() + certidumbre.slice(1)

    modalTitle.textContent = `Análisis: ${obs.cultivo || 'Sin cultivo'}`

    let html = ''

    html += `
      <div class="modal-section">
        <div class="modal-section-label">Observación original</div>
        <div class="modal-observation">"${escapeHtml(obs.textoOriginal || obs.observacion || '')}"</div>
      </div>
    `

    html += `
      <div class="modal-section">
        <div class="modal-section-label">Cultivo identificado</div>
        <div class="result-cultivo">${obs.cultivo || 'No identificado'}</div>
      </div>
    `

    html += `
      <div class="modal-section">
        <div class="modal-section-label">Nivel de certidumbre</div>
        <span class="badge-certidumbre badge-certidumbre--${certidumbre}">${certLabel}</span>
      </div>
    `

    if (analisis.sintomas?.length) {
      html += `
        <div class="modal-section">
          <div class="modal-section-label">Síntomas</div>
          <ul class="modal-list">
            ${analisis.sintomas.map((s) => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      `
    }

    if (analisis.posiblesCausas?.length) {
      html += `
        <div class="modal-section">
          <div class="modal-section-label">Posibles causas</div>
          <ul class="modal-list">
            ${analisis.posiblesCausas.map((c) => `<li>${c}</li>`).join('')}
          </ul>
        </div>
      `
    }

    if (analisis.proximosPasos?.length) {
      html += `
        <div class="modal-section">
          <div class="modal-section-label">Próximos pasos</div>
          <ul class="modal-list">
            ${analisis.proximosPasos.map((p) => `<li>${p}</li>`).join('')}
          </ul>
        </div>
      `
    }

    if (analisis.informacionFaltante?.length) {
      html += `
        <div class="modal-section">
          <div class="modal-section-label">Información faltante</div>
          <ul class="modal-list">
            ${analisis.informacionFaltante.map((i) => `<li>${i}</li>`).join('')}
          </ul>
        </div>
      `
    }

    html += `
      <div class="modal-section">
        <div class="modal-meta">
          <span class="modal-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${formatearFecha(obs.fecha || obs.createdAt)}
          </span>
          ${obs.metadata?.tipo ? `<span class="modal-meta-item">${obs.metadata.tipo === 'imagen' ? '📷 Con imagen' : obs.metadata.tipo === 'voz' ? '🎙️ Por voz' : '📝 Texto'}</span>` : ''}
        </div>
      </div>
    `

    const descargo = analisis.descargoResponsabilidad || 'FITOAI proporciona orientación y no sustituye a un profesional agrícola.'
    html += `<p class="result-disclaimer">${descargo}</p>`

    modalBody.innerHTML = html
    modalDetalle.classList.remove('oculto')
    document.body.style.overflow = 'hidden'
  }

  function cerrarModalDetalle() {
    modalDetalle.classList.add('oculto')
    document.body.style.overflow = ''
  }

  /* --- Eliminar Observación --- */
  async function eliminarObservacion(id) {
    try {
      const res = await fetch(`/api/observaciones/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('No se pudo eliminar la observación')
      historial = historial.filter((o) => o.id !== id)
      renderHistorial()
      mostrarToast('Observación eliminada', 'success')
    } catch (err) {
      console.error('✖ No se pudo eliminar la observación:', err)
      mostrarToast('No se pudo eliminar la observación', 'error')
    }
  }

  /* --- Limpiar Historial --- */
  function onLimpiarHistorial() {
    modalConfirmar.classList.remove('oculto')
    document.body.style.overflow = 'hidden'
  }

  function cerrarConfirmar() {
    modalConfirmar.classList.add('oculto')
    document.body.style.overflow = ''
  }

  async function onConfirmarLimpiar() {
    cerrarConfirmar()

    try {
      const res = await fetch('/api/observaciones', { method: 'DELETE' })
      if (!res.ok) throw new Error('No se pudo limpiar el historial')
      historial = []
      renderHistorial()
      mostrarToast('Historial eliminado', 'success')
    } catch (err) {
      console.error('✖ No se pudo limpiar el historial:', err)
      mostrarToast('No se pudo limpiar el historial', 'error')
    }
  }

  /* --- Estado --- */
  async function verificarEstado() {
    try {
      const res = await fetch('/api/estado')
      const data = await res.json()

      const statusQVAC = $('#statusQVAC')
      const statusVoz = $('#statusVoz')
      const statusVision = $('#statusVision')

      if (data.iaLocal) {
        statusQVAC.textContent = 'Activo'
        statusQVAC.style.color = 'var(--color-success)'
      } else {
        statusQVAC.textContent = 'No disponible'
        statusQVAC.style.color = 'var(--color-error)'
      }

      statusVoz.textContent = data.voz ? 'Disponible' : 'No disponible'
      statusVoz.style.color = data.voz ? 'var(--color-success)' : 'var(--color-error)'
      statusVision.textContent = data.imagen ? 'Disponible' : 'No disponible'
      statusVision.style.color = data.imagen ? 'var(--color-success)' : 'var(--color-error)'
    } catch (err) {
      console.error('✖ No se pudo verificar el estado del sistema:', err)
      const statusQVAC = $('#statusQVAC')
      statusQVAC.textContent = 'No conectado'
      statusQVAC.style.color = 'var(--color-error)'
    }
  }

  /* --- Toast --- */
  function mostrarToast(mensaje, tipo) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    }

    toastText.textContent = mensaje
    toastIcon.textContent = icons[tipo] || ''
    toast.className = 'toast'
    toast.classList.remove('oculto')

    clearTimeout(toast._timeout)
    toast._timeout = setTimeout(() => {
      toast.classList.add('oculto')
    }, 3000)
  }

  /* --- Helpers --- */
  async function convertirBlobAPcm(blob) {
    const arrayBuffer = await blob.arrayBuffer()
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    let audioBuffer
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    } finally {
      audioCtx.close().catch(() => {})
    }

    const fuente = audioBuffer.getChannelData(0)
    const nCanales = audioBuffer.numberOfChannels
    let muestras
    if (nCanales > 1) {
      muestras = new Float32Array(fuente.length)
      for (let i = 0; i < fuente.length; i++) {
        let acc = 0
        for (let c = 0; c < nCanales; c++) acc += audioBuffer.getChannelData(c)[i]
        muestras[i] = acc / nCanales
      }
    } else {
      muestras = fuente
    }

    const tasaFuente = audioBuffer.sampleRate
    const tasaMeta = 16000
    const largoSalida = Math.floor(muestras.length * tasaMeta / tasaFuente)
    const ratio = muestras.length / largoSalida
    const pcm = new Int16Array(largoSalida)
    for (let i = 0; i < largoSalida; i++) {
      const valor = muestras[Math.floor(i * ratio)]
      pcm[i] = Math.max(-32768, Math.min(32767, Math.round(valor * 32767)))
    }

    const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength)
    return bytesABase64(bytes)
  }

  function bytesABase64(bytes) {
    const trozos = []
    const tamano = 0x8000
    for (let i = 0; i < bytes.length; i += tamano) {
      trozos.push(String.fromCharCode.apply(null, bytes.subarray(i, i + tamano)))
    }
    return btoa(trozos.join(''))
  }

  function formatearFecha(fechaStr) {
    if (!fechaStr) return ''
    const fecha = new Date(fechaStr)
    const ahora = new Date()
    const diffMs = ahora - fecha
    const diffMin = Math.floor(diffMs / 60000)
    const diffHoras = Math.floor(diffMs / 3600000)
    const diffDias = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'Ahora mismo'
    if (diffMin < 60) return `Hace ${diffMin} min`
    if (diffHoras < 24) return `Hace ${diffHoras}h`
    if (diffDias < 7) return `Hace ${diffDias}d`

    return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function escapeHtml(str) {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }

  /* --- Public API --- */
  window.FITOAI = {
    verDetalle,
    eliminarObservacion
  }

  /* --- Start --- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
