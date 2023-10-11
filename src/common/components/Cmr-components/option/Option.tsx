import React from 'react';
import { Select } from 'antd';
import './Option.scss';

const { Option } = Select;

interface CmrOptionProps {
    title?: string;
    value: string | number;
    disabled?: boolean;
    children?: any;
}

const CmrOption = (props: CmrOptionProps) => {
    const { title, value, disabled, children, ...rest } = props;

    return (
        <Option title={title} value={value} disabled={disabled} {...rest}>
            {children}
        </Option>
    );
};

export default CmrOption;
