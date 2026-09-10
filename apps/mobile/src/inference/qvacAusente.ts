/**
 * Sustituto de @qvac/sdk cuando el paquete NO está instalado.
 *
 * Metro exige que los especificadores de `import()` sean literales, así que no
 * se puede ocultar un paquete opcional construyendo su nombre en tiempo de
 * ejecución. En su lugar, `metro.config.js` redirige `@qvac/sdk` a este módulo
 * cuando no se puede resolver, y `qvacSdk.ts` detecta el centinela.
 *
 * Resultado: la app compila y funciona en Nivel 0 sin QVAC instalado, y usa el
 * SDK real en cuanto se ejecuta `npm run qvac:install`.
 */
export const QVAC_NO_DISPONIBLE = true;

export default { QVAC_NO_DISPONIBLE };
