const { MotorQvac } = require('../src/core/inference/motorQvac')

async function main() {
  const motor = new MotorQvac()
  console.log('▸ Inicializando QVAC...')
  await motor.inicializar()
  console.log(`▸ Modelo cargado, listo: ${motor.listo}`)

  const casos = [
    'Las hojas de mis tomates están amarillas y algunas tienen manchas.',
    'Las hojas de mis plantas están caídas desde hace tres días.',
    'Las hojas tienen pequeños agujeros y he visto insectos cerca.'
  ]

  for (const caso of casos) {
    console.log(`\n▸ Analizando: "${caso}"`)
    const resultado = await motor.analizar(caso)
    console.log('  Cultivo:', resultado.cultivo)
    console.log('  Síntomas:', JSON.stringify(resultado.sintomas))
    console.log('  Posibles causas:', JSON.stringify(resultado.posiblesCausas))
    console.log('  Certidumbre:', resultado.nivelCertidumbre)
    console.log('  Próximos pasos:', JSON.stringify(resultado.proximosPasos))
    console.log('  Info faltante:', JSON.stringify(resultado.informacionFaltante))

    if (!resultado.descargoResponsabilidad || typeof resultado.descargoResponsabilidad !== 'string') {
      throw new Error(`Falta descargoResponsabilidad en el resultado de: ${caso}`)
    }
    if (!Array.isArray(resultado.sintomas) || !resultado.sintomas.length) {
      throw new Error(`Faltan sintomas para: ${caso}`)
    }
    if (!Array.isArray(resultado.posiblesCausas) || !resultado.posiblesCausas.length) {
      throw new Error(`Faltan posiblesCausas para: ${caso}`)
    }
  }

  await motor.cerrar()
  console.log('\n▸ Prueba completada.')
}

main().catch((error) => {
  console.error('✖ Error:', error)
  process.exit(1)
})