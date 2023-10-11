export const snrDescriptions:{[key:string]:string} = {
    'ac':`This method is applicable to root-sum-of-squares magnitude combining, B1-weighted combining, and 
        SENSE parallel imaging. $$SNR_{RSS} = \\sqrt{2(p^H\\Psi ^{-1}p)}$$
        $$SNR_{B1}=\\sqrt{2}\\frac{b^H\\Psi_{scaled}^{-1}p}{b^H\\Psi_{scaled}^{-1}b}$$
         $$SNR_{SENSE} = \\sqrt{2}\\frac{|u^Tp|}{\\sqrt{u\\Psi^{-1}_{scaled}u^T}}$$
          Where the superscript \\(^T\\) and \\(^H\\) indicate the transpose and the conjugate of the transpose, respectively; 
          \\(b\\) is the vector of complex coil sensitivity, \\(p\\) is the vector of complex image values for each coil, and u is the vector of complex coil unmixing coefficients for the SENSE reconstruction.`,
    'mr':`The SNR is calculated on a pixel-by-pixel basis as the ratio of the average (signal) and standard deviation (noise) 
        of pixel values through a stack of equivalent image replicas. The replicas can be generated with different image reconstruction
         techniques. A noise reference scan could be used to estimate the noise correlation between the elements of a phased array.`,
    'pmr':`The SNR is calculated on a pixel-by-pixel basis as the ratio of the average (signal) and standard deviation (noise) of pixel values through a stack of image pseudo 
        replicas, which are generated via a Monte Carlo technique 
        from k-space data from a single MR acquisition. The pseudo replicas can be generated with different image reconstruction techniques. A noise reference scan could
         be used to estimate the noise correlation between the elements of a phased array.`,
    'cr':`"A SNR estimation approach that is a hybrid of the NEMA two-acquisition method and the pseudo-multiple replica method. 
        An estimate of the image noise is determined using noise variations in space (similar to the NEMA technique) between a 
        reconstruction of the acquired data and a separate reconstruction of that same data with pseudo-noise added (similar to the pseudo-multiple replica technique)."
`
}