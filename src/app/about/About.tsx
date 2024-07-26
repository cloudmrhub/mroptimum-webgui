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
        <div className="m-4 row" id={'about-root'} style={{justifyContent: 'center', display: 'flex'}}>
            <div className="col-md-6">
                <div className="card">
                    <div className="card-header p-2">About</div>

                    <div className="m-5">
                        <div className="container py-1">
                            <p className="cmTitle">MR Optimum</p>
                            {description}
                        </div>
                        <div className="container py-1">
                            <p className="cmTitle">Documentation</p>
                            {doc}
                        </div>
                        <div className="container py-1">
                            <p className="cmTitle">Acknowledgement of Funding Support</p>
                            {funding}
                        </div>
                        <div className="container py-1">
                            <p className="cmTitle">References </p>
                            {refs}
                        </div>
                        <div className="container py-1">
                            <p className="cmTitle">Publications citing MR Optimum</p>
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
            MR Optimum is a web-based application for the evaluation of MR image quality in terms of signal-to-noise ratio (SNR). It provides standardized access to the most common methods for SNR calculation.
            <ul style={{ marginBottom: "0px" }}>
                <li><b>Developers</b>:
                <ul style={{ marginBottom: "0px" }}>
                    <li><a href="https://med.nyu.edu/faculty/riccardo-lattanzi" target="_blank">Riccardo Lattanzi, PhD</a></li>
                    <li><a href="https://github.com/erosmontin" target="_blank">Eros Montin, PhD</a></li>
                    <li><a href="https://cai2r.net/about/team/#roy-wiggins" target="_blank">Roy Wiggins</a></li>
                    <li><a href="https://https://github.com/YuelongLi" target="_blank">Yuelong Li</a></li>
                </ul>
                </li>
            </ul>
        </div>
    </div>
);

const doc = (
    <div className="cmParagraph">
        <div className="cmText">
            Our python sources are available <a href="https://github.com/cloudmrhub-com/cloudmrhub" target="_blank">here</a>. User manuals and video tutorials will be available in the future.
        </div>
    </div>
);

const funding = (
    <div>
        <div className="cmParagraph">
            <div className="cmText">
                MR Optimum is available through the Cloud MR software application framework. This research project is supported by the National Institute of Biomedical Imaging and Bioengineering (<a href="https://www.nibib.nih.gov/" target="_blank">NIBIB</a>) of the National Institutes of Health (<a href="https://www.nih.gov/" target="_blank">NIH</a>) under Award Number R01 EB024536. The content is solely the responsibility of the authors and does not necessarily represent the official views of the National Institutes of Health.
            </div>
        </div>

    </div>
);

const refs = (
    <ul style={{ marginBottom: "0pt", listStyleType: "none" }}>
            <li className="cmReference">
        Montin E and Lattanzi R <em>Seeking a widely adoptable practical standard to estimate signal-to-noise ratio in magnetic resonance imaging for multiple-coil reconstructions</em>; Journal of Magnetic Resonance Imaging, vol 54(6), 2021, p. 1952-1964. <a href="https://doi.org/10.1002/jmri.27816">DOI: 10.1002/jmri.27816</a>
    </li>
    </ul>
);

const publications = (
    <ul style={{ marginBottom: "0pt", listStyleType: "none" }}>

    <li className="cmReference">
        Zubkov, M. (2021). <em>Editorial for “Seeking a Widely Adoptable Practical Standard to Estimate Signal‐to‐Noise Ratio in Magnetic Resonance Imaging for Multiple‐Coil Reconstructions.”</em> In Journal of Magnetic Resonance Imaging (Vol. 54, Issue 6, pp. 1965–1966). Wiley. <a href="https://doi.org/10.1002/jmri.27819">DOI: 10.1002/jmri.27819</a>
    </li>
    <li className="cmReference">
        Testagrossa, B., Ruello, E., Gurgone, S. et al. (2021). <em>Radio Frequency MRI coils and safety: how infrared thermography can support quality assurance.</em> Egypt J Radiol Nucl Med 52, 277. <a href="https://doi.org/10.1186/s43055-021-00659-y">DOI: 10.1186/s43055-021-00659-y</a>
    </li>
    <li className="cmReference">
        Lakshmanan, K., Wang, B., Walczyk, J., Collins, C. M., & Brown, R. (2024). <em>Three-row MRI receive array with remote circuitry to preserve radiation transparency.</em> In Physics in Medicine & Biology (Vol. 69, Issue 9, p. 09NT02). IOP Publishing. <a href="https://doi.org/10.1088/1361-6560/ad388c">DOI: 10.1088/1361-6560/ad388c</a>
    </li>
    <li className="cmReference">
        Berkarda, Z., Wiedemann, S., Wilpert, C., Strecker, R., Koerzdoerfer, G., Nickel, D., Bamberg, F., Benndorf, M., Mayrhofer, T., Frederik Russe, M., Weiss, J., & Diallo, T. D. (2024). <em>Deep learning reconstructed T2-weighted Dixon imaging of the spine: Impact on acquisition time and image quality.</em> In European Journal of Radiology (p. 111633). Elsevier BV. <a href="https://doi.org/10.1016/j.ejrad.2024.111633">DOI: 10.1016/j.ejrad.2024.111633</a>
    </li>
    <li className="cmReference">
        Obermann, M., Nohava, L., Frass-Kriegl, R., Soanca, O., Ginefri, J. C., Felblinger, J., Clauser, P., Baltzer, P. A. T., & Laistler, E. (2023). <em>Panoramic Magnetic Resonance Imaging of the Breast With a Wearable Coil Vest.</em> Investigative radiology, 58(11), 799–810. <a href="https://doi.org/10.1097/RLI.0000000000000991">DOI: 10.1097/RLI.0000000000000991</a>
    </li>
    <li className="cmReference">
        Wang, B., Siddiq, S.S., Walczyk, J. et al. (2022). <em>A flexible MRI coil based on a cable conductor and applied to knee imaging.</em> Sci Rep 12, 15010. <a href="https://doi.org/10.1038/s41598-022-19282-6">DOI: 10.1038/s41598-022-19282-6</a>
    </li>
    <li className="cmReference">
        McKeown, Trevor. (2022). <em>Continuous MRI Coil Quality Control using Clinical Imaging Data</em>, Duke University, United States -- North Carolina. ProQuest. <a href="http://proxy.library.nyu.edu/login?qurl=https%3A%2F%2Fwww.proquest.com%2Fdissertations-theses%2Fcontinuous-mri-coil-quality-control-using%2Fdocview%2F2677619898%2Fse-2%3Faccountid%3D12768">Link to Dissertation</a>
    </li>
</ul>
);

export default AboutPage;