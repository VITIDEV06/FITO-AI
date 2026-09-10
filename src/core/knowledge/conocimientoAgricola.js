const fs = require('fs')
const path = require('path')

const RUTA_CONOCIMIENTO = path.join(__dirname, '..', '..', '..', 'data', 'conocimiento_agricola.json')

function cargarConocimiento() {
  try {
    if (!fs.existsSync(RUTA_CONOCIMIENTO)) {
      return { cultivos: [] }
    }
    const contenido = fs.readFileSync(RUTA_CONOCIMIENTO, 'utf-8')
    return JSON.parse(contenido)
  } catch (error) {
    console.warn('No se pudo cargar la base de conocimiento local:', error.message)
    return { cultivos: [] }
  }
}

function normalizarTexto(texto = '') {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function buscarPorCultivoNombre(nombre) {
  const datos = cargarConocimiento()
  if (!datos.cultivos || !datos.cultivos.length) {
    return null
  }

  const nombreNormalizado = normalizarTexto(nombre)
  return datos.cultivos.find((cultivo) => {
    const claves = [cultivo.nombre, cultivo.aliases || []].flat().map(normalizarTexto)
    return claves.includes(nombreNormalizado)
  }) || null
}

function buscarContextoAgricola({ texto, cultivo }) {
  const nombreCultivo = cultivo || ''
  const textoNormalizado = normalizarTexto(texto)
  const cultivoBase = buscarPorCultivoNombre(nombreCultivo)

  if (!cultivoBase) {
    const datos = cargarConocimiento()
    const cultivoCoincidente = datos.cultivos.find((cultivo) => {
      const textoCultivo = normalizarTexto(cultivo.nombre)
      return textoNormalizado.includes(textoCultivo)
    })
    if (cultivoCoincidente) {
      return cultivoCoincidente
    }

    return null
  }

  return cultivoBase
}

function buscarSugerencias(texto, cultivo) {
  const contexto = buscarContextoAgricola({ texto, cultivo })
  if (!contexto) {
    return {
      cultivo: 'No identificado',
      sintomas: ['Revisa la apariencia general de la planta y registra cambios recientes'],
      posiblesCausas: ['Falta de información del cultivo y del entorno'],
      recomendaciones: ['Describe la parte afectada de la planta', 'Indica si la humedad o el suelo han cambiado recientemente'],
      preguntas: ['¿Qué cultivo es?', '¿Cuánto tiempo llevan los síntomas?', '¿Hay cambios recientes en riego o fertilización?'],
      informacionFaltante: ['Tipo de cultivo', 'Tiempo de evolución de los síntomas', 'Condiciones de riego y luz']
    }
  }

  return {
    cultivo: contexto.nombre,
    sintomas: contexto.sintomasComunes || [],
    posiblesCausas: contexto.posiblesCausas || [],
    recomendaciones: contexto.recomendaciones || [],
    preguntas: contexto.preguntas || [],
    informacionFaltante: contexto.informacionFaltante || []
  }
}

module.exports = {
  cargarConocimiento,
  buscarContextoAgricola,
  buscarSugerencias,
  buscarPorCultivoNombre,
  RUTA_CONOCIMIENTO
}
