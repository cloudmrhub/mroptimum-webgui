import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box'

export default function LocationTable(props) {
  let display = 'none'
  if (props.isVisible){
    display = ''
  } else {
    display = 'none'
  }
  let data = props.tableData[0];
  let value = data?.power?(data?(data.value/data.transformA+data.transformB).toExponential(3):undefined)
      :(data?data.value.toFixed(props.decimalPrecision):undefined);
  return (
    <Box
      sx={{
        display: display === 'none'? 'none' : 'flex',
        height: '100%',
        width: (props.showDistribution)?'70%':'100%',
        alignSelf: 'flex-start',
        justifyContent: 'space-evenly'
      }}
      style={props.style}
    >
        <React.Fragment>
            <HintText>
                {`Value: ${value?value:undefined}`}
            </HintText>
            <HintText>
                {data?`Coordinates: (${data.mm[0].toFixed(props.decimalPrecision)}, ${data.mm[1].toFixed(props.decimalPrecision)}, ${data.mm[2].toFixed(props.decimalPrecision)})`
                    :`Coordinates: undefined`}
            </HintText>
            <HintText>
                {data?`Voxel location: (${data.vox[0]},${data.vox[1]},${data.vox[2]})`
                    :'Voxel location: undefined'}
            </HintText>
        </React.Fragment>

    {/*    Instead of showing things in a table, perhaps more favorable to show them as a row of text? */}
    {/*<TableContainer */}
    {/*  sx={{*/}
    {/*    display: display,*/}
    {/*    marginTop: 'auto',*/}
    {/*  }}*/}
    {/*  component={Paper}*/}
    {/*>*/}
    {/*  <Table sx={{ minWidth: 300 }}>*/}
    {/*    <TableHead>*/}
    {/*      <TableRow>*/}
    {/*        <TableCell>Image</TableCell>*/}
    {/*        <TableCell align="right">Value</TableCell>*/}
    {/*        <TableCell align="right">Coordinates</TableCell>*/}
    {/*        <TableCell align="right">Voxel</TableCell>*/}
    {/*      </TableRow>*/}
    {/*    </TableHead>*/}
    {/*    <TableBody>*/}
    {/*      {props.tableData.map((data) => (*/}
    {/*        <TableRow*/}
    {/*          key={data.id}*/}
    {/*          sx={{ '&:last-child td, &:last-child th': { border: 0} }}*/}
    {/*        >*/}
    {/*          <TableCell component="th" scope="row">*/}
    {/*            {data.name}*/}
    {/*          </TableCell>*/}
    {/*          <TableCell align="right">{data.value.toFixed(props.decimalPrecision)}</TableCell>*/}
    {/*          <TableCell align="right">*/}
    {/*            {`${data.mm[0].toFixed(props.decimalPrecision)} ${data.mm[1].toFixed(props.decimalPrecision)} ${data.mm[2].toFixed(props.decimalPrecision)}`}*/}
    {/*          </TableCell>*/}
    {/*          <TableCell align="right">*/}
    {/*            {`${data.vox[0]} ${data.vox[1]} ${data.vox[2]}`}*/}
    {/*          </TableCell>*/}
    {/*        </TableRow>*/}
    {/*      ))}*/}
    {/*    </TableBody>*/}
    {/*  </Table>*/}
    {/*</TableContainer>*/}
    </Box>
  );
}

const HintText = (props)=>{
    return <span style={{color: 'white', fontStyle: '12pt'}}>
        {props.children}
    </span>;
}
