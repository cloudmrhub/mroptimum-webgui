import React from "react"
import { Box } from "@mui/material"
import {nv} from "../Niivue";

export function NiivuePanel (props) {
	const canvas = React.useRef(null)
    let height = 650;
    // This hook is for initialization, called only once
    React.useEffect(()=>{
        props.nv.attachTo('niiCanvas');
    },[canvas])
    // This hook is called when show distribution state changed
	React.useEffect(() => {
        props.nv.resizeListener();
        props.nv.setMultiplanarLayout(2);
        props.nv.setMultiplanarPadPixels(10);
    }, [props.showDistribution])

	return (
		<Box style={{width:'100%',display:'flex',flexDirection:'row'}}>
            <Box
                sx={{
                    width:props.showDistribution?'70%':'100%',
                    height: height
                }}
            >
                <canvas id={'niiCanvas'} ref={canvas} height={height} width={'100%'} />
            </Box>
            <Box
                id={'histoplot'}
                style={{
                    width:'30%',
                    height: height,
                    display:(props.showDistribution)?undefined:'none'
                }}
            >
            </Box>
        </Box>
	)
}
