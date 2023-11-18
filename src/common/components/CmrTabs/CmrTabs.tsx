import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import {TabInfo} from "./tab.model";

interface CmrTabsProps {
    tabList: TabInfo[];
    onTabSelected?: (tabId:number)=>void;
}

interface TabPanelProps {
    index: number;
    value: number;
    children: JSX.Element;
}

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 0}}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

export default function CmrTabs(props: CmrTabsProps) {
    const [value, setValue] = React.useState(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
        console.log(newValue);
        if(props.onTabSelected)
            props.onTabSelected(newValue);
    };

    console.log(props.tabList);
    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1}}>
                <Tabs value={value} onChange={handleChange} aria-label="basic tabs example"
                      textColor='inherit'
                      TabIndicatorProps={{
                            style: {
                                backgroundColor: "#580F8B",
                            }
                }}>
                    {props.tabList.map((tab, index)=>
                        <Tab sx={{color:(value==index)?'#580F8B':undefined}}  style={{fontSize:'14pt',textTransform:'none'}} label={tab.text} {...a11yProps(index)}/>)}
                </Tabs>
            </Box>
            {props.tabList.map((tab, index)=>
                <CustomTabPanel value={value} index={index}>
                    {tab.children}
                </CustomTabPanel>
            )}
        </Box>
    );
}
