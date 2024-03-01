import { Box } from "@mui/material";
import {useEffect, useRef, useState} from "react";

/**
 * This slider allows users to control a single value within a given range.
 * The rendered value can be masked by a transformation.
 * @param name
 * @param min
 * @param max
 * @param setValue
 * @param transform transform is used to mask the rendered value by a transformation
 * @param inverse transform is used to unmask the value to its original form
 * @constructor
 */
export const Slider = ({
                           name,
                           min,
                           max,
                           setValue,
                           transform = x => x,
                           inverse = x => x,
                            value
                       }: {
    name: string,
    min: number,
    max: number,
    setValue?: (value: number) => void,
    transform?: (x: number) => number,
    inverse?: (x: number) => number,
    value?:number
}) => {
    useEffect(() => {
        if(value!=undefined){
            setSliderPosition((value-min)/(max-min)*100);
        }
    }, [value]);
    const [sliderPosition, setSliderPosition] = useState(50); // Initial percentage for the slider

    const sliderRef = useRef(null); // Ref for the parent box

    const handleDragStart = (e: any) => {
        // Prevent default behavior
        e.preventDefault();

        // Calculate initial positions
        const startX = e.clientX;
        // @ts-ignore
        const sliderWidth = sliderRef.current.offsetWidth;

        const handleMouseMove = (e: any) => {
            const moveX = e.clientX - startX;
            const newPosition = ((moveX / sliderWidth) * 100)+sliderPosition;

            // Prevent the slider from going outside the parent box
            const clampedPosition = Math.min(100, Math.max(0, newPosition));

            // Update the position of the slider
            setSliderPosition(clampedPosition);
            const value = transform((max - min) * clampedPosition / 100 + min);
            setValue && setValue(value);
        };

        const handleMouseUp = () => {
            // Remove event listeners once dragging is complete
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        // Add mouse move and mouse up listeners to document to handle drag
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };


    const [isEditing, setIsEditing] = useState(false);
    const [editedValue, setEditedValue] = useState('');
    const [textIsNaN, setIsNaN] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsNaN(isNaN(Number(e.target.value)));
        setEditedValue(e.target.value);
    };

    const handleInputBlur = (e:any) => {
        let val = inverse(Number(editedValue));
        if (isNaN(val)) {
            return e.preventDefault();
        }
        setIsEditing(false);
        setValue&&setValue(val)
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter'&&!textIsNaN) {
            e.currentTarget.blur();
        }
    };

    const formatText=(value:number)=>{
        return  Math.abs(value)<0.01&&value!=0?
            Number(value).toExponential(3).toUpperCase():
            Number(value).toFixed(3);
    }

    const val = transform((max - min) * sliderPosition / 100 + min);
    const displayValue = isEditing ? editedValue : formatText(val);

    return <Box sx={{display: 'flex', flexDirection: 'row', paddingLeft: '4px', paddingRight: '4px',marginBottom:'4px'
    }} height={20}>
        <Box flex={0.77} fontSize={16} color={'#3D3D3D'} alignItems={'center'} display={'flex'} marginBottom={'1pt'}
             fontFamily={'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'}>
            {name}
        </Box>
        <Box sx={{display: 'flex', flexDirection: 'row'}} flex={1}>
            <Box sx={{
                backgroundColor: '#f0f0f0',
                flex: 1,
                marginLeft: '4px',
                marginRight: '4px',
                borderRadius: '2px',
                position: 'relative',
                overflow: 'hidden'
            }} ref={sliderRef}
                 onMouseDown={handleDragStart}>
                {/* Visual representation of the slider */}
                <Box sx={{
                    position: 'absolute',
                    left: `calc(${sliderPosition*0.98}% - 10px)`,
                    width: '20px',
                    height: '100%',
                    cursor: 'ew-resize',
                    zIndex: 1
                }}>
                    <Box sx={{
                        position: 'absolute',
                        left: '10px',
                        width: '2px',
                        height: '100%',
                        backgroundColor: 'black'
                    }}/>
                </Box>
            </Box>

            <input
                style={{
                    backgroundColor: '#f0f0f0',
                    width: '45px',
                    borderRadius: '2px',
                    outline: "none",
                    borderStyle: 'none',
                    paddingLeft: '3px',
                    paddingRight: '3px',
                    lineHeight: '20px',
                    whiteSpace: 'nowrap',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
                    fontSize: '11px',
                    color: textIsNaN?'red':'black'
                }}
                value={displayValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                onFocus={(e) => {
                    setEditedValue(e.target.value);
                    setIsEditing(true)
                }}
            />
        </Box>
    </Box>;
}