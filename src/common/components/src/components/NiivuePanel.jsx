import React from "react"
import { Box } from "@mui/material"

export function NiivuePanel (props) {
	const canvas = React.useRef(null)
  let height = 480
	React.useEffect(() => {
        const nv = props.nv
        let rect = canvas.current.parentNode.getBoundingClientRect()
        canvas.current.width = rect.width
        canvas.current.height = rect.height
        height = canvas.current.height
        nv.attachToCanvas(canvas.current)
            //await nv.loadMeshes(meshList)
        // let parentRect = canvas.parentNode.getBoundingClientRect()
        // let w  = parentRect.width
        // let h = parentRect.height
        function handleResize(){
          let rect = canvas.current.parentNode.getBoundingClientRect()
          canvas.current.width = rect.width
          canvas.current.height = rect.height
          height = canvas.current.height
          console.log(canvas.current.width, canvas.current.height)
        }
        window.addEventListener('resize', handleResize)
        return (_) => {
            window.removeEventListener('resize', handleResize)
          }
      }, [canvas])

	return (
		<Box
      sx={{
        display: 'flex',
        width: '100%',
        height: '100%',
        alignSelf: 'flex-start'
      }}  
    >
      <canvas ref={canvas} height={height} width={640} />
		</Box>
	)
}
