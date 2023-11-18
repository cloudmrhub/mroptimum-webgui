import CmrTable from "../../common/components/CmrTable/CmrTable";
import React, {CSSProperties} from "react";
import {ROI} from "../../features/rois/roiSlice";
import {useAppSelector} from "../../features/hooks";

export const ROITable = (props:{pipelineID: string, style?: CSSProperties})=>{
    const rois:ROI[] = useAppSelector(state=>{
        return (state.roi.rois[props.pipelineID]==undefined)?[]:state.roi.rois[props.pipelineID];
    })
    console.log(rois);
    const roiColumns=[
        {
            headerName:'ROI ID',
            dataIndex: 'id',
            field: 'id',
            flex: 1,
        },
        {
            headerName: 'ROI Name',
            field: 'filename',
            flex: 3,
        },
        {
            headerName: 'Date Submitted',
            field: 'created_at',
            flex: 2,
        },
        {
            headerName: 'Status',
            dataIndex: 'status',
            field: 'status',
            flex: 1,
        },
    ];
    return <CmrTable style={props.style} dataSource={rois} columns={roiColumns}/>;
}