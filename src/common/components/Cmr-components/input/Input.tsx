import React from 'react';
import './Input.scss';
import { Input } from 'antd';
import { SizeType } from 'antd/lib/config-provider/SizeContext';
import { LiteralUnion } from 'antd/lib/_util/type';

interface CmrInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix' | 'type'> {
    defaultValue?: string;
    id?: string;
    maxLength?: number;
    size?: SizeType;
    value?: string;
    type?: any;
    prefix?: React.ReactNode;
    bordered?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPressEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const CmrInput = (props: CmrInputProps) => {
    const { defaultValue, id, maxLength, size, value, type, prefix, bordered, onChange, onPressEnter, ...rest } = props;

    return (
        <Input
            defaultValue={defaultValue}
            id={id}
            maxLength={maxLength}
            size={size}
            value={value}
            type={type}
            prefix={prefix}
            bordered={bordered}
            onChange={onChange}
            onPressEnter={onPressEnter}
            {...rest}
        />
    );
};

export default CmrInput;
