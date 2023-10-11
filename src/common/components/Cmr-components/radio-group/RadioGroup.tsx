import React from 'react';
import './RadioGroup.scss';
import { Radio } from 'antd';
import { RadioChangeEvent } from 'antd/lib/radio/interface';

interface CmrRadioGroupProps {
    defaultValue?: any;
    disabled?: boolean;
    name?: string;
    value?: any;
    onChange?: (e: RadioChangeEvent) => void;
    children?: React.ReactNode;
}

const CmrRadioGroup = (props: CmrRadioGroupProps) => {
    const { defaultValue, disabled, name, value, onChange, children, ...rest } = props;

    return (
        <Radio.Group
            defaultValue={defaultValue}
            disabled={disabled}
            name={name}
            value={value}
            onChange={onChange}
            {...rest}
        >
            {children}
        </Radio.Group>
    );
};

export default CmrRadioGroup;
