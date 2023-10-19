import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import Select from "@mui/material/Select";
import {Button, MenuItem} from "@mui/material";
import DialogActions from "@mui/material/DialogActions";
import React, {ChangeEvent, useState} from "react";
import TextField from "@mui/material/TextField";
import {store} from "../../features/store";
import CmrButton from "../../common/components/Cmr-components/button/Button";

export const SNRPreview = ({previewContent,queue,edit,handleClose, alias,setAlias,editText='Keep Editing',queueText='Queue Job'}:
                               {previewContent: string, queue: ()=>void, edit: ()=>void, alias:string, setAlias:(event: ChangeEvent)=>void, handleClose: ()=>void,
                                    editText?:string, queueText?:string
})=>{

    return  <Dialog open={true} onClose={handleClose} fullWidth={true}>
        <DialogTitle  sx={{ml:2,mt:2,mr:2, p:1}}>Setup Preview</DialogTitle>
        <DialogContent sx={{m:2, mt:0, mb:1, p:1}} style={{overflowY:'hidden'}}dividers>
            {/*<DialogContentText color={'#1976d2'}>*/}
            {/*    The SNR JSON that will be submitted:*/}
            {/*</DialogContentText>*/}
            <TextField
                multiline
                label={"The SNR JSON that will be submitted:"}
                fullWidth
                maxRows={20} // Adjust as needed
                // sx={{height:'60vh'}}
                style={{
                    overflowY: 'auto',
                    padding: '10pt',
                }}
                variant="standard"
                value={previewContent}
                InputProps={{
                    disableUnderline: true, // <== added this
                }}
            />
            <TextField
                fullWidth
                required
                label="Set Job Name:"
                value={alias}
                variant="standard"
                onChange={setAlias}
            />
        </DialogContent>
        <DialogActions sx={{pl:3,pr:3}}>
            <CmrButton fullWidth variant={"outlined"} color={'success'} onClick={()=>{
                queue();
                handleClose();
            }}>{queueText}</CmrButton>
        </DialogActions>
        <DialogActions sx={{pt:0,pl:3,pr:3}}>
            <CmrButton fullWidth variant={"outlined"} sx={{color:'#1976d2'}} onClick={()=>{
                edit();
                handleClose();
            }}>{editText}</CmrButton>
        </DialogActions>
        </Dialog>;
    // return <Dialog
    //     sx={{ '& .MuiDialog-paper': { width: 'fit-content', maxHeight: 435 } }}
    //     // maxWidth="xs"
    //     open={props.previewContent!=undefined}
    // >
    //     <DialogTitle>Phone Ringtone</DialogTitle>
    //     <DialogContent dividers>
    //         <pre>
    //         {props.previewContent}
    //         </pre>
    //     </DialogContent>
    //     <DialogActions>
    //         <Button autoFocus onClick={props.edit}>
    //             Cancel
    //         </Button>
    //         <Button onClick={props.queue}>Ok</Button>
    //     </DialogActions>
    // </Dialog>;
}