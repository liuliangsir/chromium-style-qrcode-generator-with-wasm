import { defineConfig } from 'vite';

import { BASE } from './vite.constant';
import { isProd } from './vite.helper';

// https://vitejs.dev/config/
export default ({ mode }) =>
  defineConfig({ ...(isProd(mode) ? { base: BASE } : null) });
