import React, { cloneElement } from 'react';
import { Collapse } from 'antd';
import { CollapsibleType } from 'antd/es/collapse/CollapsePanel';
import { ExpandIconPosition } from 'antd/es/collapse/Collapse';
import './Collapse.scss';

interface CmrCollapseProps {
    accordion?: boolean;
    activeKey?: Array<string | number> | number;
    bordered?: boolean;
    collapsible?: CollapsibleType;
    defaultActiveKey?: Array<string | number>;
    destroyInactivePanel?: boolean;
    expandIconPosition?: ExpandIconPosition;
    ghost?: boolean;
    onChange?: (key: Array<string | number> | number) => void;
    children?: JSX.Element[] | JSX.Element;
}

const CmrCollapse = (props: CmrCollapseProps) => {
    let { activeKey, defaultActiveKey, onChange, children } = props;
    defaultActiveKey = defaultActiveKey || [];
    const [activeKeys, setActiveKeys] = React.useState(defaultActiveKey);

    // Sync activeKey prop with state
    React.useEffect(() => {
        if (activeKey !== undefined && activeKey !== activeKeys) {
            if (Array.isArray(activeKey)) {
                setActiveKeys(activeKey);
            } else {
                setActiveKeys([activeKey]);
            }
        }
    }, [activeKey]);

    // Handle toggling panels
    const onToggle = (key: number) => {
        const newKeys = [...activeKeys];
        const keyIndex = newKeys.indexOf(key);

        if (keyIndex === -1) {
            newKeys.push(key);
        } else {
            newKeys.splice(keyIndex, 1);
        }

        setActiveKeys(newKeys);
        if (onChange) onChange(newKeys);
    };

    // Render children
    const renderChildren = () => {
        if (!children) return null;

        if (Array.isArray(children)) {
            return children.map((child, index) => {
                const panelKey = index;
                const expanded = activeKeys.includes(panelKey);

                // Make header clickable
                const header = (
                    <div onClick={() => onToggle(panelKey)} style={{ cursor: 'pointer' }}>
                        {child.props.header}
                    </div>
                );

                return cloneElement(child, {
                    expanded,
                    panelKey,
                    onToggle,
                    header, // Override header with clickable version
                });
            });
        } else {
            // Handle single child case
            const panelKey = 0;
            const expanded = activeKeys.includes(panelKey);

            // Make header clickable
            const header = (
                <div onClick={() => onToggle(panelKey)} style={{ cursor: 'pointer' }}>
                    {children.props.header}
                </div>
            );

            return cloneElement(children, {
                expanded,
                panelKey,
                onToggle,
                header, // Override header with clickable version
            });
        }
    };

    return (
        <div className="cmr-collapse">
            <div>{renderChildren()}</div>
        </div>
    );
};

export default CmrCollapse;