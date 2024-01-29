const path = require('path');
const { babel } = require('@rollup/plugin-babel');
const postcss = require('rollup-plugin-postcss')
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const replace = require('@rollup/plugin-replace');
const copy = require('rollup-plugin-copy');
const image = require('@rollup/plugin-image');
const typescript = require('@rollup/plugin-typescript');
const resolveFile = function(filePath) {
  return path.join(__dirname, '..', filePath)
}

const babelOptions = {
  "presets": [
    '@babel/preset-env',
    '@babel/preset-react',
    
  ],
  exclude: 'node_modules/**',
  babelHelpers: 'bundled'
}

module.exports = [
  {
    input: resolveFile('src/main.js'),
    output: {
      file: resolveFile('docs/index.js'),
      format: 'umd',
    },
    // external: ['react-native'],
    plugins: [
      copy({
        targets: [
          { src: resolveFile('public/**/*'), dest: resolveFile('docs') }
        ]
      }),
      image(),
      postcss(),
      nodeResolve(),
      commonjs({
        exclude: 'src/**'
      }),
      // typescript(),
      babel(babelOptions),
      replace({
        'process.env.NODE_ENV': JSON.stringify( 'production' )
      })
    ],
  },
]