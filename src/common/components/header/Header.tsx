import './Header.scss';
import { useAppSelector } from '../../../features/hooks';
import {AppDispatch} from '../../../features/store';
import { useDispatch } from 'react-redux';
import { signOut } from '../../../features/authenticate/authenticateActionCreation';
import Header from '../Cmr-components/header/Header';

const HeaderBar = () => {
    const dispatch = useDispatch<AppDispatch>();
    const authentication = useAppSelector((state) => state.authenticate);

    const menuList = [
        { title: 'About', path: '/about' },
        { title: 'Contact Us', path: '/contact' },
        { title: 'Bug Report', path: '/bug-report' },
    ];

    const handleLogout = () => {
        // @ts-ignore
        dispatch(signOut(authentication.accessToken));
    };

    return (
        <Header  siteTitle={"MR Optimum"} authentication={authentication} menuList={menuList} handleLogout={handleLogout}/>
    );
};

export default HeaderBar;
