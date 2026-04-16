#!/usr/bin/env node
/**
 * Post-install script for @image-charts/pcf-generic
 */

const path = require('path');
const fs = require('fs');

const packageDir = path.dirname(__dirname);
const solutionPath = path.join(packageDir, 'solution', 'ImageChartsGeneric.zip');

console.log(`
===============================================================================
  Image-Charts Generic Chart Generator for Power Apps
===============================================================================

The PCF solution has been installed successfully!

This component supports ALL Image-Charts chart types through the chartType property.

NEXT STEPS:

1. MANUAL IMPORT (Recommended for Production):
   - Go to https://make.powerapps.com
   - Select your environment
   - Navigate to Solutions > Import
   - Select the solution file:
     ${solutionPath}

2. DIRECT PUSH (For Development):
   - First, authenticate with your Power Platform environment:
     pac auth create --url https://your-org.crm.dynamics.com

   - Then push the component:
     npx @image-charts/pcf-generic push --publisher-prefix ic

SUPPORTED CHART TYPES:
  qr   - QR Code
  bvs  - Vertical Bar Chart
  bhs  - Horizontal Bar Chart
  p    - Pie Chart
  pd   - Doughnut Chart
  lc   - Line Chart
  ls   - Sparkline
  gm   - Google-o-meter
  r    - Radar Chart

DOCUMENTATION:
  https://documentation.image-charts.com/integrations/power-apps/

SUPPORT:
  https://github.com/image-charts/pcf-generic/issues

===============================================================================
`);

if (fs.existsSync(solutionPath)) {
  console.log('Solution file verified at:', solutionPath);
} else {
  console.warn('WARNING: Solution file not found. You may need to build it first.');
  console.log('Run: npm run build');
}
