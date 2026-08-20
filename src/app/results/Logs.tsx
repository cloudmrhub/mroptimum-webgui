import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

type LogsProps = {
  loading?: boolean;
  errorText?: string;
  missing?: boolean;
};

export const Logs = ({ loading, errorText, missing }: LogsProps) => {
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
        Loading error.txt…
      </Box>
    );
  }

  if (missing || errorText == null) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          color: "rgba(0,0,0,0.4)",
          py: 2,
        }}
      >
        No error.txt was found in this job&apos;s result files.
      </Box>
    );
  }

  return (
    <Box
      component="pre"
      sx={{
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
      }}
    >
      {errorText.length > 0 ? errorText : "(empty file)"}
    </Box>
  );
};
