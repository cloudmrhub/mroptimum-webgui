import React, { ChangeEvent } from 'react';
import { Checkbox } from '@mui/material';
import './Checkbox.scss';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import CmrLabel from '../label/Label';
import { FormControlLabel } from '@mui/material';

interface CmrCheckboxProps extends React.HTMLAttributes<HTMLDivElement> {
    autoFocus?: boolean;
    checked?: boolean;
    defaultChecked?: boolean;
    disabled?: boolean;
    indeterminate?: boolean;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    children?: any;
    style?: any;
    sx?: any;
}

const CmrCheckbox = (props: CmrCheckboxProps) => {
    const { defaultChecked, onChange, children, ...rest } = props;

    return (
        <FormControlLabel disabled={props.disabled} style={props.style} className={props.className} control={<Checkbox style={props.style} checked={props.checked} defaultChecked={defaultChecked} onChange={onChange} />}
            label={<CmrLabel>{props.children}</CmrLabel>} sx={props.sx}
            // {<span className='cmr-label' style={{ paddingRight: 0, paddingLeft: 0 }}>
            //     {props.children}
            // </span>}
            labelPlacement="end" />
    );
};

export default CmrCheckbox;
