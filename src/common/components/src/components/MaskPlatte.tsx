import React, {useState} from 'react';
import { Stack, IconButton, Slider, Typography} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import FiberManualRecordOutlinedIcon from '@mui/icons-material/FiberManualRecordOutlined';

interface MaskPlatteProps {
    expanded:boolean
}

const MaskPlatte: React.FC<MaskPlatteProps> = ({expanded }) => {
    let options = [
        <FiberManualRecordOutlinedIcon sx={{ color: 'red' }} />,
        <FiberManualRecordOutlinedIcon sx={{ color: 'green' }} />,
        <FiberManualRecordOutlinedIcon sx={{ color: 'blue' }} />,
        <FiberManualRecordOutlinedIcon sx={{ color: 'yellow' }} />,
        <FiberManualRecordOutlinedIcon sx={{ color: 'cyan' }} />,
        <FiberManualRecordOutlinedIcon sx={{ color: '#e81ce8' }} />,
    ];

    let filledOptions = [
        <FiberManualRecordIcon sx={{ color: 'red' }} />,
        <FiberManualRecordIcon sx={{ color: 'green' }} />,
        <FiberManualRecordIcon sx={{ color: 'blue' }} />,
        <FiberManualRecordIcon sx={{ color: 'yellow' }} />,
        <FiberManualRecordIcon sx={{ color: 'cyan' }} />,
        <FiberManualRecordIcon sx={{ color: '#e81ce8' }} />,
    ]
    return (
        <Stack
            style={{position: 'absolute',
                top: '100%', // Position right below the IconButton
                left: 0,
                zIndex: 10, // Higher z-index to layer it above
                border: `${expanded ? '1px' : 0} solid #bbb`,
                maxWidth: expanded ? 300 : 0,
                // transition: 'all 0.5s',
                overflow: 'hidden',
                borderRadius: '16px',
                borderTopLeftRadius:'6pt',
                borderTopRightRadius:'6pt',
                background:'#333',
            }}
            direction="column"
        >
            <Stack sx={{ mb: 1 }} alignItems="center">

                <Typography color={'white'} gutterBottom width={'100%'} marginLeft={'10pt'}
                            fontSize={'11pt'} alignItems={'start'}>{'Masking:'}</Typography>
                <Slider value={0}
                sx={{width:'80%'}} step={2} min={1} max={15} marks={true}
                    onChange={(event, value) => {
                        // updateBrushSize(value as number);
                    }}/>
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
                direction="row"
            >
                {filledOptions.map((value, index) => (
                    <IconButton
                        onClick={() => {
                            // updateDrawPen({ target: { value: index+1 } });
                            // setDrawingEnabled(true);
                        }}
                    >
                        {value}
                    </IconButton>
                ))}
            </Stack>
        </Stack>
    );
};

export default MaskPlatte;
