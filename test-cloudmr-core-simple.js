// Simple test for cloudmr-core configuration (Node.js compatible)
console.log('Testing cloudmr-core configuration...');

try {
  // Test basic imports
  const { 
    initializeCloudMRCore, 
    createEndpoints 
  } = require('cloudmr-core/dist/config/AppConfig');
  
  console.log('✅ Successfully imported configuration functions');

  // Test endpoint creation
  const baseServer = 'https://7gbqt0rf0l.execute-api.us-east-1.amazonaws.com/Prod/api';
  const endpoints = createEndpoints(baseServer);
  
  console.log('✅ Created endpoints:', {
    SIGNIN: endpoints.SIGNIN,
    REFRESH_TOKEN: endpoints.REFRESH_TOKEN,
    PROFILE: endpoints.PROFILE
  });

  // Test configuration
  const mrOptimumConfig = {
    APP_NAME: 'MR Optimum',
    CLOUDMR_SERVER: baseServer,
    API_TOKEN: 'test-token'
  };

  initializeCloudMRCore({
    appConfig: mrOptimumConfig,
    endpoints: endpoints
  });

  console.log('✅ Successfully initialized cloudmr-core');
  console.log('\n🎉 Configuration test passed! Ready for React integration');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Stack:', error.stack);
}