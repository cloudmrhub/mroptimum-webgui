export const snrDescriptions:{[key:string]:string} = {
    'ac':`This method is applicable to root-sum-of-squares magnitude coil combinations, B1-weighted coil combinations, and SENSE parallel imaging reconstructions. $$SNR_{RSS} = \\sqrt{2(p^H\\Psi ^{-1}p)}$$
        $$SNR_{B1}=\\sqrt{2}\\frac{b^H\\Psi_{scaled}^{-1}p}{b^H\\Psi_{scaled}^{-1}b}$$
         $$SNR_{SENSE} = \\sqrt{2}\\frac{|u^Tp|}{\\sqrt{u\\Psi^{-1}_{scaled}u^T}}$$
          Where the superscript \\(^T\\) and \\(^H\\) indicate the transpose and the conjugate of the transpose, respectively; 
          \\(b\\) is the vector of complex coil sensitivity, \\(p\\) is the vector of complex image values for each coil, and u is the vector of complex coil unmixing coefficients for the SENSE reconstruction.
          

    $$\\newline$$

          Kellman P, McVeigh ER. Image reconstruction in SNR units: a general method for SNR measurement.  Magn Reson Med. 2005 Dec;54(6):1439-47. 
            doi: 10.1002/mrm.20713. Erratum in: Magn Reson Med. 2007 Jul;58(1):211-2`,
    'mr':`The SNR is calculated on a pixel-by-pixel basis as the ratio of the average (signal) and standard deviation (noise) 
        of pixel values through a stack of equivalent image replicas. The replicas can be generated with any image reconstruction technique. A noise reference scan could be used to estimate the noise correlation between the elements of a received array.`,
    'pmr':`The SNR is calculated on a pixel-by-pixel basis as the ratio of the average (signal) and standard deviation (noise) of pixel values through a stack of image pseudo replicas, which are generated via a Monte Carlo technique from k-space data from a single MR acquisition. The pseudo replicas can be generated with any image reconstruction technique. A noise reference scan could be used to estimate the noise correlation between the elements of a received array.
    $$\\newline$$
    Robson PM, Grant AK, Madhuranthakam AJ, Lattanzi R, Sodickson DK, McKenzie CA. Comprehensive quantification of signal-to-noise ratio and g-factor for image-based and k-space-based parallel imaging reconstructions. Magn Reson Med. 2008 Oct;60(4):895-907`,
    'cr':`This SNR estimation approach is a hybrid of the NEMA two-acquisition method and the pseudo multiple replica method. An estimate of the image noise is determined using noise variations in space (similar to the NEMA technique) between a reconstruction of the acquired data and a separate reconstruction of that same data with pseudo-noise added (similar to the pseudo multiple replica technique). $$\\newline$$
    Wiens CN, Kisch SJ, Willig-Onwuachi JD, McKenzie CA. Computationally rapid method of estimating signal-to-noise ratio for phased array image reconstructions. Magn Reson Med. 2011 Oct;66(4):1192-7.`
}