import { sveltekit } from '@sveltejs/kit/vite';
import { loadEnv, defineConfig } from 'vite';
import dotenvExpand from 'dotenv-expand';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
	if (mode === 'development') {
		const env = loadEnv(mode, process.cwd(), '');
		dotenvExpand.expand({ parsed: env });
	}

	return {
		plugins: [tailwindcss(), sveltekit()]
	};
});
