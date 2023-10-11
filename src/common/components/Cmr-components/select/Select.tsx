import React from 'react';
import './Select.scss';
import { Select } from 'antd';

interface CmrSelectProps {
    id?: string;
    className?: string;
    value?: Array<string | number> | string | number;
    defaultValue?: Array<string | number> | string | number;
    disabled?: boolean;
    onChange?: (value: any) => void;
    children?: any;
}

const CmrSelect = (props: CmrSelectProps) => {
    const { id, className, value, defaultValue, disabled, onChange, children, ...rest } = props;

    return (
        <Select
            id={id}
            className={className}
            value={value}
            defaultValue={defaultValue}
            disabled={disabled}
            onChange={onChange}
            {...rest}
        >
            {children}
        </Select>
    );
};

export default CmrSelect;
