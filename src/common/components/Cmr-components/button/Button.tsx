import React from 'react';
import './Button.scss';
import { Button, ButtonProps } from '@mui/material';

const CmrButton = (props: ButtonProps) => {
    const { children, onClick, ...rest } = props;

    return (
        <Button onClick={onClick} {...rest} style={{...props.style, textTransform:'none'}}>
            {children}
        </Button>
    );
};

export default CmrButton;
