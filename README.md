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

## E2E Testing with Playwright

Playwright E2E tests live in `tests/` and use TypeScript.

### Install Playwright

1. Install dependencies:
   ```bash
   npm install
   ```
2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

### Required Environment Variables

Set login credentials in your shell before running tests:

```bash
export E2E_EMAIL="your-email@example.com"
export E2E_PASSWORD="your-password"
```

Optional variables:

```bash
export ENV=local
export E2E_LOCAL_BASE_URL="http://localhost:4001"
export E2E_PROD_BASE_URL="https://mro.aws.cloudmrhub.com/main"
export USE_AUTH_STATE=1
export E2E_INVALID_EMAIL="wrong@example.com"
export E2E_INVALID_PASSWORD="wrong-password"
```

`ENV` supports:
- `local`: defaults to `http://localhost:5173`
- `prod`: defaults to `https://mro.aws.cloudmrhub.com/main`

Note: this repo's `start` script uses `http://localhost:4001`. If you want Playwright to target that running dev server instead of its default local URL, set `E2E_LOCAL_BASE_URL=http://localhost:4001`.


### Run Tests

Run against local:

```bash
E2E_EMAIL="er@g" E2E_PASSWORD="esm*f5B" E2E_INVALID_EMAIL="g@example.com" E2E_INVALID_PASSWORD="wrong-password" ENV=local E2E_LOCAL_BASE_URL="http://localhost:4001" npx playwright test tests/home.full.spec.ts
```

Run against production:

```bash
ENV=prod npm run test:e2e
```

Open the Playwright UI:

```bash
ENV=local npm run test:e2e:ui
```

Run headed:

```bash
ENV=local npm run test:e2e:headed
```

### Optional Auth State Reuse

Generate a reusable authenticated session:

```bash
ENV=local USE_AUTH_STATE=1 npx playwright test --project=setup
```

Then reuse that saved session in future runs:

```bash
ENV=local USE_AUTH_STATE=1 npm run test:e2e
```


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
