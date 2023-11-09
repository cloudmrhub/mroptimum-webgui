import React from "react"
import { Box } from "@mui/material"

export function NiivuePanel (props) {
	const canvas = React.useRef(null)
    let height = props.showDistribution?450:600;
	React.useEffect(() => {
        const nv = props.nv
        // let rect = canvas.current.parentNode.getBoundingClientRect()
        // canvas.current.width = rect.width
        // canvas.current.height = rect.height
        // height = canvas.current.height
        nv.attachTo('niiCanvas');
            //await nv.loadMeshes(meshList)
        // let parentRect = canvas.parentNode.getBoundingClientRect()
        // let w  = parentRect.width
        // let h = parentRect.height
        // function handleResize(){
        //   let rect = canvas.current.parentNode.getBoundingClientRect()
        //   canvas.current.width = rect.width
        //   canvas.current.height = rect.height
        //   height = canvas.current.height
        //   console.log(canvas.current.width, canvas.current.height)
        // }
        // window.addEventListener('resize', handleResize)
        // return (_) => {
        //     window.removeEventListener('resize', handleResize)
        //   }
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
