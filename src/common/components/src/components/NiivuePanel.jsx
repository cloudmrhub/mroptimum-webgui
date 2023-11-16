import React from "react"
import { Box } from "@mui/material"

export function NiivuePanel (props) {
	const canvas = React.useRef(null)
    let height = props.showDistribution?450:600;
    // This hook is for initialization, called only once
    React.useEffect(()=>{
        nv.attachTo('niiCanvas');
    },[])
    //
	React.useEffect(() => {
        const nv = props.nv
      }, [canvas])

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
                    width:props.showDistribution?'30%':'0',
                    height: height,
                    visibility:props.showDistribution?'visible':'hidden'
                }}
            >
            </Box>
        </Box>
	)
}
