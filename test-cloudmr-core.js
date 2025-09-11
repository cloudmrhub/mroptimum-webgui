// Test script to verify cloudmr-core integration with MROptimum
const { 
  initializeCloudMRCore, 
  createEndpoints,
  getAppConfig 
} = require('cloudmr-core');

console.log('Testing cloudmr-core integration...');

try {
  // Configure for MROptimum
  const mrOptimumConfig = {
    APP_NAME: 'MR Optimum',
    CLOUDMR_SERVER: 'https://7gbqt0rf0l.execute-api.us-east-1.amazonaws.com/Prod/api',
    API_TOKEN: 'iwAFDjSeeh9MvhpA7wCT92uztNtPV7NJ6Wwrnd9v',
    REQUESTS_TIMEOUT: 5000,
    FILE_CHUNK_SIZE: 10 * 1024 * 1024
  };

  const endpoints = createEndpoints(mrOptimumConfig.CLOUDMR_SERVER);
  
  console.log('✅ Successfully imported cloudmr-core');
  console.log('✅ Created endpoints configuration');
  console.log('Endpoints:', {
    SIGNIN: endpoints.SIGNIN,
    REFRESH_TOKEN: endpoints.REFRESH_TOKEN,
    PROFILE: endpoints.PROFILE,
    DATA_API: endpoints.DATA_API
  });

  // Initialize the core
  initializeCloudMRCore({
    appConfig: mrOptimumConfig,
    endpoints: endpoints
  });

  console.log('✅ Successfully initialized cloudmr-core');
  
  // Test getting configuration
  const config = getAppConfig();
  console.log('✅ Retrieved app config:', config.APP_NAME);
  
  console.log('\n🎉 All tests passed! cloudmr-core is working in MROptimum');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}