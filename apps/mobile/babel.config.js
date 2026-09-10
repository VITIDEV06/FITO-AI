/**
 * Configuración de Babel para la app móvil.
 *
 * `babel-preset-expo` aporta las transformaciones que necesitan Expo Router y
 * React Native. El plugin de `react-native-worklets` lo exige Reanimated 4 y
 * DEBE ir el último de la lista: si no, las worklets no se compilan y la app
 * arranca en blanco sin lanzar ningún error.
 */
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
