// export const CLOUDMR_SERVER = 'https://ewjjq013u0.execute-api.us-east-1.amazonaws.com';

// export const MRO_SERVER = 'https://ry5ib49g2d.execute-api.us-east-1.amazonaws.com/Prod';

// //To be merged into CloudMR Server
// export const PROFILE_SERVER = 'https://ewjjq013u0.execute-api.us-east-1.amazonaws.com';
// export const API_URL = 'https://ewjjq013u0.execute-api.us-east-1.amazonaws.com/api-token';

// export const API_TOKEN = 'yPWaWARdLvaKZd0blo3cjBcZBNwZE3t2ghzSs6Rf';

export const CLOUDMR_SERVER =
  import.meta.env.VITE_CLOUDMR_SERVER ||
  "https://7gbqt0rf0l.execute-api.us-east-1.amazonaws.com/Prod/api"; //'https://ewjjq013u0.execute-api.us-east-1.amazonaws.com';

// export const MRO_SERVER = process.env.MRO_SERVER || 'https://aaaz629pyg.execute-api.us-east-1.amazonaws.com/Prod'; // https://3ip95tbnkf.execute-api.us-east-1.amazonaws.com/Prod

export const API_URL = import.meta.env.VITE_API_URL || "xxxxx";

export const API_TOKEN =
  import.meta.env.VITE_API_TOKEN || "iwAFDjSeeh9MvhpA7wCT92uztNtPV7NJ6Wwrnd9v";

// export const MRO_JOB = process.env.MRO_JOB || 'https://gqies0px4e.execute-api.us-east-1.amazonaws.com/Prod';
