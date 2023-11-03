import * as React from 'react';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import CmrButton from '../button/Button';

export default function Confirmation({ name,message,cancelText='Cancel',
    color, open, setOpen, confirmCallback=()=>{}, cancellable=false, cancelCallback=()=>{}}: { name: string | undefined; cancelText?:string; message:string|undefined;
    color?: "inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning" | undefined, open:boolean, setOpen:(open:boolean)=>void, confirmCallback?:()=>void,
    cancellable?:boolean, cancelCallback?:()=>void}) {
    const [text, setText] = React.useState('');

    const handleClose = () => {
        setOpen(false);
    };

    const handleConfirm=()=>{
        confirmCallback();
        handleClose();
    }

    const handleCancel=()=>{
        cancelCallback();
        handleClose();
    }


    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle>{name?name:'Confirmation'}</DialogTitle>
            <DialogContent>
                <DialogContentText alignContent={'center'}>
                    {message}
                </DialogContentText>
                <DialogActions className={'mt-4'}>
                    {cancellable&&
                        <CmrButton variant={"outlined"} color={'inherit'} sx={{color:'#333'}} onClick={handleCancel}>{cancelText}</CmrButton>
                    }
                    <CmrButton variant={"contained"} color={color} onClick={handleConfirm}>Confirm</CmrButton>
                </DialogActions>
            </DialogContent>
        </Dialog>
    );
}
