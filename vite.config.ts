import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Map CRA envs (REACT_APP_*) to Vite import.meta.env and expose PUBLIC_URL behavior
export default defineConfig(({ mode }) => {
	const env = { ...(process.env as Record<string, string>), ...loadEnv(mode, process.cwd(), '') } as Record<string, string>;

	// Build define replacements for CRA-style envs
	const define: Record<string, string> = {
		'process.env.NODE_ENV': JSON.stringify(mode),
		'process.env.PUBLIC_URL': JSON.stringify(env.PUBLIC_URL || ''),
	};
	Object.keys(env)
		.filter((k) => k.startsWith('REACT_APP_'))
		.forEach((k) => {
			define[`process.env.${k}`] = JSON.stringify(env[k]);
		});

	return {
		plugins: [
			// Pre-transform JSX inside .js files so Vite's define step can parse them
			{
				name: 'jsx-in-js-loader',
				enforce: 'pre',
				async transform(code, id) {
					if (!id.endsWith('.js')) return null;
					if (id.includes('/node_modules/')) return null;
					if (!id.includes('/src/')) return null;
					const esbuild = await import('esbuild');
					const result = await esbuild.transform(code, {
						loader: 'jsx',
						jsx: 'automatic',
						sourcemap: false,
					});
					return { code: result.code, map: null };
				},
			},
			react({ jsxRuntime: 'automatic', include: [/\.jsx?$/, /\.tsx?$/] }),
		],
		root: '.',
		publicDir: 'public',
		envPrefix: ['VITE_', 'REACT_APP_', 'PUBLIC_'],
		resolve: {
			alias: [
				{ find: './aws-exports', replacement: '/src/aws-exports.js' },
				{ find: 'aws-exports', replacement: '/src/aws-exports.js' },
			],
		},
		server: {
			port: 3000,
			strictPort: false,
			open: false,
		},
		preview: {
			port: 3000,
		},
		build: {
			outDir: 'build',
			sourcemap: false,
			emptyOutDir: true,
		},
		esbuild: { jsx: 'automatic' },
		define,
	};
});