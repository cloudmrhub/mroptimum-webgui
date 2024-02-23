import {Box} from "@mui/material";
import {useRef, useState} from "react";

export const DualSlider = ({name,min,max,setMin,setMax}:{name:string,min:number,max:number,
    setMin?:(min:number)=>void, setMax?:(max:number)=>void})=>{
    const [leftSliderPosition, setLeftSliderPosition] = useState(0); // Initial percentage for the left slider
    const [rightSliderPosition, setRightSliderPosition] = useState(100); // Initial percentage for the right slider
    const [isHovering, setIsHovering] = useState(false);
    const [isControlling, setIsControlling] = useState(false);
    const [leftEditing, setLeftEditing] = useState(false);

    const [minOverride, setMinOverride] = useState<any>(undefined);
    const [maxOverride, setMaxOverride] = useState<any>(undefined);

    if(minOverride)
        min = minOverride;
    if(maxOverride)
        max = maxOverride;

    const a = (max-min)*leftSliderPosition/100+min;
    const b = (max-min)*rightSliderPosition/100+min;
    const left = Math.min(a,b);
    const right = Math.max(a,b);

    const sliderRef = useRef(null); // Ref for the parent box

    const handleDragStart = (e:any, slider:string) => {
        // Prevent default behavior
        e.preventDefault();
        setLeftEditing(false);
        setLeftIsNaN(false)
        leftRef.current.blur();

        setRightEditing(false);
        setRightIsNaN(false);
        rightRef.current.blur();

        // Calculate initial positions
        const startX = e.clientX;
        // @ts-ignore
        const sliderWidth = sliderRef.current.offsetWidth;

        const handleMouseMove = (e:any) => {
            const moveX = e.clientX - startX;
            const newPosition = ((moveX / sliderWidth) * 100) + (slider === 'left' ? leftSliderPosition : rightSliderPosition);


            // Prevent the slider from going outside the parent box
            const clampedPosition = Math.min(100, Math.max(0, newPosition));

            // Update the position of the slider
            if (slider === 'left') {
                setLeftSliderPosition(clampedPosition);
                const a = (max-min)*clampedPosition/100+min;
                const b = (max-min)*rightSliderPosition/100+min;
                setMin&&setMin(Math.min(a,b));
                setMax&&setMax(Math.max(a,b));

            } else if (slider === 'right') {
                setRightSliderPosition(clampedPosition);

                const a = (max-min)*leftSliderPosition/100+min;
                const b = (max-min)*clampedPosition/100+min;
                setMin&&setMin(Math.min(a,b));
                setMax&&setMax(Math.max(a,b));
            }

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

    const leftText = Math.abs(left)<0.01&&left!=0?Number(left).toExponential(3).toUpperCase():Number(left).toFixed(3);
    const [leftEditedText,setLeftEditedText] = useState('');
    const [leftIsNaN, setLeftIsNaN] = useState(false);
    const leftRef = useRef<any>(null);

    const [rightEditing, setRightEditing] = useState(false);
    const [rightEditedText, setRightEditedText] = useState('');
    const [rightIsNaN, setRightIsNaN] = useState(false);
    const rightRef = useRef<any>(null);

    // Logic to handle right value box editing...
    const rightText = Math.abs(right) < 0.01 && right != 0 ? Number(right).toExponential(3).toUpperCase() : Number(right).toFixed(3);


    return <Box sx={{display:'flex',flexDirection:'row', paddingLeft:'4px',paddingRight:'4px'}} height={20}>
        <Box flex={0.322} fontSize={16} color={'#3D3D3D'} alignItems={'center'} display={'flex'} marginBottom={'1pt'}
             fontFamily={'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'}>
            {name}
        </Box>
        <Box sx={{display:'flex',flexDirection:'row'}} flex={1}>
            <input ref={leftRef} style={{backgroundColor:'#f0f0f0',width:'45px', borderRadius:'2px', outline:"none",borderStyle:'none',paddingLeft:'3px',paddingRight:'3px', lineHeight:'20px',
                whiteSpace:'nowrap',fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',fontSize:'11px',color:leftIsNaN?'red':'black'}} value={
                (leftEditing)?leftEditedText:leftText
            } onKeyDown={(e) => {
                if (e.key === 'Enter'&&!leftIsNaN) {
                    //@ts-ignore
                    e.target.blur(); // This will cause the input to lose focus
                }
            }} onFocus={(e)=>{
                setLeftEditedText(e.target.value);
                setLeftEditing(true);
            }} onChange={(event)=>{
                setLeftIsNaN(isNaN(Number(event.target.value)));
                setLeftEditedText(event.target.value);
            }} onBlur={(e)=>{
                    let val = Number(leftEditedText);
                    if(isNaN(val)) {
                        return e.preventDefault();
                    }
                    setLeftEditing(false);
                    setMin&&setMin(val);
                    let newMin = min;
                    if(val<min) {
                        setMinOverride(val);
                        newMin = val;
                    }
                    let leftPosition = (val-newMin)/(max-newMin)*100;
                    setLeftSliderPosition(leftPosition);
            }}/>

            <Box sx={{ backgroundColor: '#f0f0f0', flex: 1, marginLeft: '4px', marginRight: '4px', borderRadius: '2px', position: 'relative',
                overflow:'hidden', opacity:isHovering?0.75:1
            }} ref={sliderRef}
                 onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
                {/* Central gray block with two vertical black components */}
                <Box sx={{ position: 'absolute', left: `calc(${leftSliderPosition*0.97}% - 10px)`, width: '20px', height: '100%', cursor: 'ew-resize', zIndex: 1 }}
                     onMouseDown={(e) => handleDragStart(e, 'left')}>
                    {/* Visual representation of the slider */}
                    <Box sx={{ position: 'absolute', left: '10px', width: '2px', height: '100%', backgroundColor: 'black' }} />
                </Box>

                {/* Transparent hitbox for the right slider */}
                <Box sx={{ position: 'absolute', right: `calc(${(100 - rightSliderPosition)*0.97}% - 10px)`, width: '20px', height: '100%', cursor: 'ew-resize', zIndex: 1 }}
                     onMouseDown={(e) => handleDragStart(e, 'right')}>
                    {/* Visual representation of the slider */}
                    <Box sx={{ position: 'absolute', right: '10px', width: '2px', height: '100%', backgroundColor: 'black' }} />
                </Box>
            </Box>

            <input style={{backgroundColor: '#f0f0f0', width: '45px', borderRadius: '2px', outline: "none", borderStyle: 'none', paddingLeft: '3px', paddingRight: '3px', lineHeight: '20px',
                whiteSpace: 'nowrap', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif', fontSize: '11px', color: rightIsNaN ? 'red' : 'black'}}
                 value={(rightEditing) ? rightEditedText : rightText}
                 ref={rightRef}
                 onKeyDown={(e) => {
                     if (e.key === 'Enter' && !rightIsNaN) {
                         //@ts-ignore
                         e.target.blur(); // This will cause the input to lose focus
                     }
                 }}
                 onFocus={(e) => {
                     setRightEditedText(e.target.value);
                     setRightEditing(true);
                 }}
                 onChange={(event) => {
                     setRightIsNaN(isNaN(Number(event.target.value)));
                     setRightEditedText(event.target.value);
                 }}
                 onBlur={(e) => {
                     let val = Number(rightEditedText);
                     if (isNaN(val)) {
                         return e.preventDefault();
                     }
                     setRightEditing(false);
                     setMax && setMax(val);
                     let newMax = max;
                     if (val > max) {
                         setMaxOverride(val);
                         newMax = val;
                     }
                     let rightPosition = (val - min) / (newMax - min) * 100;
                     setRightSliderPosition(rightPosition);
                 }}
            />
        </Box>
    </Box>
}