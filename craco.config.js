const { whenDev } = require('@craco/craco');

module.exports = {
	webpack: {
		configure: (webpackConfig) => {
			return webpackConfig;
		},
	},
	devServer: (devServerConfig) => {
		// Migrate deprecated hooks to setupMiddlewares if present
		const originalOnBefore = devServerConfig.onBeforeSetupMiddleware;
		const originalOnAfter = devServerConfig.onAfterSetupMiddleware;
		delete devServerConfig.onBeforeSetupMiddleware;
		delete devServerConfig.onAfterSetupMiddleware;

		devServerConfig.setupMiddlewares = (middlewares, devServer) => {
			if (typeof originalOnBefore === 'function') {
				originalOnBefore(devServer);
			}
			if (typeof originalOnAfter === 'function') {
				originalOnAfter(devServer);
			}
			return middlewares;
		};
		return devServerConfig;
	},
};