import {CLOUDMR_SERVER, API_URL} from "./env";

export const SIGNIN = `${CLOUDMR_SERVER}/login`;//`http://cancelit-env.eba-pmamcuv5.us-east-1.elasticbeanstalk.com/api/auth/login`;//`https://cloudmrhub.com/api/auth/login`;
export const SIGNOUT = `${CLOUDMR_SERVER}/logout`;//https://cloudmrhub.com/api/auth/logout`;
export const PROFILE = `${CLOUDMR_SERVER}/profile`;

export const FINEGRAIN = `${API_URL}/auth`;

export const ROI_GET = `${CLOUDMR_SERVER}/roi/list`;
export const ROI_UPLOAD = `${CLOUDMR_SERVER}/roi/upload`;

export const DATA_API = `${CLOUDMR_SERVER}/data/read`;
export const DATA_DELETE_API = `${CLOUDMR_SERVER}/data/delete`;
export const DATA_RENAME_API = `${CLOUDMR_SERVER}/data/update`;

export const DATA_UPLOAD_INIT = `${CLOUDMR_SERVER}/upload_initiate`;
export const DATA_UPLOAD_FINALIZE = `${CLOUDMR_SERVER}/upload_finalize`;
export const JOB_UPLOAD_INIT = `${CLOUDMR_SERVER}/upload_initiate/results`;
export const JOB_UPLOAD_FINALIZE = `${CLOUDMR_SERVER}/upload_finalize/results`;
//2g05v1o1jj

export const JOBS_API = `${CLOUDMR_SERVER}/pipeline/queue_job`;
export const JOBS_RETRIEVE_API = `${CLOUDMR_SERVER}/pipeline/list`
export const JOBS_RENAME_API = `http://localhost:5010/jobs/rename`;
export const JOBS_DELETE_API =  `${CLOUDMR_SERVER}/pipeline/delete`;

export const UNZIP = `${CLOUDMR_SERVER}/unzip`;

export const APP_NAME = 'MR Optimum';

/**
 * Unit in bytes, 10 MB file size yields a chunk
 */
export const UPLOAD_FILE_CHUNK = 10 * 1024 * 1024;

// export const HOST = `cancelit-env.eba-pmamcuv5.us-east-1.elasticbeanstalk.com`;

console.log('SIGNIN:', SIGNIN);
console.log('FINEGRAIN:', FINEGRAIN);
console.log('SIGNOUT:', SIGNOUT);
console.log('PROFILE:', PROFILE);
console.log('DATA_API:', DATA_API);
console.log('UNZIP:', UNZIP);
console.log('DATA_UPLOAD_INIT:', DATA_UPLOAD_INIT);
console.log('DATA_UPLOAD_FINALIZE:', DATA_UPLOAD_FINALIZE);
console.log('JOB_UPLOAD_INIT:', JOB_UPLOAD_INIT);
console.log('JOB_UPLOAD_FINALIZE:', JOB_UPLOAD_FINALIZE);
console.log('DATA_RENAME_API:', DATA_RENAME_API);
console.log('DATA_DELETE_API:', DATA_DELETE_API);
console.log('ROI_GET:', ROI_GET);
console.log('ROI_UPLOAD:', ROI_UPLOAD);
console.log('JOBS_API:', JOBS_API);
console.log('JOBS_RETRIEVE_API:', JOBS_RETRIEVE_API);
console.log('JOBS_RENAME_API:', JOBS_RENAME_API);
console.log('JOBS_DELETE_API:', JOBS_DELETE_API);
console.log('APP_NAME:', APP_NAME);
console.log('UPLOAD_FILE_CHUNK:', UPLOAD_FILE_CHUNK);