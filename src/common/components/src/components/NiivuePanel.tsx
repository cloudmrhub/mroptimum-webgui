import React from "react"
import {Box} from "@mui/material"
import LocationTable from "./LocationTable";
import {ROITable} from "../../../../app/results/Rois";
import {DrawToolkit, DrawToolkitProps} from "./DrawToolKit";
import GUI from 'lil-gui';
import "./Toolbar.scss";


interface NiivuePanelProps{
    nv:any;
    displayVertical:boolean;
    pipelineID:string;
    locationTableVisible: boolean;
    locationData:any[];
    decimalPrecision: number;
    drawToolkitProps: DrawToolkitProps;
    resampleImage:()=>void;
    layerList: React.ComponentProps<any>[];
    mins: number[];
    maxs: number[];
    mms: number[];
    rois: {}[];
    min: number;
    max:number;
    setMin:(min:number)=>void;
    setMax:(max:number)=>void;

    zipAndSendROI:(url:string,filename:string,blob:Blob)=>Promise<void>;
    unzipAndRenderROI:(url:string)=>Promise<void>;
    setLabelAlias:(label:string|number,alias:string)=>void;
}


function toRatio(val:number,min:number,max:number){
    return (val-min)/(max-min);
}

export function NiivuePanel (props:NiivuePanelProps) {
    const sliceControl = React.useRef(null);
	const canvas = React.useRef(null)
    const histogram = React.useRef<HTMLElement>(null);
    const {mins,maxs,mms} = props;
    const {gui,controllerX,controllerY,controllerZ,controllerMin,controllerMax} = createGUI();

    let height = window.innerHeight*0.75;
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
        // histogram.current?.addEventListener('resize',()=>props.resampleImage());
    }, [histogram]);

    React.useEffect(()=>{

    },[])

    const [pause, pauseUpdate] = React.useState(false);
    controllerX.min(mins[0]).max(maxs[0]).step(0.01);
    controllerY.min(mins[1]).max(maxs[1]).step(0.01);
    controllerZ.min(mins[2]).max(maxs[2]).step(0.01);
    controllerX.setValue(Number(mms[0]).toFixed(3));
    controllerY.setValue(Number(mms[1]).toFixed(3));
    controllerZ.setValue(Number(mms[2]).toFixed(3));
    controllerMin.setValue(Math.abs(props.min)<0.01&&props.min!=0?Number(props.min).toExponential(3).toUpperCase():Number(props.min).toFixed(3));
    controllerMax.setValue(Math.abs(props.max)<0.01&&props.max!=0?Number(props.max).toExponential(3).toUpperCase():Number(props.max).toFixed(3));
    controllerX.onChange((val:number)=>{
        console.log(val);
        console.log(props.nv.drawPenLocation);
        props.nv.scene.crosshairPos = [toRatio(val, mins[0], maxs[0]),
            toRatio(mms[1], mins[1], maxs[1]),
            toRatio(mms[2], mins[2], maxs[2])];
        // The following code are taken from Niivue source to change
        // crosshair location imperatively, in the future shall be replaced with Niivue
        // official API if otherwise supported
        props.nv.drawScene();
    });

    controllerY.onChange((val:number)=>{
        props.nv.scene.crosshairPos = [toRatio(mms[0], mins[0], maxs[0]),
            toRatio(val, mins[1], maxs[1]),
            toRatio(mms[2], mins[2], maxs[2])];
        props.nv.drawScene();
    });
    controllerZ.onChange((val:number)=>{
        console.log(val);
        console.log(props.nv.drawPenLocation);
        props.nv.scene.crosshairPos = [toRatio(mms[0], mins[0], maxs[0]),
            toRatio(mms[1], mins[1], maxs[1]),
            toRatio(val, mins[2], maxs[2])];
        // The following code are taken from Niivue source to change
        // crosshair location imperatively, in the future shall be replaced with Niivue
        // official API if otherwise supported
        props.nv.drawScene();
        // props.nv.createOnLocationChange();
    });
    controllerX.onFinishChange(()=>{
        props.nv.createOnLocationChange();
    });
    controllerY.onFinishChange(()=>{
        props.nv.createOnLocationChange();
    });
    controllerZ.onFinishChange(()=>{
        props.nv.createOnLocationChange();
    });

    controllerMin.onFinishChange((val:number)=>{
        // Source: niivue.js 1236
        let volume = props.nv.volumes[0];
        volume.cal_min = val;
        console.log(val);
        props.nv.refreshLayers(props.nv.volumes[0], 0, props.nv.volumes.length)
        console.log(val);
        props.nv.drawScene()
        props.setMin(val)
    })

    controllerMax.onFinishChange((val:number)=>{
        let volume = props.nv.volumes[0];
        volume.cal_max = val;
        props.nv.refreshLayers(props.nv.volumes[0], 0, props.nv.volumes.length)
        props.nv.drawScene()
        props.setMax(val)
    })
    React.useEffect(()=>{
        document.getElementById('controlDock')?.appendChild(gui.domElement);
    },[sliceControl]);

    // React.useEffect(()=>{
    //     controllerX.min(mins[0]).max(maxs[0]).setValue(mms[0]);
    //     controllerY.min(mins[1]).max(maxs[1]).setValue(mms[1]);
    //     controllerZ.min(mins[2]).max(maxs[2]).setValue(mms[2]);
    // },[mins,maxs,props.locationData])

	return (
		<Box style={{width:'100%',height:props.displayVertical?undefined:height+1,display:'flex',flexDirection:'row', justifyContent:"flex-end"}}>
            <Box sx={{width:'253px',marginRight:'8px'}} style={{display:'flex', flex:1,flexDirection:'column'}}>
                <Box id={"controlDock"} style={{width:'100%'}}  ref={sliceControl}/>
                <Box style={{height:'70%', marginTop:20}}>
                    {props.layerList}
                </Box>
            </Box>
            <Box
                sx={{
                    width:props.displayVertical?'100%':height,
                    height: (props.displayVertical?undefined:height+1),
                    aspectRatio:props.displayVertical?1:undefined,
                    maxHeight:height+1,
                    display:'flex',
                    flexDirection:'column',
                }}
            >
                <LocationTable
                    tableData={props.locationData}
                    isVisible={true}
                    decimalPrecision={props.decimalPrecision}
                    showDistribution={props.displayVertical}
                    style={{width:'100%',height:'20pt', color:'white'}}
                />
                <canvas id={'niiCanvas'} ref={canvas} height={height} width={'100%'} />
            </Box>
            <Box sx={{width: '40%',
                display:(props.displayVertical)?'none':'flex',
                height:'100%', marginLeft:1, flexDirection:'column'}}>
                <DrawToolkit {...props.drawToolkitProps}
                     style={{height:'30pt'}} />
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
                    rois={props.rois}
                    style={{
                        width:'100%',
                        height:'50%',
                        display:'flex',
                        flexDirection:'column'
                    }}
                    nv={props.nv}
                    resampleImage={props.resampleImage}

                    unpackROI={props.unzipAndRenderROI}
                    zipAndSendROI={props.zipAndSendROI}
                    setLabelAlias={props.setLabelAlias}
                />
            </Box>
        </Box>
	)
}


function createGUI(){
    const element = document.getElementById('controlDock');
    if (element?.firstChild) {
        element.innerHTML='';
    }
    const gui = new GUI({
        container: (document.getElementById( 'controlDock' )as HTMLElement) });
    const myObject = {
        xSlice: 0,
        ySlice: 1,
        zSlice: 2,
        min: 0,
        max: 1
    };
    let controllerX= gui.add( myObject, 'xSlice', 0, 1);   // Number Field
    let controllerY= gui.add( myObject, 'ySlice', 0, 1);   // Number Field
    let controllerZ= gui.add( myObject, 'zSlice', 0, 1);   // Number Field
    let controllerMin= gui.add( myObject, 'min');   // Number Field
    let controllerMax= gui.add( myObject, 'max');   // Number Field
    return {gui,controllerX,controllerY,controllerZ,controllerMin,controllerMax};
}

