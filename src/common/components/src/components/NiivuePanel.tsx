import React from "react"
import { Box } from "@mui/material"
import {nv} from "../Niivue";
import LocationTable from "./LocationTable";
import {ROITable} from "../../../../app/results/Rois";
import {DrawToolkit, DrawToolkitProps} from "./DrawToolKit";
import GUI from 'lil-gui';

interface NiivuePanelProps{
    nv:any;
    displayVertical:boolean;
    pipelineID:string;
    locationTableVisible: boolean;
    locationData:any[];
    decimalPrecision: number;
    drawToolkitProps: DrawToolkitProps;
    resampleImage:()=>void;
}

export function NiivuePanel (props:NiivuePanelProps) {
    const sliceControl = React.useRef(null);
	const canvas = React.useRef(null)
    const histogram = React.useRef(null);
    let height = 650;
    // This hook is for initialization, called only once
    React.useEffect(()=>{
        props.nv.attachTo('niiCanvas');
        props.nv.opts.dragMode=props.nv.dragModes.pan;
    },[canvas]);

    // This hook is called when show distribution state changed
	React.useEffect(() => {
        props.nv.resizeListener();
        props.nv.setMultiplanarLayout(2);
        props.nv.setMultiplanarPadPixels(10);
        props.resampleImage();
    }, [props.displayVertical]);

    React.useEffect(() => {
        if(!props.displayVertical)
            props.resampleImage();
    }, [histogram]);

    React.useEffect(()=>{
        const gui = new GUI({
            container: (document.getElementById( 'controlDock' )as HTMLElement) }) ;

        const myObject = {
            myBoolean: true,
            myString: 'Slice labels',
            xSlice: 1,
            ySlice: 1,
            zSlice: 1,
        };

        gui.add( myObject, 'myBoolean' );  // Checkbox
        gui.add( myObject, 'xSlice',0,1 );   // Number Field
        gui.add( myObject, 'ySlice' ,0,1);   // Number Field
        gui.add( myObject, 'zSlice' ,0,1);   // Number Field

// Add sliders to number fields by passing min and max
        gui.add( myObject, 'myNumber', 0, 1 );
    },[sliceControl])

	return (
		<Box style={{width:'100%',display:'flex',flexDirection:'row', justifyContent:"flex-end"}}>
            <Box ref={sliceControl} id={"controlDock"} sx={{width:'1fr'}}>

            </Box>
            <Box
                sx={{
                    width:props.displayVertical?'100%':height,
                    height: height+1,
                    display:'flex',
                    flexDirection:'column'
                }}
            >
                <LocationTable
                    tableData={props.locationData}
                    isVisible={props.locationTableVisible}
                    decimalPrecision={props.decimalPrecision}
                    showDistribution={props.displayVertical}
                    style={{width:'100%',height:'20pt', color:'white'}}
                />
                <canvas id={'niiCanvas'} ref={canvas} height={height} width={'100%'} />
            </Box>
            <Box sx={{width: '40%',
                display:(props.displayVertical)?'none':'flex',
                height:height+1, marginLeft:1, flexDirection:'column'}}>
                <DrawToolkit {...props.drawToolkitProps}
                     style={{height:'10%'}} />
                <Box
                    ref={histogram}
                    id={'histoplot'}
                    style={{
                        width:'100%',
                        height: '44%'
                    }}
                >
                </Box>

                <ROITable
                    pipelineID={props.pipelineID}
                    style={{
                        width:'100%',
                        height:'45%'
                    }}
                />
            </Box>
        </Box>
	)
}
