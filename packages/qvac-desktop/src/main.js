const { MotorQvac } = require('./core/inference/motorQvac')
const { crearServidor } = require('./ui/servidor')
const almacen = require('./features/observation/almacen')

const HOST = process.env.HOST || '127.0.0.1'
const PORT = parseInt(process.env.PORT || '3000', 10)

let servidor = null
let motor = null

async function iniciar() {
  motor = new MotorQvac()
  await motor.inicializar()

  servidor = crearServidor(motor, almacen)

  servidor.listen(PORT, HOST, () => {
    console.log(`▸ FITOAI listo en http://${HOST}:${PORT}`)
  })
}

function apagar() {
  console.log('\n▸ Apagando FITOAI...')
  if (servidor) servidor.close()
  if (motor) motor.cerrar().then(() => process.exit(0)).catch(() => process.exit(0))
  else process.exit(0)
}

process.on('SIGINT', apagar)
process.on('SIGTERM', apagar)

iniciar().catch((error) => {
  console.error('✖ Error al iniciar FITOAI:', error)
  process.exit(1)
})
