import * as React from 'react';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import CmrButton from '../button/Button';
import { InputAdornment } from '@mui/material';
import {useEffect} from "react";

export interface EditConfirmationProps{
    name?: string; // Equivalent to string | undefined
    defaultText?: string;
    message?: string;
    color?: "inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning";
    open: boolean;
    setOpen: (open: boolean) => void;
    confirmCallback?: (text: string) => void;
    cancellable?: boolean;
    cancelCallback?: (edit: string) => void;
    suffix?:string;
}

export default function EditConfirmation({ name,message, defaultText='',
    color, open, setOpen, confirmCallback=()=>{}, cancellable=false, cancelCallback=()=>{},suffix=''}:EditConfirmationProps) {
    const [text, setText] = React.useState(defaultText);
    useEffect(() => {
        if(open)
            setText(defaultText);
    }, [open]);
    const handleClose = () => {
        setOpen(false);
    };

    const handleConfirm=()=>{
        confirmCallback(text+suffix);
        handleClose();
    }

    const handleCancel=()=>{
        cancelCallback(text+suffix);
        handleClose();
    }


    return (
        <Dialog maxWidth="xs" fullWidth={true} open={open} onClose={handleCancel}>
            <DialogTitle>{name?name:'Confirmation'}</DialogTitle>
            <DialogContent>
                <DialogContentText alignContent={'center'}>
                    {message}
                </DialogContentText>
                <DialogActions>
                    <TextField fullWidth variant='standard'
                               InputProps={{
                                   endAdornment: (
                                       <InputAdornment position="end"  sx={{ whiteSpace: 'nowrap' }}>{suffix}</InputAdornment>
                                   ),
                               }}
                               defaultValue={text} onChange={(e)=>setText(e.target.value)}/>
                </DialogActions>
                <DialogActions>
                    {cancellable&&
                        <CmrButton variant={"outlined"} color={'inherit'} sx={{color:'#333'}} onClick={handleCancel}>Cancel</CmrButton>
                    }
                    <CmrButton variant={"contained"} color={color} onClick={handleConfirm}>Confirm</CmrButton>
                </DialogActions>
            </DialogContent>
        </Dialog>
    );
}
