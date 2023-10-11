import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export default function DeletionDialog(props: { name: string | undefined; deletionCallback: () => void; }) {
    const [open, setOpen] = React.useState(true);
    const [text, setText] = React.useState('');

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleConfirm = () => {
        if(text===props.name){
            props.deletionCallback();
            setOpen(false);
        }
    };

    const handleTextFieldChange=(e: { target: { value: React.SetStateAction<string>; }; })=>{
        setText( e.target.value);
    }

    return (
        <div>
            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>Confirmation</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        To delete the files, please type your full name below and confirm.
                    </DialogContentText>

                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        type="email"
                        placeholder = {props.name}
                        fullWidth
                        inputProps={{style: {fontSize: "16pt"}}}
                        variant="standard"
                        onChange={handleTextFieldChange}
                    />
                </DialogContent>
                <DialogActions>
                    <button className='btn btn-secondary' onClick={handleClose}>Cancel</button>
                    <button className='btn btn-danger' onClick={handleConfirm}>Confirm</button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
