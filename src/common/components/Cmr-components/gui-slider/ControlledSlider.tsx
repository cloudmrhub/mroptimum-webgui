import { Box } from "@mui/material";
import { useRef, useState } from "react";

export const ControlledSlider = ({
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
    value: number
}) => {
    const sliderPosition = (value - min) / (max - min) * 100;
    const sliderRef = useRef(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedValue, setEditedValue] = useState('');
    const [textIsNaN, setIsNaN] = useState(false);

    const handleDragStart = (e: any) => {
        e.preventDefault();

        const startX = e.clientX;
        //@ts-ignore
        const sliderWidth = sliderRef.current.offsetWidth;

        const handleMouseMove = (e: any) => {
            const moveX = e.clientX - startX;
            const newPosition = ((moveX / sliderWidth) * 100) + sliderPosition;
            const clampedPosition = Math.min(100, Math.max(0, newPosition));
            const newValue = (max - min) * clampedPosition / 100 + min;
            setValue && setValue(newValue);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

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

    const displayValue = isEditing ? editedValue : formatText(value);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'row', paddingLeft: '4px', paddingRight: '4px' }} height={20}>
            <Box flex={0.77} fontSize={16} color={'#3D3D3D'} alignItems={'center'} display={'flex'} marginBottom={'1pt'}
                 fontFamily={'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'}>
                {name}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'row' }} flex={1}>
                <Box
                    sx={{
                        backgroundColor: '#f0f0f0',
                        flex: 1,
                        marginLeft: '4px',
                        marginRight: '4px',
                        borderRadius: '2px',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                    ref={sliderRef}
                    onMouseDown={handleDragStart}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            left: `calc(${sliderPosition * 0.98}% - 10px)`,
                            width: '20px',
                            height: '100%',
                            cursor: 'ew-resize',
                            zIndex: 1
                        }}
                    >
                        <Box sx={{ position: 'absolute', left: '10px', width: '2px', height: '100%', backgroundColor: 'black' }} />
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
        </Box>
    );
};
