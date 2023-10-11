import React, { useState } from 'react';
import { ChromePicker, ColorResult, RGBColor } from 'react-color';
import './CmrColorPicker.scss';

interface CmrColorPickerProps {
    color: RGBColor;
    onColorChange: (result: ColorResult) => void;
}

const CmrColorPicker = (props: CmrColorPickerProps) => {
    const { color, onColorChange } = props;
    const [displayColorPicker, setDisplayColorPicker] = useState(false);

    const handleClick = () => {
        setDisplayColorPicker(!displayColorPicker);
    };

    const handleClose = () => {
        setDisplayColorPicker(false);
    };

    return (
        <div>
            <div className="swatch" onClick={handleClick}>
                <div
                    className="color"
                    style={{
                        backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`,
                    }}
                />
            </div>
            {displayColorPicker ? (
                <div className="popover">
                    <div className="cover" onClick={handleClose} />
                    <ChromePicker color={color} onChange={onColorChange} />
                </div>
            ) : null}
        </div>
    );
};

export default CmrColorPicker;
