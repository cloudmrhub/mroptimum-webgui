import React, {cloneElement} from 'react';
import { Collapse } from 'antd';
import { CollapsibleType } from 'antd/es/collapse/CollapsePanel';
import { ExpandIconPosition } from 'antd/es/collapse/Collapse';
import './Collapse.scss';

interface CmrCollapseProps {
    accordion?: boolean;
    activeKey?: Array<string | number>|number;
    bordered?: boolean;
    collapsible?: CollapsibleType;
    defaultActiveKey?: Array<string | number>;
    destroyInactivePanel?: boolean;
    expandIconPosition?: ExpandIconPosition;
    ghost?: boolean;
    onChange?: (key:Array<string | number>|number) => void;
    children?: JSX.Element[]|JSX.Element;
}

const CmrCollapse = (props: CmrCollapseProps) => {
    let {activeKey, defaultActiveKey, onChange, children}=props;
    defaultActiveKey = (defaultActiveKey)?defaultActiveKey:[];
    let [activeKeys, setActiveKeys] = React.useState(defaultActiveKey);
    if(activeKey!=undefined&&activeKey!=activeKeys){
        console.log(activeKey);
        if(activeKey instanceof Array)
            setActiveKeys(activeKey);
        else setActiveKeys([activeKey]);
    }
    return (
        <div className="cmr-collapse">
            <div>
                {(children&&Array.isArray(children))?children.map((child,index)=>{
                    let props = {expanded:activeKeys.indexOf(index)>=0,
                                panelKey: index,
                                onToggle: (key:number)=>{
                                    let i = activeKeys.indexOf(key);
                                    if(i<0) {
                                        let newKeys = [...activeKeys];
                                        newKeys.push(index);
                                        setActiveKeys(newKeys);
                                        if(onChange!=undefined)
                                            onChange(newKeys);
                                    }
                                    else {
                                        let newKeys = [...activeKeys];
                                        newKeys.splice(i,1);
                                        setActiveKeys(newKeys);
                                        if(onChange!=undefined)
                                            onChange(newKeys);
                                    }
                                }};
                    return cloneElement(child, props)
                }):((children?cloneElement(children,{expanded:activeKeys.indexOf(0)>=0,
                    panelKey: 0,
                    onToggle: (key:number)=>{
                        let i = activeKeys.indexOf(key);
                        if(i<0) {
                            let newKeys = [...activeKeys];
                            newKeys.push(0);
                            setActiveKeys(newKeys);
                        }
                        else {
                            let newKeys = [...activeKeys];
                            newKeys.splice(i,1);
                            setActiveKeys(newKeys);
                        }
                        if(onChange!=undefined)
                            onChange([0]);
                    }}):undefined))}
            </div>
        </div>
    );
};

export default CmrCollapse;
