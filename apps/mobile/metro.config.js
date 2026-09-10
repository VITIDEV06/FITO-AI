const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const raizWorkspace = path.resolve(__dirname, '..', '..');

/**
 * Dependencias opcionales pesadas.
 *
 * @qvac/sdk arrastra más de 1,5 GB de addons nativos y la app funciona sin él
 * en Nivel 0, así que no está en `dependencies`. Metro, sin embargo, resuelve
 * los imports en tiempo de compilación y fallaría el bundle por un paquete
 * ausente.
 *
 * Aquí se resuelve a un stub cuando no está instalado. El import en
 * `qvacSdk.ts` puede así ser un literal —lo único que Metro acepta— y la app
 * detecta en runtime si tiene el SDK real o el sustituto.
 */
const OPCIONALES = new Map([
  ['@qvac/sdk', path.resolve(__dirname, 'src/inference/qvacAusente.ts')],
]);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const sustituto = OPCIONALES.get(moduleName);

  if (sustituto) {
    try {
      require.resolve(moduleName, { paths: [__dirname, raizWorkspace] });
    } catch {
      return { type: 'sourceFile', filePath: sustituto };
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
