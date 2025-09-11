import React, { useEffect } from 'react';
import { 
  initializeCloudMRCore, 
  createEndpoints,
  getAppConfig,
  getEndpoints,
  setInitialTokens 
} from 'cloudmr-core';

interface TestResults {
  configTest: boolean;
  endpointsTest: boolean;
  initTest: boolean;
}

const TestCloudMRCore: React.FC = () => {
  const [results, setResults] = React.useState<TestResults>({
    configTest: false,
    endpointsTest: false,
    initTest: false
  });

  const [logs, setLogs] = React.useState<string[]>([]);

  const addLog = (message: string, isError: boolean = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${isError ? '❌' : '✅'} ${message}`;
    setLogs(prev => [...prev, logMessage]);
  };

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    try {
      addLog('Starting cloudmr-core integration tests...');

      // Test 1: Configuration
      try {
        const mrOptimumConfig = {
          APP_NAME: 'MR Optimum',
          CLOUDMR_SERVER: 'https://7gbqt0rf0l.execute-api.us-east-1.amazonaws.com/Prod/api',
          API_TOKEN: 'iwAFDjSeeh9MvhpA7wCT92uztNtPV7NJ6Wwrnd9v',
          REQUESTS_TIMEOUT: 5000,
          FILE_CHUNK_SIZE: 10 * 1024 * 1024
        };

        const endpoints = createEndpoints(mrOptimumConfig.CLOUDMR_SERVER);
        addLog('Created endpoints configuration');
        
        setResults(prev => ({ ...prev, configTest: true }));
        addLog('Configuration test passed');

        // Test 2: Endpoints
        if (endpoints.SIGNIN && endpoints.REFRESH_TOKEN && endpoints.PROFILE) {
          setResults(prev => ({ ...prev, endpointsTest: true }));
          addLog('Endpoints test passed');
          addLog(`SIGNIN: ${endpoints.SIGNIN}`);
          addLog(`REFRESH_TOKEN: ${endpoints.REFRESH_TOKEN}`);
        }

        // Test 3: Initialization
        initializeCloudMRCore({
          appConfig: mrOptimumConfig,
          endpoints: endpoints
        });

        // Verify we can retrieve config
        const retrievedConfig = getAppConfig();
        const retrievedEndpoints = getEndpoints();

        if (retrievedConfig.APP_NAME === 'MR Optimum' && retrievedEndpoints.SIGNIN) {
          setResults(prev => ({ ...prev, initTest: true }));
          addLog('Initialization test passed');
          addLog(`Retrieved app name: ${retrievedConfig.APP_NAME}`);
        }

        addLog('🎉 All tests passed! cloudmr-core is working in MROptimum');

      } catch (error: any) {
        addLog(`Configuration error: ${error.message}`, true);
      }

    } catch (error: any) {
      addLog(`Integration test failed: ${error.message}`, true);
    }
  };

  const allTestsPassed = results.configTest && results.endpointsTest && results.initTest;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>CloudMR Core Integration Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Test Results:</h3>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ color: results.configTest ? 'green' : 'red' }}>
            Configuration: {results.configTest ? '✅ PASS' : '❌ FAIL'}
          </div>
          <div style={{ color: results.endpointsTest ? 'green' : 'red' }}>
            Endpoints: {results.endpointsTest ? '✅ PASS' : '❌ FAIL'}
          </div>
          <div style={{ color: results.initTest ? 'green' : 'red' }}>
            Initialization: {results.initTest ? '✅ PASS' : '❌ FAIL'}
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: allTestsPassed ? '#d4edda' : '#f8d7da',
        border: `1px solid ${allTestsPassed ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '5px'
      }}>
        <strong>
          {allTestsPassed 
            ? '🎉 Integration Success! cloudmr-core is ready to use in MROptimum' 
            : '⚠️  Some tests failed. Check logs below.'}
        </strong>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Test Log:</h3>
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '10px', 
          borderRadius: '5px',
          maxHeight: '300px',
          overflow: 'auto',
          fontSize: '12px'
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ 
              marginBottom: '2px',
              color: log.includes('❌') ? 'red' : 'green'
            }}>
              {log}
            </div>
          ))}
        </div>
      </div>

      {allTestsPassed && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '5px' }}>
          <h4>Next Steps:</h4>
          <ul>
            <li>Replace MROptimum's authentication slice with cloudmr-core imports</li>
            <li>Update components to use shared authentication actions</li>
            <li>Replace data management slice with cloudmr-core version</li>
            <li>Remove duplicated utility functions</li>
            <li>Test full application functionality</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default TestCloudMRCore;