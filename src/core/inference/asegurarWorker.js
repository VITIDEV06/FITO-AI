const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

const DIR_INSTALACION_LIMPIA = path.join(os.homedir(), '.agrosense', 'qvac')
const RUTA_WORKER_RELATIVA = path.join('node_modules', '@qvac', 'sdk', 'dist', 'src', 'worker', 'index.js')
const CARACTERES_QUE_ROMAN = /[#%?]/

// Mantener el worker QVAC fuera del árbol del proyecto para evitar problemas con rutas especiales como "RETO # 3".

function rutaSdkPropia() {
  try {
    return path.dirname(require.resolve('@qvac/sdk/package'))
  } catch {
    return process.cwd()
  }
}

function rutaPropiaRompeWorker() {
  return CARACTERES_QUE_ROMAN.test(rutaSdkPropia())
}

function provisionarWorkerLimpio() {
  const rutaWorker = path.join(DIR_INSTALACION_LIMPIA, RUTA_WORKER_RELATIVA)
  if (fs.existsSync(rutaWorker)) {
    return rutaWorker
  }

  console.log('▸ Instalando worker QVAC limpio (primera vez; necesita Internet y puede tardar unos minutos)...')
  fs.mkdirSync(DIR_INSTALACION_LIMPIA, { recursive: true })
  const res = spawnSync(
    'npm',
    ['install', '@qvac/sdk', '--no-audit', '--no-fund', '--loglevel=error'],
    { cwd: DIR_INSTALACION_LIMPIA, stdio: 'inherit', shell: true }
  )

  if (res.status !== 0 || !fs.existsSync(rutaWorker)) {
    throw new Error(
      `No se pudo instalar el worker QVAC limpio en ${DIR_INSTALACION_LIMPIA}.` +
        ' Revise la conexión a Internet o instale manualmente: cd "' +
        DIR_INSTALACION_LIMPIA
    )
  }
  console.log(`▸ Worker QVAC limpio instalado en: ${DIR_INSTALACION_LIMPIA}`)
  return rutaWorker
}

function asegurarWorker() {
  if (!rutaPropiaRompeWorker()) {
    return
  }
  const rutaWorker = provisionarWorkerLimpio()
  process.env.QVAC_WORKER_PATH = rutaWorker
  console.log(`▸ La ruta del proyecto contiene caracteres especiales; usando worker QVAC limpio: ${rutaWorker}`)
}

module.exports = { asegurarWorker, DIR_INSTALACION_LIMPIA, RUTA_WORKER_RELATIVA }