const crypto = require('crypto')

const DESCARGO = 'Este es un análisis asistido por IA, no un diagnóstico definitivo. Consulte a un profesional agrícola para orientación específica.'

function crearAnalisis({ cultivo, sintomas, posiblesCausas, nivelCertidumbre, proximosPasos, informacionFaltante }) {
  if (!['bajo', 'medio', 'alto'].includes(nivelCertidumbre)) {
    nivelCertidumbre = 'bajo'
  }
  return {
    cultivo: cultivo || 'No identificado',
    sintomas: Array.isArray(sintomas) ? sintomas : [],
    posiblesCausas: Array.isArray(posiblesCausas) ? posiblesCausas : [],
    nivelCertidumbre,
    proximosPasos: Array.isArray(proximosPasos) ? proximosPasos : [],
    informacionFaltante: Array.isArray(informacionFaltante) ? informacionFaltante : [],
    descargoResponsabilidad: DESCARGO
  }
}

function crearObservacion({ textoOriginal, cultivo = '', ubicacion = '', notas = '', etiquetas = [], analisis = null }) {
  return {
    id: crypto.randomBytes(4).toString('hex'),
    fecha: new Date().toISOString(),
    textoOriginal,
    cultivo,
    ubicacion,
    notas,
    etiquetas,
    analisis
  }
}

module.exports = { crearAnalisis, crearObservacion, DESCARGO }