import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import "./Signin.scss";
// @ts-ignore
import appIcon from '../../assets/mrOptimum.png';
import {SigninDataType} from "../../features/authenticate/authenticateActionCreation";

const theme = createTheme({palette: {
        primary: {
            main: '#580F8B',
        },
        secondary: {
            main: '#6c757d',
        },
    }});

export default function Signin({signInCallback}: {signInCallback: (credentials: SigninDataType)=>void}) {
    const handleSubmit = (event: any) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        //@ts-ignore
        signInCallback({email: data.get('email'), password: data.get('password')});
    };

    return (
        <ThemeProvider theme={theme}>
            <div className="flex-center page-root" style={{paddingTop:'calc(20vh - 20px)'}}>
                <div id="welcome">
                    {/*<div id="welcome-image">*/}
                    {/*    <div id="welcome-icon">*/}
                    {/*        <div style={{margin:'auto', width:'60pt'}}>*/}
                    {/*            <img src={appIcon} className="img-fluid" style={{margin:'auto'}} alt=''/>*/}
                    {/*        </div>*/}
                    {/*    </div>*/}
                    {/*    <h1 style={{display:'block', textAlign: 'center', fontWeight:'bold'}}>Optimum</h1>*/}
                    {/*</div>*/}

                    <div id="welcome-logo">
                        <div style={{margin:'auto', width:'100%', display: 'flex',
                            justifyContent:'center', alignItems: 'center'}}>
                            <img src={appIcon} className="img-fluid" style={{margin:'auto', height:'70pt'}} alt=''/>
                            <h1 style={{display:'block', marginTop:'8pt', marginRight:'5pt', textAlign: 'center', fontWeight:'bold'}}>Optimum</h1>
                        </div>
                    </div>

                    <div id="welcome-login">
                        <Box component="form" onSubmit={handleSubmit} noValidate style={{width:'87.5%'}}>
                            <TextField
                                margin="normal"
                                className='col-md-12'
                                required
                                fullWidth
                                id="email"
                                label="Email Address"
                                name="email"
                                size="small"
                                autoComplete="email"
                                autoFocus
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type="password"
                                id="password"
                                size="small"
                                autoComplete="current-password"
                            />
                            <FormControlLabel
                                control={<Checkbox value="remember" size={'small'} color="primary" />}
                                label={<Typography variant='subtitle2'>Remember Me</Typography>}
                                style={{float:'right', marginRight:'0'}}
                                className='input-sm'
                            />
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                            >
                                Sign In
                            </Button>
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                color="secondary"
                                sx={{ mb: 2 }}
                            >
                                Forgot Password?
                            </Button>
                            <Grid container justifyContent='flex-end'>
                                <Grid item>
                                    <Link href="#" className='btn btn-link' variant="body2">
                                        {"Sign Up"}
                                    </Link>
                                </Grid>
                            </Grid>
                        </Box>
                    </div>
                </div>
            </div>
        </ThemeProvider>
    );
}
