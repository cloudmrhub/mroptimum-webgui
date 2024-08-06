import './CmrTable.scss';
import {DataGrid,DataGridProps} from '@mui/x-data-grid';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import GetAppIcon from '@mui/icons-material/GetApp';
import {CSSProperties} from "react";

interface CmrTableProps extends Omit<DataGridProps, 'rows'>{
    dataSource:any[];
    idAlias?:string;
    name?:string
    style?:CSSProperties;
}
const CmrTable = (props:CmrTableProps) => {
    const { dataSource,columns,
        idAlias, className, onRowSelectionModelChange,style, ...rest } = props;
    // const columnsWAction =[...columns];

    return (
        <div style={(style)?style:{ height: '400px', width: '100%' }} className={`${className? className:''}`}>
            <h3 style={{marginLeft:'auto',marginRight:'auto'}}>{props.name}</h3>
            <DataGrid
                rows={(dataSource!=undefined)?dataSource.map((row:any) => ({ id: (idAlias!=undefined)? row[idAlias]:row['id'], ...row })):[]}
                columns={columns}
                checkboxSelection
                onRowSelectionModelChange={onRowSelectionModelChange}
                initialState={{
                    pagination: {
                        paginationModel: { pageSize: 50, page: 0 },
                    },
                }}
                localeText={{ noRowsLabel: '' }}

                {...rest}
                // hideFooter
            />
        </div>
    );
};

export default CmrTable;