import {Navigate, useNavigate, useParams} from 'react-router-dom';
import { useAppDispatch } from '../features/hooks';
import {webSignin} from "../features/authenticate/authenticateActionCreation";



export default function WebSignin() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    let { token } = useParams<{token: string}>();
    // @ts-ignore
    dispatch(webSignin(token));
    return (
        <Navigate to='/'/>
    );
}