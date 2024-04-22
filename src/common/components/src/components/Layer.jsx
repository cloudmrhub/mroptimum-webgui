import {Box, Divider, MenuItem, Slider} from "@mui/material";
import { Typography } from "@mui/material";
import { Button } from "@mui/material";
import { Select } from "@mui/material";
import { InputLabel } from "@mui/material";
import { FormControl } from "@mui/material";
import { Paper } from "@mui/material";
import { IconButton } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import { NumberPicker } from './NumberPicker.jsx'
import React from 'react'
import { display } from "@mui/system";

function makeColorGradients(colorMapValues) {
  let gradients = ''
  let c = colorMapValues
  let n = c.R.length
  gradients += `rgba(${c.R[n - 1]},${c.G[n - 1]},${c.B[n - 1]},${1})`
  gradients += `linear-gradient(90deg,`
  for (let j = 0; j < n; j++) {
    gradients += `rgba(${c.R[j]},${c.G[j]},${c.B[j]},${1}) ${(j / (n - 1)) * 100}%,`
  }
  gradients = gradients.slice(0, -1)
  gradients += ')'
  return gradients
}

export default function Layer(props) {
  const image = props.image
    const nii = props.nii
  const [detailsOpen, setDetailsOpen] = React.useState(true)
  const [color, setColor] = React.useState(image.colormap)
  const [opacity, setOpacity] = React.useState(1.0)
  let ArrowIcon = detailsOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />
  // console.log(props.colorMapValues)
  let allColors = props.nv.colormaps().map((colorName) => {
    return (
      <MenuItem value={colorName} key={colorName}>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%'
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
            }}
          >
            {colorName}
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              width: '20%',
              ml: 'auto'
            }}
            style={{
              background: makeColorGradients(props.getColorMapValues(colorName))
            }}
          >
          </Box>

        </Box>
      </MenuItem>
    )
  })

  function handleDetails() {
    setDetailsOpen(!detailsOpen)
  }

  function handleColorChange(event) {
    let clr = event.target.value
    let id = image.id
    console.log(clr)
    console.log(id)
    props.onColorMapChange(id, clr)
    setColor(clr)
  }

  function handleDelete() {
    props.onRemoveLayer(image)
  }

  function handleOpacityChanged(a) {
    setOpacity(a)
    image.opacity = a
    props.onOpacityChange(a)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          marginTop: 0.5,
          marginBottom: 0.5,
            borderStyle:'solid',
            borderWidth:'1px',
            borderColor:'gray'
        }}
      >
        <Box
          sx={{
            margin: 1,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap', // useful for handling long file names
          }}
        >
          <Typography
            sx={{
              wordBreak: 'break-word', // wrap long names
              flexBasis: '75%' // allow for name wrapping for long names and alignment to the button
            }}
          >
            {nii.name}
          </Typography>

          <IconButton
            onClick={handleDetails}
            style={{ marginLeft: 'auto' }}
          >
            {ArrowIcon}
          </IconButton>
        </Box>
        <Box
          sx={{
            display: detailsOpen ? 'flex' : 'none',
            flexDirection: 'column'
          }}>
          {/*<Box*/}
          {/*  sx={{*/}
          {/*    display: 'flex',*/}
          {/*    flexDirection: 'row',*/}
          {/*    justifyContent: 'space-between',*/}
          {/*    width: '100%'*/}
          {/*  }}*/}
          {/*  m={1}*/}
          {/*>*/}
          {/*  <IconButton*/}
          {/*  >*/}
          {/*    <KeyboardDoubleArrowUpIcon />*/}
          {/*  </IconButton>*/}

          {/*  <IconButton*/}
          {/*  >*/}
          {/*    <KeyboardArrowUpIcon />*/}
          {/*  </IconButton>*/}

          {/*  <IconButton*/}
          {/*  >*/}
          {/*    <KeyboardArrowDownIcon />*/}
          {/*  </IconButton>*/}

          {/*  <IconButton*/}
          {/*  >*/}
          {/*    <KeyboardDoubleArrowDownIcon />*/}
          {/*  </IconButton>*/}

          {/*</Box>*/}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              width: '100%',
            }}
          >
              <Typography marginLeft={2}>
                  Opacity: {opacity.toFixed(2)}
              </Typography>

              <Slider
                  sx={{width:'80%', alignSelf:'center', marginY:2}} value={opacity} step={0.01} min={0} max={1}
                  onChange={(event, value) => {
                      handleOpacityChanged(value);
                  }}/>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: '100%'
            }}
            m={2}
          >
            <FormControl>
              <InputLabel>Color</InputLabel>
              <Select
                style={{ width: '200px' }}
                value={color}
                label='Color'
                size='small'
                onChange={handleColorChange}
              >
                {allColors}
              </Select>
            </FormControl>
            {/*<IconButton*/}
            {/*  onClick={handleDelete}*/}
            {/*>*/}
            {/*  <DeleteIcon />*/}
            {/*</IconButton>*/}
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}
