import React, {ReactNode, useState} from 'react';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

interface CmrPanelProps extends React.HTMLAttributes<HTMLDivElement>{
    activeKey?: string|string[];
    header: string|undefined;
    children: ReactNode;
    panelKey?: number;
    onToggle?: (key: number|undefined) => void;
    expanded?: boolean;
    cardProps?: React.HTMLAttributes<HTMLDivElement>;
}
const CmrPanel = function(props:CmrPanelProps){
    let {expanded, onToggle} = props;
    const toggle = ()=>{
        if(onToggle)
            onToggle(props.panelKey);
    };
    return <div className={`card ${props.className}`}>
        <div className="card-header" style={{background: "white", display:props.header==undefined?'none':undefined}}>
            <div className="row align-items-center">
                <div className="col">{props.header}
                </div>
                {onToggle&&<div className="col text-end">
                    <span className="react-collapse float-end btn"
                          onClick={(e) => {
                              toggle();
                          }}>
                        {(!expanded)?
                            <ArrowDropDownIcon/>:
                            <ArrowDropUpIcon/>
                        }
                    </span>
                </div>}
            </div>
        </div>
        {
            (!expanded)?
                <div className={`card-body m-0 ${props.cardProps?.className}`} style={
                    {maxHeight:'0',padding:0, opacity:'0',overflow:'hidden',
                        visibility:'collapse',transition:'all 0.5s'}}>
                    {props.children}
                </div>
                :
                <div className={`card-body m-5 ${props.cardProps?.className}`} style={
                    {maxHeight:undefined,padding:0, opacity:'1',
                        visibility:'visible',transition:'all 0.5s'}}>
                    {props.children}
                </div>}
    </div>;
}

export default CmrPanel;