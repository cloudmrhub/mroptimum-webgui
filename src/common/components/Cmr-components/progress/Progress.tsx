import React from 'react';
import './Progress.scss';
import { Progress } from 'antd';
import { ProgressGradient, ProgressType, SuccessProps } from 'antd/lib/progress/progress';

declare const ProgressStatuses: ['normal', 'exception', 'active', 'success'];

interface CmrProgressProps {
    percent?: number;
    showInfo?: boolean;
    status?: typeof ProgressStatuses[number];
    strokeColor?: string | ProgressGradient;
    strokeLinecap?: 'butt' | 'square' | 'round';
    success?: SuccessProps;
    trailColor?: string;
    type?: ProgressType;
}

const CmrProgress = (props: CmrProgressProps) => {
    const { percent, showInfo, status, strokeColor, strokeLinecap, success, trailColor, type, ...rest } = props;

    return (
        <Progress
            percent={percent}
            showInfo={showInfo}
            status={status}
            strokeColor={strokeColor}
            strokeLinecap={strokeLinecap}
            success={success}
            trailColor={trailColor}
            type={type}
            style={{marginBottom: '5pt'}}
            {...rest}
        />
    );
};

export default CmrProgress;
