module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Em monorepo, expomos `@moneda/shared` e `@moneda/ui-tokens` direto
      // a partir dos packages locais. Sem isso, Metro proíbe imports que
      // saem do projectRoot (apps/mobile) e o bundle falha com
      // "Unable to resolve ../../packages/...".
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@moneda/shared': '../../packages/shared/src/index.ts',
            '@moneda/ui-tokens': '../../packages/ui-tokens/src/index.ts',
          },
        },
      ],
      // Reanimated 4 separou worklets em pacote próprio. O plugin de
      // transform do worklets deve vir antes do plugin do reanimated e
      // ANTES do reanimated. Conforme docs do Reanimated 4.
      'react-native-worklets/plugin',
    ],
  };
};
