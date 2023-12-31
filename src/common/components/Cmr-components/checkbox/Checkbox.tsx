import React, {ChangeEvent} from 'react';
import { Checkbox } from '@mui/material';
import './Checkbox.scss';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { FormControlLabel } from '@mui/material';

interface CmrCheckboxProps  extends React.HTMLAttributes<HTMLDivElement>{
    autoFocus?: boolean;
    checked?: boolean;
    defaultChecked?: boolean;
    disabled?: boolean;
    indeterminate?: boolean;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    children?: any;
    style?: any;
}

const CmrCheckbox = (props: CmrCheckboxProps) => {
    const { defaultChecked, onChange, children, ...rest } = props;

    return (
        <FormControlLabel disabled={props.disabled} style={props.style} className={props.className} control={<Checkbox checked={props.checked} defaultChecked={defaultChecked} onChange={onChange}/>}
                          label={<span className='cmr-label' style={{paddingRight:0, color:'var(--bs-card-color)'}}>
                                {props.children}
                          </span>}
                          labelPlacement="start"/>
    );
};

export default CmrCheckbox;
