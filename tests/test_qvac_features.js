const assert = require('assert')
const { MotorQvac } = require('../src/core/inference/motorQvac')

async function main() {
  const motor = new MotorQvac()

  assert.strictEqual(typeof motor.inicializar, 'function')
  assert.strictEqual(typeof motor.analizarAudio, 'function')
  assert.strictEqual(typeof motor.analizarImagen, 'function')
  assert.strictEqual(typeof motor.hablarTexto, 'function')

  console.log('▸ Prueba de capacidades QVAC lista.')
}

main().catch((error) => {
  console.error('✖ Error:', error)
  process.exit(1)
})
