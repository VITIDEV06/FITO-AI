const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const { buscarContextoAgricola, cargarConocimiento } = require('../core/knowledge/conocimientoAgricola')

const DIR_PUBLICO = path.join(__dirname, 'publico')
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.wav': 'audio/wav'
}

function leerCuerpo(request) {
  return new Promise((resolve, reject) => {
    let cuerpo = ''
    request.on('data', (chunk) => {
      cuerpo += chunk
      if (cuerpo.length > 12e6) {
        request.destroy()
        reject(new Error('Cuerpo demasiado grande'))
      }
    })
    request.on('end', () => resolve(cuerpo))
    request.on('error', reject)
  })
}

function enviarJSON(response, statusCode, data) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(data))
}

function servirArchivo(response, rutaArchivo) {
  fs.readFile(rutaArchivo, (err, contenido) => {
    if (err) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('404 - No encontrado')
      return
    }
    const ext = path.extname(rutaArchivo)
    const tipo = MIME_TYPES[ext] || 'application/octet-stream'
    response.writeHead(200, { 'Content-Type': tipo })
    response.end(contenido)
  })
}

function guardarPcmTemporal(audioBuffer) {
  const tmpId = crypto.randomBytes(8).toString('hex')
  const tmpDir = path.join(os.tmpdir(), 'fitoai')
  fs.mkdirSync(tmpDir, { recursive: true })
  const tmpPcm = path.join(tmpDir, `audio_${tmpId}.raw`)
  fs.writeFileSync(tmpPcm, audioBuffer)
  return tmpPcm
}

function crearServidor(motor, almacen) {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`)
    const ruta = url.pathname

    try {
      if (request.method === 'GET' && ruta === '/') {
        servirArchivo(response, path.join(DIR_PUBLICO, 'index.html'))
        return
      }

      if (request.method === 'GET' && ruta === '/api/estado') {
        enviarJSON(response, 200, {
          iaLocal: motor.listo,
          nombre: 'FITOAI',
          offline: true,
          voz: motor.listo,
          imagen: motor.listo
        })
        return
      }

      if (request.method === 'GET' && ruta === '/api/cultivos') {
        const datos = cargarConocimiento()
        enviarJSON(response, 200, { cultivos: datos.cultivos || [] })
        return
      }

      if (request.method === 'GET' && ruta === '/api/observaciones') {
        const observaciones = almacen.cargarTodas()
        enviarJSON(response, 200, { observaciones })
        return
      }

      if (request.method === 'GET' && ruta.startsWith('/api/observaciones/')) {
        const id = ruta.split('/').pop()
        const observacion = almacen.cargarPorId(id)
        if (!observacion) {
          enviarJSON(response, 404, { error: 'No se encontró la observación.' })
          return
        }
        enviarJSON(response, 200, { observacion })
        return
      }

      if (request.method === 'DELETE' && ruta === '/api/observaciones') {
        const vacias = almacen.eliminarTodas()
        enviarJSON(response, 200, { ok: true, observaciones: vacias })
        return
      }

      if (request.method === 'DELETE' && ruta.startsWith('/api/observaciones/')) {
        const id = ruta.split('/').pop()
        const observaciones = almacen.eliminarPorId(id)
        enviarJSON(response, 200, { ok: true, observaciones })
        return
      }

      if (request.method === 'POST' && ruta === '/api/analizar') {
        const cuerpo = await leerCuerpo(request)
        let datos
        try { datos = JSON.parse(cuerpo) } catch { enviarJSON(response, 400, { error: 'JSON inválido.' }); return }
        const { texto, cultivo, imagen } = datos || {}

        if (!texto || !String(texto).trim()) {
          enviarJSON(response, 400, { error: 'Escribe una observación para analizar.' })
          return
        }

        if (!motor.listo) {
          enviarJSON(response, 503, { error: 'El motor QVAC no está disponible.' })
          return
        }

        const textoLimpio = String(texto).trim()
        const nombreCultivo = (cultivo || '').trim()
        const contextoAgricola = buscarContextoAgricola({ texto: textoLimpio, cultivo: nombreCultivo })

        let analisis
        if (imagen && typeof imagen === 'string') {
          analisis = await motor.analizarImagen(null, textoLimpio, contextoAgricola, imagen)
        } else {
          analisis = await motor.analizar(textoLimpio, contextoAgricola)
        }

        const obs = {
          id: crypto.randomBytes(4).toString('hex'),
          fecha: new Date().toISOString(),
          textoOriginal: textoLimpio,
          cultivo: nombreCultivo || analisis.cultivo || 'No identificado',
          observacion: textoLimpio,
          analisis,
          metadata: { imagen: !!imagen, tipo: imagen ? 'imagen' : 'texto' }
        }

        const guardada = almacen.guardarObservacion(obs)
        enviarJSON(response, 200, { exito: true, observacion: guardada })
        return
      }

      if (request.method === 'POST' && ruta === '/api/imagen/analizar') {
        const cuerpo = await leerCuerpo(request)
        let datos
        try { datos = JSON.parse(cuerpo) } catch { enviarJSON(response, 400, { error: 'JSON inválido.' }); return }
        const { texto, imagen, cultivo } = datos || {}

        if (!texto || !String(texto).trim()) {
          enviarJSON(response, 400, { error: 'Escribe una descripción del problema.' })
          return
        }

        if (!imagen || typeof imagen !== 'string') {
          enviarJSON(response, 400, { error: 'Adjunta una imagen.' })
          return
        }

        if (!motor.listo) {
          enviarJSON(response, 503, { error: 'El motor QVAC no está disponible.' })
          return
        }

        const textoLimpio = String(texto).trim()
        const contextoAgricola = buscarContextoAgricola({ texto: textoLimpio, cultivo: (cultivo || '').trim() })
        const analisis = await motor.analizarImagen(null, textoLimpio, contextoAgricola, imagen)

        const obs = {
          id: crypto.randomBytes(4).toString('hex'),
          fecha: new Date().toISOString(),
          textoOriginal: textoLimpio,
          cultivo: (cultivo || '').trim() || analisis.cultivo || 'No identificado',
          observacion: textoLimpio,
          analisis,
          metadata: { tipo: 'imagen', imagen: true }
        }

        almacen.guardarObservacion(obs)
        enviarJSON(response, 200, { exito: true, analisis, observacion: obs })
        return
      }

      if (request.method === 'POST' && ruta === '/api/voz/analizar') {
        const cuerpo = await leerCuerpo(request)
        let datos
        try { datos = JSON.parse(cuerpo || '{}') } catch { enviarJSON(response, 400, { error: 'JSON inválido.' }); return }
        const audioBase64 = (datos.audio || datos.audioBase64 || '').toString()
        const texto = (datos.texto || '').trim()

        if (!audioBase64) {
          enviarJSON(response, 400, { error: 'No se recibió audio del micrófono.' })
          return
        }

        if (!motor.listo) {
          enviarJSON(response, 503, { error: 'El motor QVAC no está disponible.' })
          return
        }

        const audioSinPrefijo = audioBase64.startsWith('data:') ? audioBase64.split(',')[1] : audioBase64
        const pcmBuffer = Buffer.from(audioSinPrefijo, 'base64')

        let tmpPcm = null
        try {
          tmpPcm = guardarPcmTemporal(pcmBuffer)
          const resultado = await motor.analizarAudio(tmpPcm, null, { prompt: 'Transcribe esta observación agrícola en español.' })

          const resTexto = texto || resultado.transcripcion || ''
          const contextoAgricola = buscarContextoAgricola({ texto: resTexto })
          const analisis = resultado.analisis

          let respuestaAudioBase64 = null
          try {
            const respuestaAudio = await motor.hablarTexto(`He analizado la observación. ${analisis.cultivo !== 'No identificado' ? `Parece ser ${analisis.cultivo}.` : ''}`)
            if (respuestaAudio.audio) {
              respuestaAudioBase64 = respuestaAudio.audio.toString('base64')
            }
          } catch {}

          const obs = {
            id: crypto.randomBytes(4).toString('hex'),
            fecha: new Date().toISOString(),
            textoOriginal: resTexto,
            cultivo: analisis.cultivo || 'No identificado',
            observacion: resTexto,
            analisis,
            metadata: { tipo: 'voz', audio: !!respuestaAudioBase64 }
          }

          almacen.guardarObservacion(obs)

          enviarJSON(response, 200, {
            exito: true,
            transcripcion: resultado.transcripcion,
            analisis,
            audioRespuesta: respuestaAudioBase64,
            observacion: obs
          })
        } finally {
          if (tmpPcm) try { fs.unlinkSync(tmpPcm) } catch {}
        }
        return
      }

      if (request.method === 'POST' && ruta === '/api/tts') {
        const cuerpo = await leerCuerpo(request)
        let datos
        try { datos = JSON.parse(cuerpo || '{}') } catch { enviarJSON(response, 400, { error: 'JSON inválido.' }); return }
        const texto = (datos.texto || '').trim()

        if (!texto) {
          enviarJSON(response, 400, { error: 'No hay texto para sintetizar.' })
          return
        }

        if (!motor.listo) {
          enviarJSON(response, 503, { error: 'El motor QVAC no está disponible.' })
          return
        }

        const resultado = await motor.hablarTexto(texto)

        if (!resultado.audio) {
          enviarJSON(response, 200, { ok: false, mensaje: resultado.fallbackText || texto, sinAudio: true })
          return
        }

        response.writeHead(200, {
          'Content-Type': 'audio/wav',
          'Content-Length': resultado.audio.length
        })
        response.end(resultado.audio)
        return
      }

      if (request.method === 'GET') {
        const rutaArchivo = path.join(DIR_PUBLICO, ruta === '/' ? 'index.html' : ruta)
        servirArchivo(response, rutaArchivo)
        return
      }

      enviarJSON(response, 405, { error: 'Método no permitido.' })
    } catch (error) {
      console.error('✖ Error:', error)
      enviarJSON(response, 500, { error: 'FITOAI no pudo completar el análisis local.' })
    }
  })
}

module.exports = { crearServidor }
