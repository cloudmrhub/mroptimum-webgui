const fs = require('fs');
const path = require('path');

// Get environment variables from process.env
const environment = {
  CLOUDMR_SERVER: process.env.CLOUDMR_SERVER || '',
  MRO_SERVER: process.env.MRO_SERVER || '',
  PROFILE_SERVER: process.env.PROFILE_SERVER || '',
  API_URL: process.env.API_URL || '',
  API_TOKEN: process.env.API_TOKEN || '',
};

// Path to the env.tsx file
const envFilePath = path.join(__dirname, 'src', 'env.tsx');

// Create the env.tsx content
const envFileContent = `export const environment = {
  CLOUDMR_SERVER: '${environment.CLOUDMR_SERVER}',
  MRO_SERVER: '${environment.MRO_SERVER}',
  PROFILE_SERVER: '${environment.PROFILE_SERVER}',
  API_URL: '${environment.API_URL}',
  API_TOKEN: '${environment.API_TOKEN}',
};
`;

// Ensure the src directory exists
fs.mkdirSync(path.dirname(envFilePath), { recursive: true });

// Write the env.tsx file
fs.writeFileSync(envFilePath, envFileContent);

console.log('Generated src/env.tsx with the following content:');
console.log(envFileContent);
