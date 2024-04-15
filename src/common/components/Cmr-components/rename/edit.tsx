import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import CmrButton from "../button/Button";
import {useEffect} from "react";

export default function CmrNameDialog(props: {originalName: string; renamingCallback:(alias:string)=>Promise<boolean>, open:boolean, setOpen:(open:boolean)=>void}) {
    let {originalName,open, setOpen} = props;
    const [helperText, setHelperText] = React.useState('');
    const [text, setText] = React.useState(originalName);
    const [error, setError] = React.useState(false);

    const renamingCallback = props.renamingCallback;

    const handleClose = () => {
        setOpen(false);
    };

    useEffect(() => {
        checkError(originalName);
    }, [originalName]);

    const handleConfirm = async () => {
        // if(!error)
        if(await renamingCallback(text))
            handleClose();
    };

    const handleTextFieldChange=(e: { target: { value: string; }; })=>{
        setText( e.target.value);
        checkError(e.target.value);
    }
    const checkError=(text: string)=>{
        const fileNameRegex = /^[a-zA-Z0-9_\-]+\.[a-zA-Z]{1,5}$/;
        let newExtension = text.split('.').pop();
        let orgExtension = (originalName.indexOf('.')>=0)? originalName.split('.').pop(): '?';
        if(!fileNameRegex.test(text)){
            setError(true);
            if(text.indexOf('.')<0){
                setHelperText('Invalid file name, needs a valid extension.');
            }else{
                setHelperText('Invalid file name, please check.');
            }
        }else if(newExtension!==orgExtension){
            setHelperText(`You are modifying your file extension from .${orgExtension} to .${newExtension}.`);
            setError(false);
        }else{
            setError(false);
            setHelperText('');
        }
    }

    return (
        <div>
            <Dialog open={open} onClose={handleClose}  fullWidth
                    maxWidth="xs">
                <DialogTitle>
                    Renaming file {originalName} to:
                </DialogTitle>
                <DialogContent>
                    {/*<DialogContentText>*/}
                    {/*    Renaming file {originalName} to:*/}
                    {/*</DialogContentText>*/}

                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        // type="file"
                        defaultValue = {originalName}
                        onFocus={event => {
                            event.target.select();
                        }}
                        fullWidth
                        inputProps={{style: {fontSize: "16pt"}}}
                        variant="standard"
                        onChange={handleTextFieldChange}
                        error={error}
                        helperText={helperText}
                    />
                </DialogContent>
                <DialogActions>
                    <CmrButton variant={"outlined"} color={'inherit'} sx={{color:'#333'}} onClick={handleClose}>Cancel</CmrButton>
                    <CmrButton variant={"contained"} color={'primary'} onClick={handleConfirm}>Confirm</CmrButton>
                </DialogActions>
            </Dialog>
        </div>
    );
}
