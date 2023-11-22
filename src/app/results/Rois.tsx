import CmrTable from "../../common/components/CmrTable/CmrTable";
import React, {CSSProperties} from "react";
import {ROI} from "../../features/rois/roiSlice";
import {useAppSelector} from "../../features/hooks";
import {Job} from "../../features/jobs/jobsSlice";

export const ROITable = (props:{pipelineID: string,rois:any[], style?: CSSProperties})=>{
    // const rois:ROI[] = useAppSelector(state=>{
    //     return (state.roi.rois[props.pipelineID]==undefined)?[]:state.roi.rois[props.pipelineID];
    // })
    // console.log(rois);
    const roiColumns=[
        {
            headerName:'ROI Label',
            field: 'label',
            flex: 1,
        },
        {
            headerName: 'ROI Color',
            field: 'color',
            flex: 1,
            renderCell: (params:{row:any})=>{
                return <div style={{width:'14pt',height:'14pt',
                    borderRadius:'3pt',background:`${params.row.color}`}}>
                </div>
            }
        },
        {
            headerName: 'Mean',
            field: 'mu',
            flex: 1.5,
            renderCell: (params:{row:any})=>{
                return <div>
                    {`μ = ${params.row.mu.toFixed(3)}`}
                </div>
            }
        },
        {
            headerName: 'SD',
            field: 'std',
            flex: 1.5,
            renderCell: (params:{row:any})=>{
                return <div>
                    {`σ = ${params.row.std.toFixed(3)}`}
                </div>
            }
        },
    ];
    return <CmrTable style={props.style} dataSource={props.rois} columns={roiColumns}/>;
}