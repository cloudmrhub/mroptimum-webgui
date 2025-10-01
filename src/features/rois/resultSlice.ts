import { FileReference } from "../setup/setupSlice";
import { RootState } from "../store";

import { resultSlice } from 'cloudmr-core/features/rois/resultSlice'


export const resultGetters = {
    getAnalysisMethod: (state: RootState): number | undefined => {
        return state.result.activeJob?.setup.task?.id;
    },

    getAnalysisMethodName: (state: RootState): string | undefined => {
        return state.result.activeJob?.setup.task?.name;
    },

    getPseudoReplicaCount: (state: RootState): number | undefined => {
        try{if(state.result.activeJob?.setup.task?.options['NR'] !== undefined)
            return Number(state.result.activeJob?.setup.task?.options['NR']);}
        catch(e){
            return undefined;
        }
    },

    getBoxSize: (state: RootState): number | undefined => {
        try{if(state.result.activeJob?.setup.task?.options['boxSize'] !== undefined)
            return Number(state.result.activeJob?.setup.task?.options['boxSize']);}
        catch(e){
            return undefined;
        }
    },

    getSignal: (state: RootState): FileReference | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.signal;
    },

    getNoise: (state: RootState): FileReference | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.noise;
    },

    getMultiRaid: (state: RootState): boolean | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.signalMultiRaid;
    },

    getReconstructionMethod: (state: RootState): number | undefined => {
        try{if(state.result.activeJob?.setup.task?.options.reconstructor?.id !== undefined)
            return Number(state.result.activeJob?.setup.task?.options.reconstructor?.id);
        }catch(e){
            return 0;
        }
        // return state.result.activeJob?.setup.task?.options.reconstructor?.id;
    },

    getReconstructionMethodName: (state: RootState): string | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.name;
    },

    getFlipAngleCorrection: (state: RootState): boolean | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.correction?.useCorrection;
    },

    getFlipAngleCorrectionFile: (state: RootState): FileReference | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.correction?.faCorrection;
    },

    getSensitivityMapMethod: (state: RootState): string | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.sensitivityMap?.options.sensitivityMapMethod;
    },

    getSensitivityMapSource: (state: RootState): FileReference | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.sensitivityMap?.options.sensitivityMapSource;
    },

    getDecimate: (state: RootState): boolean | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.decimate;
    },

    getDecimateAcceleration1: (state: RootState): number | undefined => {
        let acc = state.result.activeJob?.setup.task?.options.reconstructor?.options.accelerations;
        return (acc) ? acc[0] : 0;
    },

    getDecimateAcceleration2: (state: RootState): number | undefined => {
        let acc = state.result.activeJob?.setup.task?.options.reconstructor?.options.accelerations;
        return (acc) ? acc[1] : 0;
    },

    getDecimateACL: (state: RootState): number | null | undefined => {
        let acl = state.result.activeJob?.setup.task?.options.reconstructor?.options.acl;
        return (acl) ? acl[0] : 0;
    },

    getKernelSize1: (state: RootState): number | undefined => {
        let ks = state.result.activeJob?.setup.task?.options.reconstructor?.options.kernelSize;
        return (ks) ? ks[0] : 0;
    },

    getKernelSize2: (state: RootState): number | undefined => {
        let ks = state.result.activeJob?.setup.task?.options.reconstructor?.options.kernelSize;
        return (ks) ? ks[1] : 0;
    },

    getLoadSensitivity: (state: RootState): boolean | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.sensitivityMap?.options.loadSensitivity;
    },
};

export const resultActions = resultSlice.actions;