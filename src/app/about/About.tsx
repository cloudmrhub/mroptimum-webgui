import React from 'react';
import './About.scss';
//@ts-ignore
import CBILogo from '../../assets/about-us/CBI_Logo_Final_CMYK-01.png';
//@ts-ignore
import CAI from '../../assets/about-us/CAI2R_PURPLE_RGB.png';
//@ts-ignore
import nibib from '../../assets/about-us/nibib_logo.png';

function AboutPage() {
    return (
        <div className="m-4 row" id={'about-root'} style={{justifyContent: 'center', display: 'flex', fontSize:'11pt'}}>
            <div className="col-md-6">
                <div className="card">
                    <div className="card-header">About</div>

                    <div className="m-5">
                        <div className="container py-1">
                            <p className="cmTitle">Cloud MR</p>
                            {description}
                        </div>
                        <div className="container py-1">
                            <p className="cmTitle">Documentation and Code</p>
                            {doc}
                        </div>
                        <div className="container py-1">
                            <p className="cmTitle">Collaborate with Us</p>
                            {collaborate}
                        </div>
                        <div className="container py-1">
                            <p className="cmTitle">Acknowledgement</p>
                            {ack}
                        </div>
                        <div className="container py-1">
                            <p className="cmTitle">Funding</p>
                            {funding}
                        </div>
                        <div className="container py-1">
                            <p className="cmTitle">References</p>
                            {refs}
                        </div>
                        <div className="container py-1">
                            <p className="cmTitle">Publications using Cloud MR</p>
                            {publications}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const description = (
    <div className="cmParagraph">
        <div className="cmText">
            Cloud MR is a multi-year project aimed at developing a comprehensive software platform to simulate all aspects of the MRI experiment. By means of an intuitive web-based user interface, Cloud MR will allow the development of RF coils, pulse sequences and image reconstruction methods within an interconnected simulation environment that will enable users to optimize them jointly or individually.
            <ul style={{ marginBottom: "0px" }}>
                <li><b>Principal Investigator</b>: <a href="https://med.nyu.edu/faculty/riccardo-lattanzi" target="_blank">Riccardo Lattanzi, PhD</a></li>
                <li><b>Head of Software Development</b>: <a href="https://cai2r.net/people/eros-montin" target="_blank">Eros Montin, PhD</a></li>
            </ul>
        </div>
    </div>
);

const doc = (
    <div className="cmParagraph">
        <div className="cmText">
            User manuals and video tutorials will be available in the future through this website. Code is available as open source <a href="https://cloudmrhub.com/repositories" target="_blank">here</a>.
        </div>
    </div>
);

const collaborate = (
    <div className="cmParagraph">
        <div className="cmText">
            <a href="/contact" target="_blank">Contact us</a> if you are interested in integrating your MRI toolbox into the <span className="cloudmrTag">Cloud MR</span> framework.
        </div>
    </div>
);

const ack = (
    <div>
        <div className="cmParagraph">
            <div className="cmText">
                The frontend of Cloud MR is based on HTML 5, JavaScript, and CSS 3, using <a href="https://vuejs.org/">Vue.js</a>/<a href="https://en.reactjs.org/">React.js</a>, PhP and MySQL with <a href="https://laravel.com/">Laravel</a> for the backend. Several people have contributed to the Cloud MR project, including: Giuseppe Carluccio, Tobias Block, Roy Wiggins, Jean-Claude Franchitti, Jordan Starcher, Alex Mammadov, Adam Rubens, August Gresens.
            </div>
        </div>
        <div className="form-group row justify-content-left">
            <div className="col-md-4 text-left">
                <img src={CBILogo} style={{ width: "75%", marginTop: "5pt", marginBottom: "5pt" }}/>
            </div>
            <div className="col-md-4 text-left">
                <img src={CAI} style={{ width: "100%", marginTop: "5pt", marginBottom: "5pt" }}/>
            </div>
        </div>
    </div>
);

const funding = (
    <div>
        <div className="cmParagraph">
            <div className="cmText">
                This research project is supported by the National Institute of Biomedical Imaging and Bioengineering (<a href="https://www.nibib.nih.gov/">NIBIB</a>) of the National Institutes of Health (<a href="https://www.nih.gov/">NIH</a>) under the Awards R01 EB024536 and P41 EB017183. The content of this website is solely the responsibility of the authors and does not necessarily represent the official views of the National Institutes of Health.
            </div>
        </div>
        <div>
            <img src={nibib} style={{ width: '200px', marginTop: "5pt", marginBottom: "5pt" }}/>
        </div>
    </div>
);

const refs = (
    <ul style={{ marginBottom: "0pt", listStyleType: "none" }}>
        <li className="cmReference">
            Montin E, Carluccio G, Collins C and Lattanzi R, <em>A web-accessible tool for temperature estimation from SAR simulations (TESS)</em>; 30th Scientific Meeting of the International Society for Magnetic Resonance in Medicine (ISMRM). London (UK), 07-12 May 2022, p. 582.
        </li>
        <li className="cmReference">
            Montin E, Deniz CM, Cantarelli Rodrigues T, Gyftopoulos S, Kijowski R and Lattanzi R, <em>Automatic Segmentation Of The Hip Bony Structures On 3D Dixon MRI Datasets Using Transfer Learning From A Neural Network Developed For The Shoulder</em>; 30th Scientific Meeting of the International Society for Magnetic Resonance in Medicine (ISMRM). London (UK), 07-12 May 2022, p. 1412.
        </li>
        <li className="cmReference">
            Montin E, Georgakis IP, Zhang B and Lattanzi R, <em>A software tool to assess radiofrequency coil designs with respect to ultimate intrinsic performance limits</em>; 30th Scientific Meeting of the International Society for Magnetic Resonance in Medicine (ISMRM). London (UK), 07-12 May 2022, p. 2780.
        </li>
        <li className="cmReference">
            Montin E, Carluccio G and Lattanzi R, <em>A web-accessible tool for rapid analytical simulations of MR coils via cloud computing</em>; 29th Scientific Meeting of the International Society for Magnetic Resonance in Medicine (ISMRM). Virtual Conference, 15-20 May 2021, p. 3756.
        </li>
        <li className="cmReference">
            Montin E, Carluccio G, Collins C and Lattanzi R, <em>CAMRIE – Cloud-Accessible MRI Emulator</em>; 28th Scientific Meeting of the International Society for Magnetic Resonance in Medicine (ISMRM). Virtual Conference, 08-14 August 2020, p. 1037.
        </li>
        <li className="cmReference">
            Montin E, Wiggins R, Block KT and Lattanzi R, <em>MR Optimum – A web-based application for signal-to-noise ratio evaluation</em>; 27th Scientific Meeting of the International Society for Magnetic Resonance in Medicine (ISMRM). Montreal (Canada), 11-16 May 2019, p. 4617.
        </li>
    </ul>
);

const publications = (
    <ul style={{ marginBottom: "0pt", listStyleType: "none" }}>
        <li className="cmReference">
            Montin E and <span style={{ fontWeight: "bold" }}>Lattanzi R</span>, <em>Seeking a widely adoptable practical standard to estimate signal-to-noise ratio in magnetic resonance imaging for multiple-coil reconstructions</em>; Journal of Magnetic Resonance Imaging, vol 54(6), 2021, p. 1952-1964. <a href="https://doi.org/10.1002/jmri.27816">DOI: 10.1002/jmri.27816</a>
        </li>
    </ul>
);


export default AboutPage;