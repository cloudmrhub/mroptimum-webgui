import {useAppSelector} from "../../features/hooks";
import Box from "@mui/material/Box";

export const Logs = () => {
    let logs = useAppSelector(state => state.result.activeJob?.logs);

    if (logs !== undefined) {
        return (
            <Box
                style={{
                    width: '100%',
                    height: '250pt',
                    background: 'black',
                    borderRadius: '5pt',
                    marginTop: '30pt',
                    overflow: 'auto',
                    fontFamily: 'consolas',
                    padding: '10pt'
                }}
            >
                {logs.map((value, index) => {
                    let logMessage = `${value.when}: ${value.what}`;
                    const match = value.what.match(/'time': ([\d.]+),/);
                    if (match) {
                        const time = parseFloat(match[1]).toFixed(2);
                        logMessage = `${value.when}: calculation time ${time} seconds`;
                    }

                    const maskMatch = value.what.match(/mask is\s*\[\s*\{([^}]+)\}/);
                    if (maskMatch && maskMatch[1]) {
                        const firstMethod = maskMatch[1].trim();
                        logMessage = `${value.when}: mask is {${firstMethod}}`;
                    }
                    
                    return (
                        <Box key={index} style={{ color: 'white' }}>
                            {logMessage}
                        </Box>
                    );
                })}
            </Box>
        );
    } else {
        return null;
    }
};