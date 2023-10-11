import './CmrTable.scss';
import {DataGrid,DataGridProps} from '@mui/x-data-grid';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import GetAppIcon from '@mui/icons-material/GetApp';

interface CmrTableProps extends Omit<DataGridProps, 'rows'>{
    dataSource:any[];
    idAlias?:string;
}
const CmrTable = (props:CmrTableProps) => {
    const { dataSource,columns,
        idAlias, onRowSelectionModelChange, ...rest } = props;
    // const columnsWAction =[...columns];

    return (
        <div style={{ height: '400px', width: '100%' }} className={`${props.className? props.className:''}`}>
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
                {...rest}
                hideFooter
            />
        </div>
    );
};

export default CmrTable;