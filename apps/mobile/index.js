// Punto de entrada explícito.
//
// Con `main: "expo-router/entry"` el bundler de release calcula la ruta del
// entry relativa a la raíz del monorepo y genera un `../` de más, fallando con
// "Unable to resolve module ./../../node_modules/expo-router/entry.js".
// Un fichero local dentro de apps/mobile resuelve siempre bien, en desarrollo
// y en release.
import 'expo-router/entry';
