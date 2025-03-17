//
// The ecosystem.config.js file is used by PM2 to define the deployment settings for your application. 
// When deploying to AWS, the file is configured to set the NODE_ENV variable to 'production', ensuring 
// the application runs in production mode. For local development, the ecosystem.config.js file is not 
// used, and the NODE_ENV variable can be set to 'development' using other methods like .env files or 
// VS Code launch configurations, allowing the application to run in development mode on localhost.
//

module.exports = {
    apps: [
      {
        name: 'satoshi-server',
        script: '3016-satoshi-server.ts',
        env: {
          NODE_ENV: 'production',
        },
      },
    ],
  };