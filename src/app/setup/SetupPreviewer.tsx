import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { ChangeEvent, useState } from "react";
import TextField from "@mui/material/TextField";
import { CmrButton } from "cloudmr-ux";

export const SNRPreview = ({ previewContent, queue, edit, handleClose, alias: _suggestedAlias, setAlias, editText = 'Keep Editing', queueText = 'Queue Job', developer }:
    {
        previewContent: string, queue: (jobAlias: string) => void, edit: () => void, alias: string, setAlias: (event: ChangeEvent) => void, handleClose: () => void,
        editText?: string, queueText?: string, developer: boolean
    }) => {

    // Start empty — do not auto-use the filename/default alias; user must enter a name.
    const [jobName, setJobName] = useState("");

    // Disallow spaces, comma, colon, percent, greater-than, less-than for Job Name
    const INVALID_JOB_ALIAS_REGEX = /[ ,:%><]/;

    const [aliasError, setAliasError] = useState(false);
    const [aliasErrorText, setAliasErrorText] = useState("");

    // live validation while typing
    const handleAliasChange = (event: ChangeEvent<HTMLInputElement>) => {
        const v = event.target.value;
        setJobName(v);
        setAlias(event);

        if (!v.trim()) {
            setAliasError(true);
            setAliasErrorText("Job name is required.");
            return;
        }

        if (INVALID_JOB_ALIAS_REGEX.test(v)) {
            setAliasError(true);
            setAliasErrorText("Job name contains spaces or invalid characters ( , : % > < )");
            return;
        }

        setAliasError(false);
        setAliasErrorText("");
    };

    // queue-time validation — only the user-entered field counts (no filename fallback)
    const handleQueueClick = async () => {
        const candidate = jobName.trim();

        if (!candidate) {
            setAliasError(true);
            setAliasErrorText("Job name is required.");
            return;
        }

        if (INVALID_JOB_ALIAS_REGEX.test(jobName)) {
            setAliasError(true);
            setAliasErrorText("Job name contains spaces or invalid characters ( , : % > < )");
            return;
        }

        await queue(candidate);
        handleClose();
    };

    const candidate = jobName.trim();
    const hasInvalidChars = INVALID_JOB_ALIAS_REGEX.test(jobName);
    // Keep the button clickable when empty so "Job name is required." can show on click.
    const queueDisabled = Boolean(candidate) && hasInvalidChars;

    return <Dialog open={true} onClose={handleClose} fullWidth={true}>
        <DialogTitle sx={{ ml: 2, mt: 2, mr: 2, p: 1 }}>Setup Preview</DialogTitle>
        <DialogContent sx={{ m: 2, mt: 0, mb: 1, p: 1 }} dividers>
            {developer && <TextField
                multiline
                label={"The SNR JSON that will be submitted:"}
                fullWidth
                maxRows={15}
                style={{
                    overflowY: 'auto',
                    padding: '10pt',
                }}
                variant="standard"
                value={previewContent}
                InputProps={{
                    disableUnderline: true,
                }}
            />}
            <TextField
                fullWidth
                required
                label="Set Job Name:"
                placeholder="Enter a job name"
                value={jobName}
                variant="standard"
                onChange={handleAliasChange}
                error={aliasError}
                helperText={aliasError ? aliasErrorText : ""}
            />
        </DialogContent>

        <DialogActions sx={{ pt: 0, pl: 3, pr: 3 }}>
            <CmrButton fullWidth variant={"outlined"} onClick={() => {
                edit();
                handleClose();
            }}>{editText}</CmrButton>

            <CmrButton
                variant={"contained"}
                fullWidth
                disabled={queueDisabled}
                onClick={handleQueueClick}
            >
                {queueText}
            </CmrButton>
        </DialogActions>
    </Dialog>;
}
