import React from 'react';
import './Tooltip.scss';
import { Tooltip } from 'antd';
import {  TooltipPlacement } from 'antd/lib/tooltip';

interface CmrTooltipProps {
    arrowPointAtCenter?: boolean;
    autoAdjustOverflow?: boolean;
    color?: string;
    defaultVisible?: boolean;
    mouseEnterDelay?: number;
    mouseLeaveDelay?: number;
    overlayClassName?: string;
    placement?: TooltipPlacement;
    visible?: boolean;
    title: React.ReactNode;
    overlay?: React.ReactNode;
}

const CmrTooltip = (props: CmrTooltipProps) => {
    const {
        arrowPointAtCenter,
        autoAdjustOverflow,
        color,
        defaultVisible,
        mouseEnterDelay,
        mouseLeaveDelay,
        overlayClassName,
        placement,
        visible,
        ...rest
    } = props;

    return (
        <Tooltip
            arrowPointAtCenter={arrowPointAtCenter}
            autoAdjustOverflow={autoAdjustOverflow}
            color={color}
            defaultVisible={defaultVisible}
            mouseEnterDelay={mouseEnterDelay}
            mouseLeaveDelay={mouseLeaveDelay}
            overlayClassName={overlayClassName}
            placement={placement}
            visible={visible}
            {...rest}
        />
    );
};

export default CmrTooltip;
