require('./asegurarWorker').asegurarWorker()
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const {
  loadModel,
  completion,
  unloadModel,
  transcribe,
  textToSpeech,
  LLAMA_3_2_1B_INST_Q4_0,
  WHISPER_SPANISH_TINY_Q8_0,
  TTS_MULTILINGUAL_SUPERTONIC3_Q8_0,
  SMOLVLM2_500M_MULTIMODAL_Q8_0,
  MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0
} = require('@qvac/sdk')

function crearWavHeader(totalPcmBytes, sampleRate, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = totalPcmBytes
  const headerSize = 44
  const buffer = Buffer.alloc(headerSize)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  return buffer
}

function pcmInt16SamplesToWav(samples, sampleRate) {
  const arr = samples instanceof Int16Array ? samples : Int16Array.from(samples)
  const pcmBuf = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
  return Buffer.concat([crearWavHeader(pcmBuf.length, sampleRate), pcmBuf])
}
const { buscarContextoAgricola } = require('../knowledge/conocimientoAgricola')

const PROMPT_SISTEMA = `Eres un asistente agrícola experto que trabaja localmente. Analiza la observación del agricultor y responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown y sin bloques de código.

El JSON debe tener esta estructura exacta:
{
  "cultivo": "nombre del cultivo identificado o 'No identificado' si no se puede determinar",
  "sintomas": ["lista de síntomas u observaciones"],
  "posibles_causas": ["lista de posibles causas o preocupaciones"],
  "nivel_certidumbre": "bajo" | "medio" | "alto",
  "proximos_pasos": ["lista de próximos pasos recomendados"],
  "informacion_faltante": ["lista de información adicional que ayudaría"]
}

Reglas IMPORTANTES:
- Usa lenguaje cauteloso: "posible causa", "podría estar asociado con", "considerar verificar".
- No presentes un diagnóstico definitivo ni absoluto.
- No menciones pesticidas, insecticidas, fungicidas, herbicidas, rodenticidas, químicos o dosis.
- Si falta información, indica qué datos ayudarían.
- El nivel_certidumbre refleja cuánta información tienes: bajo, medio o alto.
- Responde SOLO con JSON, nada más.`

const TERMINOS_PROHIBIDOS =
  /pesticida|insecticida|fungicida|herbicida|acaricida|plaguicida|repelente|rodenticida|quimic|químic|dosis|fumig|rociar|rociado|toxic|veneno/i

class MotorQvac {
  constructor() {
    this.modeloId = null
    this.asrModelId = null
    this.ttsModelId = null
    this.multimodalModelId = null
    this.listo = false
  }

  async inicializar() {
    if (!this.modeloId) {
      this.modeloId = await loadModel({
        modelSrc: LLAMA_3_2_1B_INST_Q4_0,
        modelType: 'llm'
      })
    }
    this.listo = true
    console.log(`▸ Modelo QVAC cargado: ${this.modeloId}`)
  }

  async _asegurarAsr() {
    if (!this.asrModelId) {
      this.asrModelId = await loadModel({
        modelSrc: WHISPER_SPANISH_TINY_Q8_0,
        modelConfig: {
          audio_format: 's16le',
          strategy: 'greedy',
          n_threads: 4,
          language: 'es',
          no_timestamps: true,
          suppress_blank: true,
          suppress_nst: true,
          temperature: 0.0
        }
      })
      console.log(`▸ ASR QVAC cargado: ${this.asrModelId}`)
    }
    return this.asrModelId
  }

  async _asegurarTts() {
    if (this.ttsModelId) {
      return this.ttsModelId
    }

    try {
      this.ttsModelId = await loadModel({
        modelSrc: TTS_MULTILINGUAL_SUPERTONIC3_Q8_0,
        modelConfig: {
          ttsEngine: 'supertonic',
          language: 'es',
          voice: 'F1',
          ttsSpeed: 1.0,
          ttsNumInferenceSteps: 5,
          outputSampleRate: 44100
        }
      })
      console.log(`▸ TTS QVAC cargado: ${this.ttsModelId}`)
      return this.ttsModelId
    } catch (error) {
      console.warn('▸ TTS QVAC no disponible en este entorno; se usará la respuesta de texto sin audio.', error?.message || error)
      this.ttsModelId = null
      return null
    }
  }

  async _asegurarMultimodal() {
    if (this.multimodalModelId) {
      return this.multimodalModelId
    }

    try {
      this.multimodalModelId = await loadModel({
        modelSrc: SMOLVLM2_500M_MULTIMODAL_Q8_0,
        modelConfig: {
          ctx_size: 1024,
          projectionModelSrc: MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0
        }
      })
      console.log(`▸ Modelo multimodal QVAC cargado: ${this.multimodalModelId}`)
      return this.multimodalModelId
    } catch (error) {
      console.warn('▸ Modelo multimodal QVAC no disponible; se usará el análisis local del LLM base.', error?.message || error)
      this.multimodalModelId = null
      return null
    }
  }

  async cerrar() {
    const promises = []
    if (this.modeloId) promises.push(unloadModel({ modelId: this.modeloId, clearStorage: false }))
    if (this.asrModelId) promises.push(unloadModel({ modelId: this.asrModelId, clearStorage: false }))
    if (this.ttsModelId) promises.push(unloadModel({ modelId: this.ttsModelId, clearStorage: false }))
    if (this.multimodalModelId) promises.push(unloadModel({ modelId: this.multimodalModelId, clearStorage: false }))
    await Promise.allSettled(promises)
    this.modeloId = null
    this.asrModelId = null
    this.ttsModelId = null
    this.multimodalModelId = null
    this.listo = false
  }

  async transcribirAudio(audioBuffer, opciones = {}) {
    if (!audioBuffer || !(audioBuffer instanceof Buffer || ArrayBuffer.isView(audioBuffer) || typeof audioBuffer === 'string')) {
      throw new Error('Se requiere un buffer o ruta de audio válido para transcribir.')
    }

    const modelId = await this._asegurarAsr()
    const prompt = opciones.prompt || ''
    const texto = await transcribe({
      modelId,
      audioChunk: audioBuffer,
      prompt,
      metadata: false
    })

    return String(texto || '').trim()
  }

  async analizarAudio(audioBuffer, contextoAgricola = null, opciones = {}) {
    const texto = await this.transcribirAudio(audioBuffer, opciones)
    if (!texto) {
      throw new Error('No se detectó voz en el audio capturado.')
    }

    const resultado = await this.analizar(texto, contextoAgricola)
    return {
      transcripcion: texto,
      analisis: resultado
    }
  }

  async hablarTexto(texto) {
    const mensaje = String(texto || '').trim()
    if (!mensaje) {
      throw new Error('No hay texto para convertir a voz.')
    }

    const modelId = await this._asegurarTts()
    if (!modelId) {
      return {
        audio: null,
        contentType: 'audio/wav',
        sampleRate: 44100,
        fallbackText: mensaje,
        respuestaTexto: mensaje
      }
    }

    try {
      const resultado = textToSpeech({
        modelId,
        text: mensaje,
        inputType: 'text',
        stream: false
      })

      const muestras = await resultado.buffer
      const wavBuffer = pcmInt16SamplesToWav(muestras, 44100)
      return {
        audio: wavBuffer,
        contentType: 'audio/wav',
        sampleRate: 44100,
        fallbackText: mensaje,
        respuestaTexto: mensaje
      }
    } catch (error) {
      console.warn('▸ Falló la síntesis de voz QVAC; se devolvera texto sin audio.', error?.message || error)
      return {
        audio: null,
        contentType: 'audio/wav',
        sampleRate: 44100,
        fallbackText: mensaje,
        respuestaTexto: mensaje
      }
    }
  }

  async analizarImagen(rutaImagen, textoExtra = '', contextoAgricola = null, imagenBase64 = null) {
    if (!rutaImagen && !imagenBase64) {
      throw new Error('Se requiere una ruta de imagen o una imagen base64 para analizar.')
    }

    const textoUsuario = [
      'Analiza esta imagen desde una perspectiva agrícola local y segura. No des un diagnóstico definitivo. Identifica posibles síntomas, cultivos, riesgos y próximos pasos. Responde con un JSON estructurado.',
      textoExtra && String(textoExtra).trim() ? `Contexto adicional del agricultor: ${String(textoExtra).trim()}` : ''
    ].filter(Boolean).join('\n\n')

    const modelId = await this._asegurarMultimodal()
    if (!modelId) {
      const textoFallback = `${textoUsuario}\n\nImportante: no se pudo usar la visión multimodal de QVAC, pero el análisis se realiza con el modelo local de texto para mantener el flujo funcional.`
      const resultado = await this.analizar(textoFallback, contextoAgricola || buscarContextoAgricola({ texto: textoFallback }))
      return resultado
    }

    let archivoImagen = rutaImagen
    if (!archivoImagen && imagenBase64) {
      archivoImagen = this._guardarImagenBase64(imagenBase64)
    }

    try {
      const run = completion({
        modelId,
        history: [{ role: 'user', content: textoUsuario, attachments: [{ path: archivoImagen }] }],
        stream: true
      })

      let textoRespuesta = ''
      for await (const token of run.tokenStream) {
        textoRespuesta += token
      }

      const resultado = this._parsearRespuesta(textoRespuesta, textoUsuario)
      const contextoLocal = contextoAgricola || buscarContextoAgricola({ texto: textoUsuario })
      const resultadoEnriquecido = this._aplicarContextoLocal(resultado, textoUsuario, contextoLocal)
      return resultadoEnriquecido
    } catch (error) {
      console.warn('▸ Falló la visión multimodal QVAC; se reutiliza la inferencia local del LLM base.', error?.message || error)
      const textoFallback = `${textoUsuario}\n\nImportante: la visión multimodal falló y se reutiliza el análisis textual local del modelo QVAC disponible.`
      const resultado = await this.analizar(textoFallback, contextoAgricola || buscarContextoAgricola({ texto: textoFallback }))
      return resultado
    } finally {
      try { fs.unlinkSync(archivoImagen) } catch {}
    }
  }

  async analizar(textoObservacion, contextoAgricola = null) {
    if (!this.listo || !this.modeloId) {
      throw new Error('El motor QVAC no está inicializado.')
    }

    const contextoAgricolaSeguro = contextoAgricola && typeof contextoAgricola === 'object' ? contextoAgricola : null
    const contexto = contextoAgricolaSeguro ? this._armarContextoAgricola(contextoAgricolaSeguro) : ''
    const payload = `${textoObservacion}${contexto ? `\n\nContexto local:\n${contexto}` : ''}`

    const run = completion({
      modelId: this.modeloId,
      history: [
        { role: 'system', content: PROMPT_SISTEMA },
        { role: 'user', content: payload }
      ]
    })

    let textoRespuesta = ''
    for await (const event of run.events) {
      if (event.type === 'contentDelta') {
        textoRespuesta += event.text
      }
    }

    const resultado = this._parsearRespuesta(textoRespuesta, textoObservacion)

    const contextoLocalDetectado = contextoAgricolaSeguro || buscarContextoAgricola({ texto: textoObservacion })
    const resultadoEnriquecido = this._aplicarContextoLocal(resultado, textoObservacion, contextoLocalDetectado)

    const coincidenciaCultivo = textoObservacion.match(/^Cultivo:\s*(.+)$/m)
    if (coincidenciaCultivo && coincidenciaCultivo[1].trim()) {
      resultadoEnriquecido.cultivo = coincidenciaCultivo[1].trim()
    }

    return resultadoEnriquecido
  }

  _guardarImagenBase64(imagenBase64) {
    const sinPrefijo = String(imagenBase64 || '').startsWith('data:')
      ? String(imagenBase64).split(',')[1]
      : String(imagenBase64)
    const buffer = Buffer.from(sinPrefijo, 'base64')
    const extMatch = /^data:image\/([a-zA-Z0-9.+-]+);base64,/.exec(String(imagenBase64))
    const extension = extMatch ? extMatch[1].replace('jpeg', 'jpg') : 'jpg'
    const tmpDir = path.join(os.tmpdir(), 'fitoai-imagenes')
    fs.mkdirSync(tmpDir, { recursive: true })
    const ruta = path.join(tmpDir, `imagen_${crypto.randomBytes(8).toString('hex')}.${extension}`)
    fs.writeFileSync(ruta, buffer)
    return ruta
  }

  _armarContextoAgricola(contextoAgricola) {
    if (!contextoAgricola || !contextoAgricola.nombre) {
      return ''
    }

    const sintomas = (contextoAgricola.sintomasComunes || []).slice(0, 5).join(', ')
    const causas = (contextoAgricola.posiblesCausas || []).slice(0, 5).join(', ')
    const pasos = (contextoAgricola.recomendaciones || []).slice(0, 5).join('; ')
    const preguntas = (contextoAgricola.preguntas || []).slice(0, 3).join('; ')

    return `Cultivo local de referencia: ${contextoAgricola.nombre}. Síntomas comunes: ${sintomas}. Posibles causas básicas: ${causas}. Recomendaciones generales: ${pasos}. Preguntas útiles: ${preguntas}.`
  }

  _crearResultadoBase() {
    return {
      cultivo: 'No identificado',
      sintomas: ['No se pudo procesar la respuesta del modelo'],
      posiblesCausas: ['Posible causa no confirmada; necesita más información del cultivo y del entorno'],
      nivelCertidumbre: 'bajo',
      proximosPasos: ['Inspecciona la planta en detalle y compara con la evolución reciente'],
      informacionFaltante: ['Tipo de cultivo', 'Tiempo de evolución de los síntomas', 'Condiciones de riego y humedad'],
      descargoResponsabilidad: 'FITOAI proporciona orientación basada en la información disponible y no sustituye la evaluación de un especialista agrícola.',
      posibles_causas: ['Posible causa no confirmada; necesita más información del cultivo y del entorno'],
      nivel_certidumbre: 'bajo',
      proximos_pasos: ['Inspecciona la planta en detalle y compara con la evolución reciente'],
      informacion_faltante: ['Tipo de cultivo', 'Tiempo de evolución de los síntomas', 'Condiciones de riego y humedad'],
      descargo_responsabilidad: 'FITOAI proporciona orientación basada en la información disponible y no sustituye la evaluación de un especialista agrícola.'
    }
  }

  _aplicarContextoLocal(resultado, textoObservacion, contextoLocal) {
    const base = { ...this._crearResultadoBase(), ...resultado }

    if (!textoObservacion || typeof textoObservacion !== 'string') {
      return base
    }

    const contexto = contextoLocal || buscarContextoAgricola({ texto: textoObservacion })

    if (contexto) {
      base.cultivo = contexto.nombre
      if (!Array.isArray(base.sintomas) || base.sintomas.length === 0 || base.sintomas.every((item) => !String(item).trim())) {
        base.sintomas = contexto.sintomasComunes || []
      }
      if (!Array.isArray(base.posiblesCausas) || base.posiblesCausas.length === 0) {
        base.posiblesCausas = contexto.posiblesCausas || []
      }
      if (!Array.isArray(base.proximosPasos) || base.proximosPasos.length === 0) {
        base.proximosPasos = contexto.recomendaciones || []
      }
      if (!Array.isArray(base.informacionFaltante) || base.informacionFaltante.length === 0) {
        base.informacionFaltante = contexto.informacionFaltante || []
      }
      if (base.nivelCertidumbre === 'bajo') {
        base.nivelCertidumbre = 'medio'
      }
    }

    if (!Array.isArray(base.posiblesCausas) || base.posiblesCausas.length === 0) {
      base.posiblesCausas = ['Posible causa no confirmada; necesita más información del cultivo y del entorno']
    }
    if (!Array.isArray(base.proximosPasos) || base.proximosPasos.length === 0) {
      base.proximosPasos = ['Inspecciona la planta en detalle y compara con la evolución reciente']
    }
    if (!Array.isArray(base.informacionFaltante) || base.informacionFaltante.length === 0) {
      base.informacionFaltante = ['Tipo de cultivo', 'Tiempo de evolución de los síntomas', 'Condiciones de riego y humedad']
    }

    return {
      ...base,
      posibles_causas: base.posiblesCausas,
      nivel_certidumbre: base.nivelCertidumbre,
      proximos_pasos: base.proximosPasos,
      informacion_faltante: base.informacionFaltante,
      descargo_responsabilidad: base.descargoResponsabilidad
    }
  }

  _parsearRespuesta(texto, textoObservacion = '') {
    if (!texto || typeof texto !== 'string') {
      return this._aplicarContextoLocal(this._crearResultadoBase(), textoObservacion, buscarContextoAgricola({ texto: textoObservacion }))
    }

    const match = texto.match(/\{[\s\S]*\}/)
    if (!match) {
      return this._aplicarContextoLocal(this._crearResultadoBase(), textoObservacion, buscarContextoAgricola({ texto: textoObservacion }))
    }

    try {
      const data = JSON.parse(match[0])
      const limpiar = (lista) => (Array.isArray(lista) ? lista : []).filter(
        (item) => typeof item === 'string' && !TERMINOS_PROHIBIDOS.test(item)
      )

      const nivelCertidumbre = ['bajo', 'medio', 'alto'].includes(data.nivel_certidumbre ?? data.nivelCertidumbre)
        ? (data.nivel_certidumbre ?? data.nivelCertidumbre)
        : 'bajo'

      const posiblesCausas = limpiar(data.posibles_causas ?? data.posiblesCausas)
      const proximosPasos = limpiar(data.proximos_pasos ?? data.proximosPasos)
      const sintomas = limpiar(data.sintomas)
      const informacionFaltante = limpiar(data.informacion_faltante ?? data.informacionFaltante)

      const respuesta = {
        cultivo: data.cultivo || 'No identificado',
        sintomas: sintomas.length > 0 ? sintomas : ['No se pudo interpretar la respuesta del modelo'],
        posiblesCausas: posiblesCausas.length > 0 ? posiblesCausas : ['Posible causa no confirmada; necesita más información del cultivo y del entorno'],
        nivelCertidumbre,
        proximosPasos: proximosPasos.length > 0 ? proximosPasos : ['Inspecciona la planta en detalle y compara con la evolución reciente'],
        informacionFaltante: informacionFaltante.length > 0 ? informacionFaltante : ['Tipo de cultivo', 'Tiempo de evolución de los síntomas', 'Condiciones de riego y humedad'],
        descargoResponsabilidad: 'FITOAI proporciona orientación basada en la información disponible y no sustituye la evaluación de un especialista agrícola.'
      }

      return this._aplicarContextoLocal({
        ...respuesta,
        posibles_causas: respuesta.posiblesCausas,
        nivel_certidumbre: respuesta.nivelCertidumbre,
        proximos_pasos: respuesta.proximosPasos,
        informacion_faltante: respuesta.informacionFaltante,
        descargo_responsabilidad: respuesta.descargoResponsabilidad
      }, textoObservacion, buscarContextoAgricola({ texto: textoObservacion }))
    } catch {
      return this._aplicarContextoLocal(this._crearResultadoBase(), textoObservacion, buscarContextoAgricola({ texto: textoObservacion }))
    }
  }
}

module.exports = { MotorQvac }