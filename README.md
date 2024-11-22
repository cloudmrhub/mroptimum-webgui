# MR Optimum Frontend: Web-Based Graphical User Interface (WebGUI)

**MR Optimum** is an advanced tool for simulating, computing, and analyzing MRI signal-to-noise ratio (SNR) across various reconstruction methods. This repository contains the source code for the web-based graphical user interface (WebGUI)

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Technologies](#technologies)
4. [Setup Instructions](#setup-instructions)
5. [Usage](#usage)
6. [License](#license)

---

## Overview
The **WebGUI** is designed for researchers and clinicians to:
- Configure and run SNR calculations.
- Upload and manage datasets.
- Visualize and analyze results.

---


## Features

### Settings Tab
- Select SNR calculation methods:
  - Array Combining (AC)
  - Multiple Replicas
  - Pseudo Multiple Replicas
  - Pseudo multiple Replicas Wien version
- Seleect reconstruciton methods:
  - Root Sum of Squares (RSS)
  - B1
  - SENSE
  - GRAPPA


### Results Tab
- Monitor queued job statuses.
- Access previously computed results.
- Visualize and analyze results:
  - ROI selection.
  - Histogram visualizzation.
  - Exporting figures and data.

### Interactive Visualizations
- Draw regions of interest (ROIs).
- Extract and export pixel-wise SNR values and statistics.

---

## Technologies

The frontend is built with:
- **React.js**: Core framework for UI development.
- **Material-UI**: For modern, responsive components.
- **Redux**: State management for seamless user interaction.
- **Axios**: For API communication with the backend (Managing System).

Additional dependencies are included to support interactive plots and file uploads.

---

## Setup Instructions

### Prerequisites
- **Node.js**: Version 16+  
- **yarn**: For managing dependencies  

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-organization/mr-optimum-frontend.git
   cd mr-optimum-frontend
   ````
1. Install dependencies
   ``` bash
   yarn install
   ```
1. Run
   ```bash
   yarn start
   ```

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.


## Usage
### Running Jobs
1. Log in with your credentials.
1. Navigate to the Settings tab.
1. Configure the desired SNR calculation method and upload data.
1. Submit the job to the queue.
### Viewing Results
1. Go to the Results tab.
1. Check the status of ongoing computations.
1. Load completed jobs for visualization and analysis.

## License
This project is licensed under the MIT License.

For detailed information on the theory behind MR Optimum and its computation methods, see:

1. Montin E., Lattanzi R. "Seeking a Widely Adoptable Practical Standard to Estimate Signal-to-Noise Ratio in Magnetic Resonance Imaging for Multiple-Coil Reconstructions". Journal of Magnetic Resonance Imaging, 2021.
1. [ISMRM 27<sup>th</sup> Annual Meeting & Exhibition, 11-16 May 2019](https://cds.ismrm.org/protected/19MProceedings/PDFfiles/4617.html) Palais des congrès de Montréal, 1001 Place Jean-Paul-Riopelle, Montréal, QC, Canada\
Abstract #4617 MR Optimum – A web-based application for signal-to-noise ratio evaluation. 






[*Dr. Eros Montin, PhD*]\
(http://me.biodimensional.com)\
**46&2 just ahead of me!**