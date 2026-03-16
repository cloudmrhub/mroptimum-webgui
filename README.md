# MR Optimum Frontend: Web-Based Graphical User Interface (WebGUI)

**MR Optimum** is an advanced tool for computing, and analyzing MRI signal-to-noise ratio (SNR) across various reconstruction methods. This repository contains the source code for the web-based graphical user interface (WebGUI)

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
  - Analytic Methods (AM)
  - Multiple Replicas
  - Pseudo Multiple Replicas
  - Pseudo Multiple Replicas Wien
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
   git clone https://github.com/cloudmrhub/mroptimum-webgui
   cd mroptimum-webgui
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
Open [http://localhost:4001](http://localhost:4001) to view it in the browser.


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
