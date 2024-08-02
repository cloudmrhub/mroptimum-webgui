import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {RootState} from '../store';
import {UploadedFile} from "../data/dataSlice";
import {Job, SetupInterface} from "../jobs/jobsSlice";
import moment from "moment/moment";
import {submitJobs} from "./setupActionCreation";
import {uploadData} from "../data/dataActionCreation";

interface SetupState {
    loading: boolean;
    activeSetup: SNR;
    editInProgress: boolean;
    queuedJobs: Job[];
    idGenerator: number;
    signalUploadProgress: number;
    noiseUploadProgress: number;
    outputSettings:  OutputInterface;
    maskThresholdStore: number;
    maskOptionStore: number;
    kStore:number;
    rStore: number;
    cStore: number;
    tStore: number;
    maskFileStore?: FileReference;
}
interface OutputInterface{
    coilsensitivity: boolean,
    gfactor: boolean,
    matlab: boolean
}

interface SNR {
    queued: boolean;
    version: string;
    acquisition: number;
    type: string;
    name: string;
    id?: number;
    options: SNROptions;
    files: string[];
}

interface SNROptions {
    NR?: number;
    boxSize?:number;
    reconstructor: Reconstructor;
}

interface Reconstructor {
    type: string;
    name?: string;
    id?: number;
    options: ReconstructorOptions;
}

interface ReconstructorOptions {
    noise?: FileReference;
    signal?: FileReference;
    signalMultiRaid?: boolean;
    accelerations?: number[];
    kernelSize?: [number, number];
    acl?: (number|null)[];
    sensitivityMap: SensitivityMap;
    correction: CorrectionOptions;
    decimate?: boolean;
    gfactor: boolean;
}

interface FileReference {
    type: string;
    id: number;
    options: FileOptions;
}

interface FileOptions {
    type: string;  // "local" or "s3"
    filename: string;
    bucket:string;
    key:string;
    options: Record<string, unknown> | undefined; // Empty object, could define more strictly if needed.
    multiraid?: boolean;
    vendor: string;
}

interface SensitivityMap {
    type: string;
    id?: number;
    name?: string;
    options: SensitivityMapOptions;
}

interface SensitivityMapOptions {
    loadSensitivity: boolean;
    sensitivityMapSource?: FileReference;
    sensitivityMapMethod: string;
    mask:{
        method:string;
        value?: number;
        k?:number;
        r?:number;
        t?:number;
        c?:number;
        file?:FileReference;
    }
}

interface CorrectionOptions {
    useCorrection: boolean;
    faCorrection?: FileReference;
}

// Defaults can be defined as constant objects:

export const defaultSNR: SNR = {
    name: 'Default init',
    queued: false,
    version: 'v0',
    acquisition: 2,
    type: "snr",
    options: {
        reconstructor: {
            type: 'recon',
            options: {
                noise: undefined,
                signal: undefined,
                signalMultiRaid: false,
                sensitivityMap: {
                    type: 'sensitivityMap',
                    name: 'inner',
                    id: 2,
                    options: {
                        loadSensitivity: false,
                        sensitivityMapSource: undefined,
                        sensitivityMapMethod: 'inner',
                        mask:{
                            method:'no'
                        }
                    }
                },
                correction: {
                    useCorrection: false,
                    faCorrection: undefined,
                },
                gfactor: false
            }
        }
    },
    files: []
};

const initialState: SetupState = {
    activeSetup: <SNR>JSON.parse(JSON.stringify(defaultSNR)),
    loading: false,
    queuedJobs: [],
    idGenerator: 0,
    editInProgress: false,
    signalUploadProgress:-1,
    noiseUploadProgress:-1,
    outputSettings:{
        coilsensitivity:false,
        gfactor:false,
        matlab:true,
    },
    maskThresholdStore: 30,
    maskOptionStore: 0,
    kStore: 8,
    rStore: 24,
    tStore: 0.01,
    cStore: 0.995,
    maskFileStore:undefined
};

function UFtoFR(uploadedFile: UploadedFile): FileReference {
    try{
        let {Bucket, Key} = JSON.parse(uploadedFile.location);
        return {
            type: 'file',
            id: uploadedFile.id,
            options: {
                type: uploadedFile.database,
                filename: uploadedFile.fileName,
                options: {},
                multiraid: false,
                bucket: Bucket,
                key: Key,
                vendor: 'Siemens',
            }
        };
    }catch(e){
        return {
            type: 'file',
            id: uploadedFile.id,
            options: {
                type: uploadedFile.database,
                filename: uploadedFile.fileName,
                options: {},
                multiraid: false,
                bucket: 'unknown',
                key: 'unknown',
                vendor: 'Siemens',
            }
        };
    }
}

function UFtoMaskFR(uploadedFile: UploadedFile): FileReference {
    const regex = /\.(nii(\.gz)?|mha|mhd|nrrd)$/i;
    try{
        let {Bucket, Key} = JSON.parse(uploadedFile.location);
        return {
            type: 'file',
            id: uploadedFile.id,
            options: {
                type: uploadedFile.database,
                filename: uploadedFile.fileName,
                options: {},
                bucket: Bucket,
                key: Key,
                vendor: regex.test(uploadedFile.fileName)?'ITK':'unknown',
            }
        };
    }catch(e){
        return {
            type: 'file',
            id: uploadedFile.id,
            options: {
                type: uploadedFile.database,
                filename: uploadedFile.fileName,
                options: {},
                bucket: 'unknown',
                key: 'unknown',
                vendor: regex.test(uploadedFile.fileName)?'ITK':'unknown',
            }
        };
    }
}

function createSetup(snr:SNR, alias:string, output:{ coilsensitivity: boolean;gfactor: boolean;matlab: boolean}):SetupInterface{
    getFiles(snr);
     return {version: "v0",
        alias: alias,
        output:output,
        task:snr};
}


function createJob(snr: SNR, setupState: SetupState, alias = `${snr.options.reconstructor.options.signal?.options.filename}-${snr.name}`): Job {
    return {
        alias: alias,
        createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
        files: [],
        id: setupState.idGenerator++,
        setup: createSetup(snr,alias,setupState.outputSettings),
        status: "not submitted",
        updatedAt: "",
        pipeline_id:""
    };
}

export const setupSlice = createSlice({
    name: 'setup',
    initialState,
    reducers: {
        setAnalysisMethod(state: SetupState, action: PayloadAction<number>) {
            state.activeSetup.id = Number(action.payload);
            state.activeSetup.name = ['ac', 'mr', 'pmr', 'cr'][action.payload];
            if(state.activeSetup.name!='ac'&&state.activeSetup.name!='mr')
                if (state.activeSetup.name == 'pmr')
                state.activeSetup.options.NR = 20;
                if (state.activeSetup.name == 'cr')
                state.activeSetup.options.NR = 3;
            else
                // delete state.activeSetup.options.NR;
            if(state.activeSetup.name=='cr')
                state.activeSetup.options.boxSize = 3;
            else
                // delete state.activeSetup.options.boxSize;
            state.editInProgress=true;
        },
        setPseudoReplicaCount(state: SetupState, action: PayloadAction<number>) {
            console.log(action.payload);
            state.activeSetup.options['NR'] = action.payload;
            state.editInProgress=true;
        },
        setSignal(state: SetupState, action: PayloadAction<UploadedFile|undefined>) {
            if(action.payload==undefined){
                state.activeSetup.options.reconstructor.options.signal = undefined;
                state.editInProgress = true;
                return;
            }
            let fr = UFtoFR(action.payload);
            state.activeSetup.options.reconstructor.options.signal = fr;
            fr.options.multiraid = state.activeSetup.options.reconstructor.options.signalMultiRaid;
            state.editInProgress=true;
        },
        setNoise(state: SetupState, action: PayloadAction<UploadedFile|undefined>) {
            if(action.payload==undefined){
                state.activeSetup.options.reconstructor.options.noise = undefined;
                state.editInProgress = true;
                return;
            }
            state.activeSetup.options.reconstructor.options.noise = UFtoFR(action.payload);
            console.log(state.activeSetup.options.reconstructor.options.noise);
            state.activeSetup.options.reconstructor.options.signalMultiRaid = false;
            if (state.activeSetup.options.reconstructor.options.signal) {
                state.activeSetup.options.reconstructor.options.signal.options.multiraid = false;
            }
            state.editInProgress=true;
        },
        setMultiRaid(state: SetupState, action: PayloadAction<boolean>) {
            state.activeSetup.options.reconstructor.options.signalMultiRaid = action.payload;
            if (state.activeSetup.options.reconstructor.options.signal) {
                state.activeSetup.options.reconstructor.options.signal.options.multiraid = action.payload;
            }
            if(action.payload){
                state.activeSetup.options.reconstructor.options.noise = undefined;
            }
            state.editInProgress=true;
        },
        setReconstructionMethod(state: SetupState, action: PayloadAction<number>) {
            state.activeSetup.options.reconstructor.id = Number(action.payload);
            state.activeSetup.options.reconstructor.name = ['rss', 'b1', 'sense', 'grappa'][action.payload];
            if(action.payload==3 && state.activeSetup.options.reconstructor.options.kernelSize == undefined){
                state.activeSetup.options.reconstructor.options.kernelSize=[3,4];
            }
            state.outputSettings.coilsensitivity = action.payload == 2 || action.payload == 1;
            state.outputSettings.gfactor = action.payload == 2;
            if(action.payload == 2 ||action.payload==3){
                state.activeSetup.options.reconstructor.options.decimate = false;
            }else
                delete state.activeSetup.options.reconstructor.options.decimate;
            state.editInProgress=true;
        },
        setOutputMatlab(state:SetupState, action: PayloadAction<boolean>){
            state.outputSettings.matlab = action.payload;
        },
        setOutputCoilSensitivity(state:SetupState, action: PayloadAction<boolean>){
            state.outputSettings.coilsensitivity = action.payload;
        },
        setOutputGFactor(state:SetupState, action: PayloadAction<boolean>){
            state.outputSettings.gfactor = action.payload;
        },
        setFlipAngleCorrection(state: SetupState, action: PayloadAction<boolean>) {
            state.activeSetup.options.reconstructor.options.correction.useCorrection = action.payload;
            state.editInProgress=true;
        },
        setFlipAngleCorrectionFile(state: SetupState, action: PayloadAction<UploadedFile|undefined>) {
            if(action.payload==undefined){
                state.activeSetup.options.reconstructor.options.correction.faCorrection = undefined;
                return;
            }
            state.activeSetup.options.reconstructor.options.correction.faCorrection = UFtoFR(action.payload);
            state.editInProgress=true;
        },
        setLoadSensitivity(state: SetupState, action: PayloadAction<boolean>) {
            state.activeSetup.options.reconstructor.options.sensitivityMap.options.loadSensitivity = action.payload;
            state.editInProgress=true;
        },
        setSensitivityMapMethod(state: SetupState, action: PayloadAction<string>) {
            state.activeSetup.options.reconstructor.options.sensitivityMap.options.sensitivityMapMethod = action.payload;
            state.activeSetup.options.reconstructor.options.sensitivityMap.id = ['innerACL', 'inner'].indexOf((action.payload));
            state.activeSetup.options.reconstructor.options.sensitivityMap.name = action.payload;
            state.editInProgress=true;
        },
        setSensitivityMapSource(state: SetupState, action: PayloadAction<UploadedFile|undefined>) {
            if(action.payload==undefined){
                state.activeSetup.options.reconstructor.options.sensitivityMap.options.sensitivityMapSource = undefined;
                state.editInProgress = true;
                return;
            }
            state.activeSetup.options.reconstructor.options.sensitivityMap.options.sensitivityMapSource = UFtoFR(action.payload);
            state.editInProgress=true;
        },
        setDecimate(state: SetupState, action: PayloadAction<boolean>) {
            state.activeSetup.options.reconstructor.options['decimate'] = action.payload;
            if (action.payload && state.activeSetup.options.reconstructor.options.accelerations == undefined)
                state.activeSetup.options.reconstructor.options.accelerations = [1, 1];
                state.activeSetup.options.reconstructor.options.acl = [24,24];
            state.editInProgress=true;
        },
        setDecimateAccelerations1(state: SetupState, action: PayloadAction<number>) {
            if(state.activeSetup.options.reconstructor.options.accelerations)
                state.activeSetup.options.reconstructor.options.accelerations[0] = action.payload;
            state.editInProgress=true;
        },
        setDecimateAccelerations2(state: SetupState, action: PayloadAction<number>) {
            if(state.activeSetup.options.reconstructor.options.accelerations)
                state.activeSetup.options.reconstructor.options.accelerations[1] = action.payload;
            state.editInProgress=true;
        },
        setKernelSize1(state: SetupState, action: PayloadAction<number>) {
            console.log(state.activeSetup.options.reconstructor.options.kernelSize);
            if(state.activeSetup.options.reconstructor.options.kernelSize)
                state.activeSetup.options.reconstructor.options.kernelSize[0] = action.payload;
            state.editInProgress=true;
        },
        setKernelSize2(state: SetupState, action: PayloadAction<number>) {
            if(state.activeSetup.options.reconstructor.options.kernelSize)
                state.activeSetup.options.reconstructor.options.kernelSize[1] = action.payload;
            state.editInProgress=true;
        },
        setMaskThreshold(state: SetupState, action: PayloadAction<number>){
            state.maskThresholdStore = action.payload;
            if(state.maskOptionStore == 1){
                state.activeSetup.options.reconstructor.options.sensitivityMap.options.mask.value
                    = state.maskThresholdStore;
            }
        },
        setMaskStore(state: SetupState, action: PayloadAction<UploadedFile|undefined>){
            state.maskFileStore = action.payload?UFtoMaskFR(action.payload):undefined;
            if(state.maskOptionStore == 4){
                state.activeSetup.options.reconstructor.options.sensitivityMap.options.mask.file=state.maskFileStore;
            }
        },
        setMaskESPIRIT(state:SetupState, action: PayloadAction<{k?:number,c?:number,r?:number,t?:number}>){
            if(action.payload.k){
                state.kStore = action.payload.k;
            }
            if(action.payload.c){
                state.cStore = action.payload.c;
            }
            if(action.payload.r){
                state.rStore = action.payload.r;
            }
            if(action.payload.t){
                state.tStore = action.payload.t;
            }
            if(state.maskOptionStore==3){
                const { mask } = state.activeSetup.options.reconstructor.options.sensitivityMap.options;
                mask.k = state.kStore;
                mask.r = state.rStore;
                mask.t = state.tStore;
                mask.c = state.cStore;
            }
        },
        setMaskOption(state: SetupState, action: PayloadAction<number>){
            state.maskOptionStore = action.payload;
            if(state.activeSetup.options.reconstructor.options.sensitivityMap.options.mask==undefined){
                state.activeSetup.options.reconstructor.options.sensitivityMap.options.mask = {method:'no'};
            }
            state.activeSetup.options.reconstructor.options.sensitivityMap.options.mask.method =
                                ['no', 'percentage', 'reference','espirit','upload'][action.payload];
            if(action.payload == 1)
                state.activeSetup.options.reconstructor.options.sensitivityMap.options.mask.value
                    = state.maskThresholdStore;
            else{
                state.activeSetup.options.reconstructor.options.sensitivityMap.options.mask.value = undefined;
            }

            if(action.payload == 3){
                const { mask } = state.activeSetup.options.reconstructor.options.sensitivityMap.options;
                mask.k = state.kStore;
                mask.r = state.rStore;
                mask.t = state.tStore;
                mask.c = state.cStore;
            }else{
                state.activeSetup.options.reconstructor.options.sensitivityMap.options.mask.k = undefined;
                state.activeSetup.options.reconstructor.options.sensitivityMap.options.mask.r = undefined;
                state.activeSetup.options.reconstructor.options.sensitivityMap.options.mask.t = undefined;
                state.activeSetup.options.reconstructor.options.sensitivityMap.options.mask.c = undefined;
            }

            if(action.payload == 4){
                state.activeSetup.options.reconstructor.options.sensitivityMap.options.mask.file=state.maskFileStore;
            }else{
                state.activeSetup.options.reconstructor.options.sensitivityMap.options.mask.file=undefined;
            }
        },
        setBoxSize(state: SetupState, action: PayloadAction<number>) {
            state.activeSetup.options.boxSize = action.payload;
            state.editInProgress=true;
        },
        setDecimateACL(state: SetupState, action: PayloadAction<number|null>) {
            state.activeSetup.options.reconstructor.options.acl = [action.payload,action.payload];
            state.editInProgress=true;
        },
        compileSNRSettings(state: SetupState, action: PayloadAction<string>) {
            let SNRSpec = state.activeSetup;
            let signalCache = SNRSpec.options.reconstructor.options.signal;
            let noiseCache = SNRSpec.options.reconstructor.options.noise;
            postProcessSNR(SNRSpec);
            state.queuedJobs.push(createJob(SNRSpec, state, action.payload));
            //Deep copy default SNR
            state.activeSetup = <SNR>JSON.parse(JSON.stringify(defaultSNR));
            state.outputSettings = {gfactor:false,matlab:true,coilsensitivity:false};
            state.activeSetup.options.reconstructor.options.signal = signalCache;
            state.activeSetup.options.reconstructor.options.noise = noiseCache;
            state.editInProgress = false;
        },
        completeSNREditing(state: SetupState, action: PayloadAction<{id:number, alias:string}>) {
            let SNRSpec = state.activeSetup;
            postProcessSNR(SNRSpec);
            let index = -1;
            for (let i in state.queuedJobs) {
                if (state.queuedJobs[i].id == action.payload.id) {
                    index = Number(i);
                    break;
                }
            }
            state.queuedJobs[index].setup=createSetup(SNRSpec,action.payload.alias,state.outputSettings);
            state.queuedJobs[index].alias = action.payload.alias;
            state.queuedJobs[index].status = 'modified';
            //Deep copy default SNR
            state.activeSetup = <SNR>JSON.parse(JSON.stringify(defaultSNR));
            state.outputSettings = {gfactor:false,matlab:true,coilsensitivity:false};
            state.editInProgress = false;
            console.log(state.queuedJobs[index]);
        },
        rename(state: SetupState, action: PayloadAction<{id:number, alias:string}>) {
            let index = -1;
            for (let i in state.queuedJobs) {
                if (state.queuedJobs[i].id == action.payload.id) {
                    index = Number(i);
                    break;
                }
            }
            state.queuedJobs[index].alias = action.payload.alias;
            state.queuedJobs[index].setup.alias = action.payload.alias;
        },
        queueSNRJob(state: SetupState, action: PayloadAction<{ snr: SNR, name: string }>) {
            state.queuedJobs.push(createJob(action.payload.snr, state, action.payload.name));
        },
        discardSNRSettings(state: SetupState){
            let SNRSpec = state.activeSetup;
            let signalCache = SNRSpec.options.reconstructor.options.signal;
            let noiseCache = SNRSpec.options.reconstructor.options.noise;
            state.activeSetup = <SNR>JSON.parse(JSON.stringify(defaultSNR));
            state.outputSettings = {gfactor:false,matlab:true,coilsensitivity:false};
            state.activeSetup.options.reconstructor.options.signal = signalCache;
            state.activeSetup.options.reconstructor.options.noise = noiseCache;
            state.editInProgress = false;
        },
        loadSNRSettings(state: SetupState, action: PayloadAction<{ SNR:SNR, output: OutputInterface}>) {
            state.activeSetup = action.payload.SNR;
            state.outputSettings = action.payload.output;

            if(state.activeSetup.options.reconstructor.options.sensitivityMap.options.mask!=undefined){
                let mask = state.activeSetup.options.reconstructor.options.sensitivityMap.options.mask;
                //Also load mask stores if mask is specified
                state.kStore = mask.k??8;
                state.cStore = mask.c??0.995;
                state.tStore = mask.t??0.01;
                state.rStore = mask.r??24;
                state.maskOptionStore =  ['no', 'percentage', 'reference','espirit','upload'].indexOf(mask.method);
                state.maskThresholdStore = mask.value??30;
                state.maskFileStore = mask.file;
            }
            // snr.options.reconstructor.options.signalMultiRaid
            //     = !!(snr.options.reconstructor.options.signal?.options.multiraid);
            state.editInProgress = true;
        },
        deleteQueuedJob(state: SetupState, action: PayloadAction<number>) {
            let index = -1;
            for (let i in state.queuedJobs) {
                if (state.queuedJobs[i].id == action.payload) {
                    index = Number(i);
                    break;
                }
            }
            state.queuedJobs.splice(index, 1);
        },
        bulkDeleteQueuedJobs(state: SetupState, action: PayloadAction<number[]>) {
            for (let i = 0; i<state.queuedJobs.length; ) {
                if (action.payload.indexOf(state.queuedJobs[i].id)>=0) {
                    state.queuedJobs.splice(i,1);
                }else i++;
            }
        },
        setUploadProgress(state:SetupState, action:PayloadAction<{ target?:string,progress:number }>){
            if(action.payload.target=='signal'){
                state.signalUploadProgress = action.payload.progress;
            }
            if(action.payload.target=='noise'){
                state.noiseUploadProgress = action.payload.progress;
            }
        },
    },
    extraReducers: (builder) => {
        builder.addCase(submitJobs.fulfilled, (state,responses)=>{
            console.log(responses.payload);
            for(let response of responses.payload){
                //@ts-ignore
                let id = response.id;
                for(let job of state.queuedJobs){
                    if(job.id==id){
                        //@ts-ignore
                        if(response.status==200){
                            job.status='submitted';
                        }else{
                            job.status = 'failed to submit';
                        }
                    }
                }
            }
        });
        builder.addCase(uploadData.fulfilled, (state:SetupState, action)=>{
            let {code, file,uploadTarget} = action.payload;
            // console.log(response);
            if(uploadTarget=='signal'){
                state.signalUploadProgress = -1;
                if(code==200&&file){
                    // const uploadedFile: UploadedFile = {
                    //     id: response.id,
                    //     fileName: response.filename,
                    //     createdAt: response.created_at,
                    //     updatedAt: response.updated_at,
                    //     size: file.filesize,
                    //     link: response.onlineLink,
                    //     status: response.status,
                    //     md5: response.md5,
                    //     database: 's3',
                    //     location: response.location
                    // };
                }
            }
            if(uploadTarget=='noise'){
                state.noiseUploadProgress = -1;
                if(code==200&&file){
                    // const uploadedFile: UploadedFile = {
                    //     id: response.id,
                    //     fileName: response.filename,
                    //     createdAt: response.created_at,
                    //     updatedAt: response.updated_at,
                    //     size: file.filesize,
                    //     link: response.onlineLink,
                    //     status: response.status,
                    //     md5: response.md5,
                    //     database: 's3',
                    //     location: response.location
                    // };
                }
            }
        });
        builder.addCase('persist/REHYDRATE', (state, action) => {
            if((<PayloadAction<RootState>> action).payload==undefined)
                return;
            let setupState = (<PayloadAction<RootState>> action).payload.setup;
            // When rehydrating, reset the file uploading progresses
            state.noiseUploadProgress = -1;
            state.signalUploadProgress = -1;
            state.activeSetup =setupState.activeSetup;
            state.editInProgress = setupState.editInProgress;
            state.idGenerator = setupState.idGenerator;
            state.queuedJobs = setupState.queuedJobs;
            state.loading = false;
        })
    },
});

const SetupGetters = {
    getAnalysisMethod: (state: RootState): number | undefined => {
        return state.setup.activeSetup?.id;
    },

    getAnalysisMethodName: (state: RootState): string | undefined => {
        return state.setup.activeSetup?.name;
    },

    getPseudoReplicaCount: (state: RootState): number | undefined => {
        return state.setup.activeSetup?.options['NR'];
    },

    getBoxSize: (state: RootState): number | undefined => {
        return state.setup.activeSetup?.options['boxSize'];
    },

    getSignal: (state: RootState): FileReference | undefined => {
        return state.setup.activeSetup?.options.reconstructor?.options.signal;
    },

    getNoise: (state: RootState): FileReference | undefined => {
        return state.setup.activeSetup?.options.reconstructor?.options.noise;
    },

    getMultiRaid: (state: RootState): boolean | undefined => {
        return state.setup.activeSetup?.options.reconstructor?.options.signalMultiRaid;
    },

    getReconstructionMethod: (state: RootState): number | undefined => {
        return state.setup.activeSetup?.options.reconstructor?.id;
    },

    getReconstructionMethodName: (state: RootState): string | undefined => {
        return state.setup.activeSetup?.options.reconstructor?.name;
    },

    getFlipAngleCorrection: (state: RootState): boolean | undefined => {
        return state.setup.activeSetup?.options.reconstructor?.options.correction?.useCorrection;
    },

    getFlipAngleCorrectionFile: (state: RootState): FileReference | undefined => {
        return state.setup.activeSetup?.options.reconstructor?.options.correction?.faCorrection;
    },

    getSensitivityMapMethod: (state: RootState): string | undefined => {
        return state.setup.activeSetup?.options.reconstructor?.options.sensitivityMap?.options.sensitivityMapMethod;
    },

    getSensitivityMapSource: (state: RootState): FileReference | undefined => {
        return state.setup.activeSetup?.options.reconstructor?.options.sensitivityMap?.options.sensitivityMapSource; // Note: There seems to be a typo in the original 'sensitivityMapSouorce'
    },

    getDecimate: (state: RootState): boolean | undefined => {
        return state.setup.activeSetup?.options.reconstructor?.options.decimate;
    },

    getDecimateAcceleration1: (state: RootState): number | undefined => {
        let acc = state.setup.activeSetup?.options.reconstructor?.options.accelerations;
        return (acc)?acc[0]:0;
    },

    getDecimateAcceleration2: (state: RootState): number | undefined => {
        let acc = state.setup.activeSetup?.options.reconstructor?.options.accelerations;
        return (acc)?acc[1]:0;
    },
    getDecimateACL: (state: RootState): number | null | undefined => {
        let acl = state.setup.activeSetup?.options.reconstructor?.options.acl;
        return (acl)?acl[0]:0;
    },
    getKernelSize1: (state:RootState):number|undefined=>{
        let ks = state.setup.activeSetup?.options.reconstructor?.options.kernelSize;
        return (ks)?ks[0]:0;
    },
    getKernelSize2: (state:RootState):number|undefined=>{
        let ks = state.setup.activeSetup?.options.reconstructor?.options.kernelSize;
        return (ks)?ks[1]:0;
    },
    getLoadSensitivity(state: RootState): boolean | undefined {
        return state.setup.activeSetup?.options.reconstructor?.options.sensitivityMap?.options.loadSensitivity;
    },
    getEditInProgress(state: RootState):boolean{
        return state.setup.editInProgress;
    }
};

function postProcessSNR(SNRSpec: SNR){
    // Remove noise reference
    if (SNRSpec.options.reconstructor.options.signalMultiRaid)
        delete SNRSpec.options.reconstructor.options.noise;
    if (!SNRSpec.options.reconstructor.options.decimate){
        delete SNRSpec.options.reconstructor.options.acl;
        delete SNRSpec.options.reconstructor.options.accelerations;
    }
    // Remove multi-raid tag
    delete SNRSpec.options.reconstructor.options.signalMultiRaid;
    // Remove non-existent decimate data for Grappa and Sense
    if (SNRSpec.options.reconstructor.name != 'grappa' && SNRSpec.options.reconstructor.name != 'sense') {
        delete SNRSpec.options.reconstructor.options.decimate;
        delete SNRSpec.options.reconstructor.options.accelerations;
    }
    if(SNRSpec.options.reconstructor.name != 'grappa'){
        delete SNRSpec.options.reconstructor.options.kernelSize;
    }
}

export function getFiles(snr: SNR): void {
    // List of all possible FileReference fields in TE
    let files = [];
    if(snr.options.reconstructor.options.signal!==undefined){
        files.push('signal');
    }
    if(snr.options.reconstructor.options.noise!==undefined&&!snr.options.reconstructor.options.signal?.options.multiraid){
        files.push('noise');
    }
    if(snr.options.reconstructor.options.sensitivityMap.options.sensitivityMapSource){
        files.push('sensitivityMap');
    }
    if(snr.options.reconstructor.options.correction.faCorrection){
        files.push('faCorrection');
    }
    if(snr.options.reconstructor.options.sensitivityMap.options.mask?.file){
        files.push('mask');
    }
    snr.files = files;
}


export type {SNR, FileReference, FileOptions};
export const setupSetters = setupSlice.actions;
export const setupGetters = SetupGetters;