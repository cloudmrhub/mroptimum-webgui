import {useAppSelector} from "../../features/hooks";
import Box from "@mui/material/Box";

export const Logs = ()=>{
    let logs = useAppSelector(state => state.result.activeJob?.logs);
    if(logs!=undefined){
        return <Box style={{width:'100%',height:'250pt',background:'black', borderRadius:'5pt',
                marginTop:'30pt', overflow:'auto',fontFamily:'consolas', padding:'10pt'}}>
            {logs.map((value)=>{
                return <Box style={{color:'white'}}>
                    {`${value.when}: ${value.what}`}
                </Box>
            })}
        </Box>
    }else
        return undefined;
}