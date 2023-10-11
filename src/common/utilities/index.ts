import { complex, random } from 'mathjs';

export const isUndefined = (value: any) => {
    return typeof value === 'undefined';
};

export const complexToPolarR = (re: Array<number>, im: Array<number>) => {
    let result = [];

    for (let i = 0; i < re?.length; i++) {
        let a = complex(re[i], im[i]);
        let p = a.toPolar();
        result[i] = p.r;
    }

    return result;
};

export const complexToPolarP = (re: Array<number>, im: Array<number>) => {
    let result = [];

    for (let i = 0; i < re?.length; i++) {
        let a = complex(re[i], im[i]);
        let p = a.toPolar();
        result[i] = p.phi;
    }

    return result;
};

declare global {
    interface Array<T> {
        GetMaxMin(): any;
    }
}

Array.prototype.GetMaxMin = function () {
    let max = Number.MIN_VALUE;
    let min = Number.MAX_VALUE;
    for (let i = 0, len = this.length; i < len; i++) {
        if (isNaN(this[i])) {
        } else {
            if (this[i] > max) max = this[i];
            if (this[i] < min) min = this[i];
        }
    }

    return { Max: max, Min: min };
};

export const getUIID = () => {
    return random().toString(36).substring(2, 15) + random().toString(36).substring(2, 15);
};

export const linearFit2pts = (p0: any, p1: any) => {
    const slope = (p1.y - p0.y) / (p1.x - p0.x);
    const intercept = -slope * p0.x + p0.y;

    return {
        q: intercept,
        m: slope,
    };
};

export const purgenan = (array: any) => {
    let par: any = [];

    for (let i = 0; i < array.length; i++) {
        if (!isNaN(array[i])) {
            par.push(array[i]);
        }
    }

    return par;
};

export const average = (param: any) => {
    let sum = 0;
    for (let i = 0; i < param.length; i++) {
        sum += param[i];
    }

    return sum / param.length;
};

export const median = (numbers: any) => {
    let median = 0,
        numsLen = numbers.length;
    numbers.sort();

    if (numsLen % 2 === 0) {
        // average of two middle numbers
        median = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
    } else {
        // middle number only
        median = numbers[(numsLen - 1) / 2];
    }

    return median;
};

export const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const getFileExtension = (fileName: string) => {
    return fileName.slice(((fileName.lastIndexOf('.') - 1) >>> 0) + 2);
};
