import React from 'react';
import './Footer.scss';
import { Layout } from 'antd';

const { Footer } = Layout;

const FooterBar = () => {
    const currentYear = new Date().getFullYear();
    return (
        <Footer className='cmr-footer' style={{ textAlign: 'center', background:'#f8fafc'}}>
            @ {currentYear} Copyright: Center for Biomedical Imaging. All rights reserved
        </Footer>
    );
};

export default FooterBar;
