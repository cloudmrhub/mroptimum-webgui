import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {RootState} from '../store';
import {UploadedFile} from "../data/dataSlice";
import {Job, SetupInterface} from "../jobs/jobsSlice";
import moment from "moment/moment";
import {submitJobs} from "./setupActionCreation";

interface SetupState {
    loading: boolean;
    activeSetup: SNR;
    editInProgress: boolean;
    submittedJobs: SNR[];
    queuedJobs: Job[];
    idGenerator: number;
}

interface SNR {
    queued: boolean;
    version: string;
    acquisition: number;
    type: string;
    name: string;
    id?: number;
    options: SNROptions;
}

interface SNROptions {
    NR?: number;
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
    acl?: number[];
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
                        sensitivityMapMethod: 'inner'
                    }
                },
                correction: {
                    useCorrection: false,
                    faCorrection: undefined,
                },
                gfactor: false
            }
        }
    }
};

const initialState: SetupState = {
    activeSetup: <SNR>JSON.parse(JSON.stringify(defaultSNR)),
    loading: false,
    submittedJobs: [],
    queuedJobs: [],
    idGenerator: 0,
    editInProgress: false
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

function createSetup(snr:SNR, alias:string):SetupInterface{
     return {version: "v0",
        alias: alias,
        output: {
        coilsensitivity: snr.options.reconstructor.id==1||snr.options.reconstructor.id==2,
            gfactor: snr.options.reconstructor.id == 2,
            matlab: true
    },
        task:snr};
}


function createJob(snr: SNR, setupState: SetupState, alias = `${snr.options.reconstructor.options.signal?.options.filename}-${snr.name}`): Job {

    return {
        alias: alias,
        createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
        files: [],
        id: setupState.idGenerator++,
        setup: createSetup(snr,alias),
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
                state.activeSetup.options.NR = 20;
            else
                delete state.activeSetup.options.NR;
            state.editInProgress=true;
        },
        setPseudoReplicaCount(state: SetupState, action: PayloadAction<number>) {
            state.activeSetup.options['NR'] = action.payload;
            state.editInProgress=true;
        },
        setSignal(state: SetupState, action: PayloadAction<UploadedFile>) {
            let fr = UFtoFR(action.payload);
            state.activeSetup.options.reconstructor.options.signal = fr;
            fr.options.multiraid = state.activeSetup.options.reconstructor.options.signalMultiRaid;
            state.editInProgress=true;
        },
        setNoise(state: SetupState, action: PayloadAction<UploadedFile>) {
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
            if(action.payload == 2 ||action.payload==3){
                state.activeSetup.options.reconstructor.options.decimate = false;
            }else
                delete state.activeSetup.options.reconstructor.options.decimate;
            state.editInProgress=true;
        },
        setFlipAngleCorrection(state: SetupState, action: PayloadAction<boolean>) {
            state.activeSetup.options.reconstructor.options.correction.useCorrection = action.payload;
            state.editInProgress=true;
        },
        setFlipAngleCorrectionFile(state: SetupState, action: PayloadAction<UploadedFile>) {
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
        setSensitivityMapSource(state: SetupState, action: PayloadAction<UploadedFile>) {
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
        setDecimateACL(state: SetupState, action: PayloadAction<number>) {
            state.activeSetup.options.reconstructor.options.acl = [action.payload,action.payload];
            state.editInProgress=true;
        },
        compileSNRSettings(state: SetupState, action: PayloadAction<string>) {
            let SNRSpec = state.activeSetup;
            let signalCache = SNRSpec.options.reconstructor.options.signal;
            let noiseCache = SNRSpec.options.reconstructor.options.noise;
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
            state.queuedJobs.push(createJob(SNRSpec, state, action.payload));
            //Deep copy default SNR
            state.activeSetup = <SNR>JSON.parse(JSON.stringify(defaultSNR));
            state.activeSetup.options.reconstructor.options.signal = signalCache;
            state.activeSetup.options.reconstructor.options.noise = noiseCache;
            state.editInProgress = false;
        },
        completeSNREditing(state: SetupState, action: PayloadAction<{id:number, alias:string}>) {
            let SNRSpec = state.activeSetup;
            // Remove noise reference
            if (SNRSpec.options.reconstructor.options.signalMultiRaid)
                delete SNRSpec.options.reconstructor.options.noise;
            if (!SNRSpec.options.reconstructor.options.decimate)
                delete SNRSpec.options.reconstructor.options.accelerations;
            // Remove multi-raid tag
            delete SNRSpec.options.reconstructor.options.signalMultiRaid;
            // Remove non-existent decimate data for Grappa and Sense
            if (SNRSpec.options.reconstructor.name != 'grappa' && SNRSpec.options.reconstructor.name != 'sense') {
                delete SNRSpec.options.reconstructor.options.decimate;
                delete SNRSpec.options.reconstructor.options.accelerations;
            }
            let index = -1;
            for (let i in state.queuedJobs) {
                if (state.queuedJobs[i].id == action.payload.id) {
                    index = Number(i);
                    break;
                }
            }
            state.queuedJobs[index].setup=createSetup(SNRSpec,action.payload.alias);
            state.queuedJobs[index].alias = action.payload.alias;
            state.queuedJobs[index].status = 'modified';
            //Deep copy default SNR
            state.activeSetup = <SNR>JSON.parse(JSON.stringify(defaultSNR));
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
        loadSNRSettings(state: SetupState, action: PayloadAction<SNR>) {
            state.activeSetup = action.payload;
            let snr = state.activeSetup;
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
        }
    },
    extraReducers: (builder) => {
        builder.addCase(submitJobs.fulfilled, (state,responses)=>{
            console.log(responses.payload);
            for(let response of responses.payload){
                let id = response.id;
                for(let job of state.queuedJobs){
                    if(job.id==id){
                        if(response.status==200){
                            job.status='submitted';
                        }else{
                            job.status = 'failed to submit';
                        }
                    }
                }
            }
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
    getDecimateACL: (state: RootState): number | undefined => {
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

export type {SNR, FileReference, FileOptions};
export const setupSetters = setupSlice.actions;
export const setupGetters = SetupGetters;