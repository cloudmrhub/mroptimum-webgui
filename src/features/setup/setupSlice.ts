import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {RootState} from '../store';
import {UploadedFile} from "../data/dataSlice";
import {Job} from "../jobs/jobsSlice";
import moment from "moment/moment";

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
    pseudoReplicaCount?: number;
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
    options: Record<string, unknown> | undefined; // Empty object, could define more strictly if needed.
    multiraid?: boolean;
    vendor?: string;
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
    return {
        type: 'file',
        id: uploadedFile.id,
        options: {
            type: uploadedFile.database,
            filename: uploadedFile.fileName,
            options: undefined,
            multiraid: false
        }
    };
}


function createJob(snr: SNR, setupState: SetupState, alias: string | undefined = undefined): Job {
    return {
        alias: (alias) ? alias : `${snr.name}-${snr.options.reconstructor.options.signal?.options.filename}`,
        createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
        files: [],
        id: setupState.idGenerator++,
        setup: snr,
        status: "temporary",
        updatedAt: ""
    };
}

export const setupSlice = createSlice({
    name: 'setup',
    initialState,
    reducers: {
        setAnalysisMethod(state: SetupState, action: PayloadAction<number>) {
            state.activeSetup.id = action.payload;
            state.activeSetup.name = ['ac', 'mr', 'pmr', 'cr'][action.payload];
            state.editInProgress=true;
        },
        setPseudoReplicaCount(state: SetupState, action: PayloadAction<number>) {
            state.activeSetup.options['pseudoReplicaCount'] = action.payload;
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
            state.editInProgress=true;
        },
        setMultiRaid(state: SetupState, action: PayloadAction<boolean>) {
            state.activeSetup.options.reconstructor.options.signalMultiRaid = action.payload;
            if (state.activeSetup.options.reconstructor.options.signal) {
                state.activeSetup.options.reconstructor.options.signal.options['multiraid'] = action.payload;
            }
            state.editInProgress=true;
        },
        setReconstructionMethod(state: SetupState, action: PayloadAction<number>) {
            state.activeSetup.options.reconstructor.id = action.payload;
            state.activeSetup.options.reconstructor.name = ['rss', 'b1', 'sense', 'grappa'][action.payload];
            if (state.activeSetup.options.reconstructor.id == 2)
                state.activeSetup.options.reconstructor.options.gfactor = true;
            else
                state.activeSetup.options.reconstructor.options.gfactor = false;
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
            state.editInProgress=true;
        },
        setSensitivityMapSource(state: SetupState, action: PayloadAction<UploadedFile>) {
            state.activeSetup.options.reconstructor.options.sensitivityMap.options.sensitivityMapSource = UFtoFR(action.payload);
            state.editInProgress=true;
        },
        setDecimate(state: SetupState, action: PayloadAction<boolean>) {
            state.activeSetup.options.reconstructor.options['decimate'] = action.payload;
            if (action.payload && state.activeSetup.options.reconstructor.options.accelerations == undefined)
                state.activeSetup.options.reconstructor.options.accelerations = [1, 1, 24];
            state.editInProgress=true;
        },
        setDecimateAccelerations(state: SetupState, action: PayloadAction<number[]>) {
            state.activeSetup.options.reconstructor.options.accelerations = action.payload;
            state.editInProgress=true;
        },
        compileSNRSettings(state: SetupState) {
            let SNRSpec = state.activeSetup;
            // Remove noise reference
            if (!SNRSpec.options.reconstructor.options.signalMultiRaid)
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
            state.queuedJobs.push(createJob(SNRSpec, state));
            //Deep copy default SNR
            state.activeSetup = <SNR>JSON.parse(JSON.stringify(defaultSNR));
            state.editInProgress = false;
        },
        completeSNREditing(state: SetupState, action: PayloadAction<{id:number, alias:string}>) {
            let SNRSpec = state.activeSetup;
            // Remove noise reference
            if (!SNRSpec.options.reconstructor.options.signalMultiRaid)
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
            state.queuedJobs[index].setup=SNRSpec;
            state.queuedJobs[index].alias = action.payload.alias;
            //Deep copy default SNR
            state.activeSetup = <SNR>JSON.parse(JSON.stringify(defaultSNR));
            state.editInProgress = false;
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
        return state.setup.activeSetup?.options['pseudoReplicaCount'];
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

    getDecimateAccelerations: (state: RootState): number[] | undefined => {
        return state.setup.activeSetup?.options.reconstructor?.options.accelerations;
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