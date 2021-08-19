/**
 * Copyright 2021 Marius Wilms, Christoph Labacher. All rights reserved.
 *
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

const { pnpPlugin } = require('@yarnpkg/esbuild-plugin-pnp');
const esbuild = require('esbuild'); // eslint-disable-line import/no-self-import

let bundle = {
  entryPoints: ['src/index.js'],
  bundle: true,
  sourcemap: true,
  format: 'esm',
  target: ['es2020'],
  minify: process.env.MINIFY === 'y',
  plugins: [pnpPlugin()],
  watch: process.env.WATCH === 'y',
  outfile: 'build/index.js',
};

esbuild.build(bundle).catch(() => process.exit(1));
