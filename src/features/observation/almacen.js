const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const DIR_DATOS = path.join(__dirname, '..', '..', '..', 'data')
const ARCHIVO_OBSERVACIONES = path.join(DIR_DATOS, 'observaciones.json')

function garantizarDirectorio() {
  fs.mkdirSync(DIR_DATOS, { recursive: true })
}

function limpiarRegistro(obs) {
  const registro = {
    id: obs.id || crypto.randomBytes(4).toString('hex'),
    fecha: obs.fecha || new Date().toISOString(),
    textoOriginal: obs.textoOriginal || '',
    cultivo: obs.cultivo || '',
    observacion: obs.textoOriginal || obs.observacion || '',
    analisis: obs.analisis || {
      cultivo: obs.cultivo || 'No identificado',
      sintomas: [],
      posiblesCausas: [],
      nivelCertidumbre: 'bajo',
      proximosPasos: [],
      informacionFaltante: [],
      descargoResponsabilidad: 'FITOAI proporciona orientación basada en la información disponible y no sustituye a un especialista agrícola.'
    },
    createdAt: obs.createdAt || new Date().toISOString(),
    updatedAt: obs.updatedAt || new Date().toISOString(),
    metadata: obs.metadata || {}
  }

  if (!registro.textoOriginal && registro.observacion) {
    registro.textoOriginal = registro.observacion
  }

  return registro
}

function guardarObservacion(obs) {
  garantizarDirectorio()
  const observaciones = cargarTodas()
  const registro = limpiarRegistro(obs)
  observaciones.push(registro)
  fs.writeFileSync(ARCHIVO_OBSERVACIONES, JSON.stringify(observaciones, null, 2), 'utf-8')
  return registro
}

function cargarTodas() {
  garantizarDirectorio()
  if (!fs.existsSync(ARCHIVO_OBSERVACIONES)) {
    return []
  }
  try {
    const datos = JSON.parse(fs.readFileSync(ARCHIVO_OBSERVACIONES, 'utf-8'))
    return Array.isArray(datos) ? datos.map(limpiarRegistro) : []
  } catch {
    return []
  }
}

function cargarPorId(id) {
  return cargarTodas().find((obs) => obs.id === id) || null
}

function eliminarPorId(id) {
  garantizarDirectorio()
  const observaciones = cargarTodas().filter((obs) => obs.id !== id)
  fs.writeFileSync(ARCHIVO_OBSERVACIONES, JSON.stringify(observaciones, null, 2), 'utf-8')
  return observaciones
}

function eliminarTodas() {
  garantizarDirectorio()
  fs.writeFileSync(ARCHIVO_OBSERVACIONES, '[]', 'utf-8')
  return []
}

module.exports = { guardarObservacion, cargarTodas, cargarPorId, eliminarPorId, eliminarTodas, ARCHIVO_OBSERVACIONES }