import React from 'react';
import './Spin.scss';
import { Spin } from 'antd';
import { SpinIndicator, SpinSize } from 'antd/lib/spin';

interface CmrSpinProps {
    delay?: number;
    indicator?: SpinIndicator;
    size?: SpinSize;
    spinning?: boolean;
    tip?: string;
    wrapperClassName?: string;
}

const CmrSpin = (props: CmrSpinProps) => {
    const { delay, indicator, size, spinning, tip, wrapperClassName, ...rest } = props;

    return (
        <Spin
            delay={delay}
            indicator={indicator}
            size={size}
            spinning={spinning}
            tip={tip}
            wrapperClassName={wrapperClassName}
            {...rest}
        />
    );
};

export default CmrSpin;
