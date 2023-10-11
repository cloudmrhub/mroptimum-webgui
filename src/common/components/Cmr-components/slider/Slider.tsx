import React from 'react';
import './Slider.scss';
import { Slider } from 'antd';
import { SliderMarks } from 'antd/lib/slider';

interface CmrSliderProps {
    reverse?: boolean;
    defaultValue?: number;
    disabled?: boolean;
    dots?: boolean;
    included?: boolean;
    max?: number;
    min?: number;
    range?: false;
    step?: null | number;
    marks?: SliderMarks;
    vertical?: boolean;
    tipFormatter?: null | ((value?: number) => React.ReactNode);
    value?: number;
    onChange?: (value: number) => void;
    onAfterChange?: (value: number) => void;
}

const CmrSlider = (props: CmrSliderProps) => {
    const {
        reverse,
        defaultValue,
        disabled,
        dots,
        included,
        max,
        min,
        range,
        step,
        marks,
        vertical,
        tipFormatter,
        value,
        onChange,
        onAfterChange,
        ...rest
    } = props;

    return (
        <Slider
            reverse={reverse}
            defaultValue={defaultValue}
            disabled={disabled}
            dots={dots}
            included={included}
            max={max}
            min={min}
            range={range}
            step={step}
            marks={marks}
            vertical={vertical}
            tipFormatter={tipFormatter}
            value={value}
            onChange={onChange}
            onAfterChange={onAfterChange}
            {...rest}
        />
    );
};

export default CmrSlider;
