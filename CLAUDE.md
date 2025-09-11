# MROptimum WebGUI

MROptimum is a React TypeScript application for magnetic resonance optimization workflows. This application has been integrated with the shared `cloudmr-core` library to eliminate code duplication with the TESS application.

## Architecture

### Core Dependencies
- **React 18.2.0** - Frontend framework
- **TypeScript 4.9.5** - Type safety and development tooling
- **Redux Toolkit** - State management
- **Material-UI** - Component library
- **axios 1.10.0** - HTTP client
- **cloudmr-core** - Shared library for CloudMR applications (linked via npm link)
- **cloudmr-ux** - Shared UI components

### Development Setup
```bash
npm install
npm link cloudmr-core  # Links to shared library
npm start              # Runs on port 4001
```

## cloudmr-core Integration Changes

### Authentication State Management
Updated all components to use the unified authentication state from cloudmr-core:
- **Changed**: `state.authenticate.logged_in_token?.accessToken` → `state.authenticate.accessToken`
- **Files affected**: All components using authentication state
- **Reason**: cloudmr-core provides a computed `accessToken` property for backward compatibility

### Shared Action Creators
Migrated from local implementations to cloudmr-core shared actions:

#### Data Management
- **uploadData**: Moved from local `SystemUtilities` to `cloudmr-core`
  - Supports multipart uploads with progress tracking
  - Handles both regular data and results uploads
  - Unified interface across TESS and MROptimum

#### Authentication
- **login**: Uses `cloudmr-core` authentication flow
- **profile**: Unified profile management
- **refresh**: Token refresh mechanism

### Import Statement Updates
Updated imports across the application to use cloudmr-core:

```typescript
// Before
import { uploadData } from '../../features/SystemUtilities';
import { convertTimestamp } from '../../common/utilities/TimestampUtilities';

// After  
import { uploadData, convertTimestamp } from 'cloudmr-core';
```

### Key Files Modified

#### Authentication Integration
- `src/app/*/` - All page components updated for new auth state structure
- `src/features/jobs/jobActionCreation.ts` - Updated to use shared utilities
- `src/features/jobs/jobsSlice.ts` - Updated imports and type definitions

#### Data Management
- `src/app/home/Home.tsx` - Updated data upload and rename functionality
- `src/app/setup/Setup.tsx` - Multiple upload handlers updated
- `src/app/setup/Setup_v1.tsx` - Legacy setup page updated
- `src/app/results/Results.tsx` - Results upload functionality updated
- `src/app/results/Rois.tsx` - ROI management updated

#### Utility Functions
- `src/features/SystemUtilities.ts` - Modified to work with cloudmr-core uploadData
- Removed local implementations now available in cloudmr-core

### Type System Updates
- **LambdaFile**: Now uses cloudmr-core type definitions
- **UploadedFile**: Imports from cloudmr-core instead of local dataSlice
- **Authentication interfaces**: Unified across applications

### Build and Module Configuration
- **Module compatibility**: Ensured ES2015 module compatibility with cloudmr-core
- **Peer dependencies**: Properly configured to use host application's axios version
- **npm link setup**: Configured for local development with shared library

## Development Notes

### npm link Workflow
When developing with cloudmr-core:
1. Make changes in `/cloudmr-core`
2. Run `npm run build` in cloudmr-core
3. Changes automatically reflect in linked MROptimum application
4. No need to reinstall or relink unless package.json changes

### Version Compatibility
- **axios**: Must match version between cloudmr-core (peer dep) and MROptimum (1.10.0)
- **Redux Toolkit**: Shared version 2.8.2+ across all applications
- **React**: Consistent 18.2.0 across the ecosystem

### Common Issues & Solutions

#### "axios_1.default.post is not a function"
- **Cause**: Version mismatch or CommonJS/ES module conflicts
- **Solution**: Ensure cloudmr-core uses ES2015 modules and peer dependencies only

#### Import/Export Errors
- **Cause**: Missing exports from cloudmr-core or incorrect import paths
- **Solution**: Verify exports in cloudmr-core/src/index.ts and update imports

#### Type Conflicts
- **Cause**: Different versions of type definitions between libraries
- **Solution**: Use cloudmr-core types consistently, remove duplicate local types

## Testing

### Manual Testing Checklist
- [ ] Login/logout functionality
- [ ] File upload (data and results)
- [ ] File rename operations
- [ ] Pipeline execution
- [ ] ROI management
- [ ] Profile management

### Known Issues
- ESLint warnings for equality operators (== vs ===) - cosmetic only
- React Hook exhaustive-deps warnings - functionality unaffected
- Some unused variables from migration - cleanup pending

## API Endpoints

MROptimum connects to the CloudMR Python backend with the following key endpoints:
- `POST /api/auth/login` - User authentication
- `GET /api/auth/profile` - User profile data
- `GET /api/data` - List user data files
- `POST /api/data/create` - Create data entries
- `POST /api/upload_initiate` - Start multipart upload
- `POST /api/upload_finalize` - Complete multipart upload
- `GET /api/pipeline` - List user pipelines
- `POST /api/pipeline/request` - Create pipeline requests

## Future Enhancements

1. **Complete ESLint cleanup**: Address remaining equality and dependency warnings
2. **Enhanced error handling**: Implement comprehensive error boundaries
3. **Performance optimization**: Add React.memo and useMemo where beneficial
4. **Testing coverage**: Add unit and integration tests
5. **Documentation**: Expand component-level documentation