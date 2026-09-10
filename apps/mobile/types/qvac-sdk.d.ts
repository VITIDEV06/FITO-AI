/**
 * Declaración ambiente de @qvac/sdk.
 *
 * El paquete es una dependencia OPCIONAL: no está en `dependencies` porque
 * arrastra más de 1,5 GB de addons nativos y la app funciona sin él en Nivel 0.
 * Sin esta declaración, `tsc` fallaría con TS2307 en el import de qvacSdk.ts.
 *
 * En runtime, metro.config.js redirige el módulo a src/inference/qvacAusente.ts
 * cuando no está instalado, y qvacSdk.ts detecta el centinela.
 *
 * El tipado real y útil vive en `SdkQvac` (src/inference/qvacSdk.ts); aquí sólo
 * se declara la forma mínima para que el import compile con y sin el paquete.
 */
declare module '@qvac/sdk' {
  /** Sólo lo define el stub. Su presencia significa "SDK no instalado". */
  export const QVAC_NO_DISPONIBLE: true | undefined;

  const sdk: Record<string, unknown> & { default?: Record<string, unknown> };
  export default sdk;
}
