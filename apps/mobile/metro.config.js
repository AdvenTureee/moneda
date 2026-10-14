/**
 * Metro config — Expo SDK 53.
 *
 * Os aliases `@moneda/shared` e `@moneda/ui-tokens` são resolvidos pelo
 * `babel-plugin-module-resolver` em `babel.config.js` (em tempo de build).
 * O Metro recebe imports já traduzidos, sem precisar interceptar nada.
 *
 * Por isso mantemos o `metro.config.js` mínimo: sem `resolveRequest` custom,
 * sem `watchFolders` na raiz do monorepo. O resultado é a menor chance de
 * "Switching to --dev-client" indevido.
 */
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Habilita o resolver moderno de exports (imports condicionais).
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
