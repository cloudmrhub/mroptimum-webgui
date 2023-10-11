import React from 'react';
import './InputNumber.scss';
import { InputNumber } from 'antd';
import { SizeType } from 'antd/lib/config-provider/SizeContext';

interface CmrInputNumberProps {
    defaultValue?: number;
    disabled?: boolean;
    keyboard?: boolean;
    max?: number;
    min?: number;
    size?: SizeType;
    value?: number;
    onChange?: (value: number|null) => void;
    children?: React.ReactNode;
}

const CmrInputNumber = (props: CmrInputNumberProps) => {
    const { defaultValue, max, min, value, onChange, children, ...rest } = props;

    return (
        <InputNumber defaultValue={defaultValue} max={max} min={min} value={value} onChange={onChange} {...rest}>
            {children}
        </InputNumber>
    );
};

export default CmrInputNumber;
