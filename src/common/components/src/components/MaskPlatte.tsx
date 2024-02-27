import React, {useEffect, useState} from 'react';
import {Stack, IconButton, Slider, Typography, Box} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import FiberManualRecordOutlinedIcon from '@mui/icons-material/FiberManualRecordOutlined';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import {DualSlider} from "../../Cmr-components/double-slider/DualSlider";
import {InvertibleDualSlider} from "../../Cmr-components/double-slider/InvertibleDualSlider";
import CmrCheckbox from "../../Cmr-components/checkbox/Checkbox";

interface MaskPlatteProps {
    expanded:boolean,
    nv: any,
    setMaskColor:(color:string|undefined)=>void,
}

const MaskPlatte: React.FC<MaskPlatteProps> = ({expanded,nv,setMaskColor }) => {
    const [colorIndex, storeColorIndex] = useState(-1);
    const [maskColor,storeMaskColor] = useState<string|undefined>(undefined);
    const [checked,setChecked] = useState(false);
    let colors = ['red','green','blue','yellow','cyan','#e81ce8'];
    let filledOptions = colors.map(color=><FiberManualRecordIcon sx={{ color: color }} />);
    if(expanded){
        setMaskColor(maskColor);
    }else{
        setMaskColor(undefined);
    }
    const [min, setMin] = useState(nv.volumes[0]?nv.volumes[0].robust_min:0)
    const [max, setMax] = useState(nv.volumes[0]?nv.volumes[0].robust_max:1)
    useEffect(() => {
        if(colorIndex!=-1)
            nv.fillRange(min,max,colorIndex+1,checked);
    }, [min,max]);
    return (
        <Stack
            style={{position: 'absolute',
                top: '100%', // Position right below the IconButton
                left: 0,
                zIndex: 10, // Higher z-index to layer it above
                border: `${expanded ? '1px' : 0} solid #bbb`,
                maxWidth: expanded ? 450 : 0,
                // transition: 'all 0.5s',
                overflow: 'hidden',
                borderRadius: '16px',
                borderTopLeftRadius:'6pt',
                borderTopRightRadius:'6pt',
                background:'#333',
            }}
            direction="column"
        >
            <Stack alignItems="center">

                <Typography color={'white'} gutterBottom width={'100%'} marginLeft={'10pt'}
                            fontSize={'11pt'} alignItems={'start'}>{'Mask range:'}</Typography>
            </Stack>
            {/*<Stack*/}
            {/*    // style={{*/}
            {/*    //     border: `${expandDrawOptions ? '1px' : 0} solid #ccc`,*/}
            {/*    //     maxWidth: expandDrawOptions ? 300 : 0,*/}
            {/*    //     transition: 'all 0.5s',*/}
            {/*    //     overflow: 'hidden',*/}
            {/*    //     borderRadius: '16px'*/}
            {/*    // }}*/}
            {/*    direction="row"*/}
            {/*>*/}
            {/*    {options.map((value, index) => (*/}
            {/*        <IconButton*/}
            {/*            onClick={() => {*/}
            {/*                updateDrawPen({ target: { value: index+1 } });*/}
            {/*                setDrawingEnabled(true);*/}
            {/*            }}*/}
            {/*        >*/}
            {/*            {value}*/}
            {/*        </IconButton>*/}
            {/*    ))}*/}
            {/*</Stack>*/}
            <Stack
                // style={{
                //     border: `${expandDrawOptions ? '1px' : 0} solid #ccc`,
                //     maxWidth: expandDrawOptions ? 300 : 0,
                //     transition: 'all 0.5s',
                //     overflow: 'hidden',
                //     borderRadius: '16px'
                // }}
                direction="row" flexDirection={'row'} justifyContent={'center'}
            >
                {filledOptions.map((value, index) => (
                    <IconButton key={index}
                        onClick={() => {
                            storeColorIndex(index);
                            storeMaskColor(colors[index]);
                            setMaskColor(colors[index]);
                            nv.fillRange(min,max,index+1,checked);
                        }}
                    >
                        {value}
                    </IconButton>
                ))}
                <CmrCheckbox style={{color:'white'}} onChange={(e)=>{
                    e.stopPropagation();
                    setChecked(e.target.checked)
                }}>
                    Inverted
                </CmrCheckbox>
            </Stack>

            <Stack direction={'row'}  sx={{mb:1}}>
                <Box width={400} style={{paddingLeft:'10px',paddingRight:'10px'}}>
                    <InvertibleDualSlider name={''} min={nv.volumes[0]?nv.volumes[0].robust_min:0}
                                          max={nv.volumes[0]?nv.volumes[0].robust_max:1} reverse={checked}

                                          setMin={setMin}

                                          setMax={setMax}/>
                </Box>
            </Stack>

            <Stack
                // style={{
                //     border: `${expandDrawOptions ? '1px' : 0} solid #ccc`,
                //     maxWidth: expandDrawOptions ? 300 : 0,
                //     transition: 'all 0.5s',
                //     overflow: 'hidden',
                //     borderRadius: '16px'
                // }}
                direction="row" flexDirection={'row'} justifyContent={'center'}
            >
                <IconButton>
                    <CheckIcon style={{color:'green'}}/>
                </IconButton>

                <IconButton>
                    <CloseIcon style={{color:'red'}}/>
                </IconButton>
            </Stack>
        </Stack>
    );
};

export default MaskPlatte;
