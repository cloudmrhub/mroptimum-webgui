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
    showCheckbox?: boolean; // New prop to control checkbox visibility

}
const CmrTable = (props: CmrTableProps) => {
    const { dataSource, columns, idAlias, className, onRowSelectionModelChange, style, showCheckbox = true, ...rest } = props;

    return (
        <div style={style ? style : { height: '400px', width: '100%' }} className={`${className ? className : ''}`}>
            {/* <h3 style={{ marginLeft: 'auto', marginRight: 'auto' }}>{props.name}</h3> */}
            <DataGrid
                rows={dataSource ? dataSource.map((row: any) => ({ id: idAlias ? row[idAlias] : row['id'], ...row })) : []}
                columns={columns}
                checkboxSelection={showCheckbox} // Conditionally show checkboxes
                onRowSelectionModelChange={onRowSelectionModelChange}
                initialState={{
                    pagination: {
                        paginationModel: { pageSize: 50, page: 0 },
                    },
                }}
                localeText={{ noRowsLabel: '' }}
                {...rest}
            />
        </div>
    );
};

export default CmrTable;