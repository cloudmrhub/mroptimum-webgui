import {CLOUDMR_SERVER, PROFILE_SERVER, MRO_SERVER, TOKEN_SERVER} from "./env";

export const SIGNIN = `${CLOUDMR_SERVER}/login`;//`http://cancelit-env.eba-pmamcuv5.us-east-1.elasticbeanstalk.com/api/auth/login`;//`https://cloudmrhub.com/api/auth/login`;
export const FINEGRAIN = `${TOKEN_SERVER}/auth`;
export const SIGNOUT= `${CLOUDMR_SERVER}/logout`;//https://cloudmrhub.com/api/auth/logout`;
export const PROFILE = `${PROFILE_SERVER}/profile`;
export const DATAAPI = `${MRO_SERVER}/readdata`;
export const UNZIP = `${MRO_SERVER}/unzip`;
export const DATAUPLODAAPI = `${MRO_SERVER}/uploads`;
export const DATAUPLOADINIT = `${MRO_SERVER}/uploadinitiate`;
export const DATAUPLOADFINALIZE = `${MRO_SERVER}/uploadfinalize`;
export const JOBUPLOADINIT = `${MRO_SERVER}/jobinitialize`;
export const JOBUPLOADFINALIZE = `${MRO_SERVER}/jobfinalize`;
export const DATA_RENAME_API = `${MRO_SERVER}/updatedata`;
export const DATA_DELETE_API =  `${MRO_SERVER}/deletedata`;
//2g05v1o1jj
export const ROI_GET = `${CLOUDMR_SERVER}/getrois`;
export const ROI_UPLOAD = `${CLOUDMR_SERVER}/uploads`;

export const JOBS_API = `${MRO_SERVER}/pipeline`;
export const JOBS_RETRIEVE_API = `${MRO_SERVER}/downloads`;
export const JOBS_RENAME_API = `http://localhost:5010/jobs/rename`;
export const JOBS_DELETE_API =  `http://localhost:5010/jobs/delete`;

/**
 * Unit in bytes, 10 MB file size yields a chunk
 */
export const UPLOAD_FILE_CHUNK = 10 * 1024 * 1024;

// export const HOST = `cancelit-env.eba-pmamcuv5.us-east-1.elasticbeanstalk.com`;

