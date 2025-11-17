import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		proxy: {
			// Proxy API calls to backend so that cookies and auth share the same origin in dev.
			'/api': {
				target: 'http://localhost:5261',
				changeOrigin: true,
				secure: false
			}
		}
	}
});
