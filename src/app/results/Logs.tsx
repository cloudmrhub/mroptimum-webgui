import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import { CmrLabel } from "cloudmr-ux";

type LogsProps = {
  loading?: boolean;
  errorText?: string;
  errorMissing?: boolean;
  infoLogText?: string;
  infoMissing?: boolean;
};

const logBoxSx = {
  width: "100%",
  maxHeight: "420px",
  background: "black",
  borderRadius: "5pt",
  overflow: "auto",
  fontFamily: "Consolas, Menlo, Monaco, monospace",
  fontSize: "0.85rem",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  color: "white",
  padding: "10pt",
  margin: 0,
} as const;

function LogSection({
  label,
  text,
  missing,
  missingMessage,
}: {
  label: string;
  text?: string;
  missing?: boolean;
  missingMessage: string;
}) {
  return (
    <Box>
      <CmrLabel style={{ color: "#580F8B", display: "block", marginBottom: 8 }}>
        {label}
      </CmrLabel>
      {missing || text == null ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            color: "rgba(0,0,0,0.4)",
            py: 1,
          }}
        >
          {missingMessage}
        </Box>
      ) : (
        <Box component="pre" sx={logBoxSx}>
          {text.length > 0 ? text : "(empty)"}
        </Box>
      )}
    </Box>
  );
}

export const Logs = ({
  loading,
  errorText,
  errorMissing,
  infoLogText,
  infoMissing,
}: LogsProps) => {
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "120px",
          color: "rgba(0,0,0,0.4)",
          gap: 1,
        }}
      >
        <CircularProgress size={22} />
        Loading logs…
      </Box>
    );
  }

  return (
    <Box>
      <LogSection
        label="error.txt"
        text={errorText}
        missing={errorMissing}
        missingMessage="No error.txt was found in this job's result files."
      />
      <Divider sx={{ my: 2 }} />
      <LogSection
        label="info.json"
        text={infoLogText}
        missing={infoMissing}
        missingMessage="No log entries were found in info.json."
      />
    </Box>
  );
};
