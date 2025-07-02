import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import {ChangeEvent} from "react";
import TextField from "@mui/material/TextField";
import { CmrButton } from "cloudmr-ux";

export const SNREditor = ({snrAlias,setSNRAlias,snrContent,confirm,edit,handleClose,editText='Edit Set Up',queueText='To Job/Save'}:
                               {snrAlias:string,setSNRAlias:(alias:string)=>void, snrContent: string|undefined, confirm: ()=>void, edit: ()=>void, handleClose: ()=>void,
                                    editText?:string, queueText?:string
})=>{
    const changeAlias=(e:ChangeEvent)=>{
        // @ts-ignore
        setSNRAlias( e.target.value);
    }
    return  <Dialog open={snrContent!=undefined} onClose={handleClose} fullWidth={true}>
        <DialogTitle  sx={{ml:2,mt:2,mr:2, p:1}}>Edit SNR Analysis</DialogTitle>
        <DialogContent sx={{m:2, mt:0, mb:0, p:1}} dividers>
            <TextField
                multiline
                fullWidth
                // label="Current SNR JSON:"
                maxRows={15} // Adjust as needed
                // sx={{height:'60vh'}}
                style={{
                    overflowY: 'auto',
                    padding: '10pt',
                }}
                variant="standard"
                value={snrContent}
                InputProps={{
                    disableUnderline: true, // <== added this
                }}
            />
            <TextField
                fullWidth
                required
                label="Rename Job:"
                value={snrAlias}
                variant="standard"
                onChange={changeAlias}
            />
        </DialogContent>
        <DialogActions>
            <CmrButton variant={"outlined"} sx={{color:'#1976d2'}} onClick={()=>{
                edit();
                handleClose();
            }}>{editText}</CmrButton>
            <CmrButton variant={"outlined"} color={'success'} onClick={()=>{
                confirm();
                handleClose();
            }}>{queueText}</CmrButton>
        </DialogActions>
    </Dialog>;
}