
# @image-charts/pcf-generic

[![npm version](https://img.shields.io/npm/v/%40image-charts/pcf-generic.svg)](https://www.npmjs.com/package/@image-charts/pcf-generic)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Generate **any** [Image-Charts](https://image-charts.com) chart type directly in Microsoft Power Apps Canvas Apps

The generic component supports all Image-Charts chart types through the `chartType` and `chartData` properties.

## Quick Start

```bash
npm install @image-charts/pcf-generic
```

Import `node_modules/@image-charts/pcf-generic/solution/ImageChartsGeneric.zip` into Power Apps.

```powerapps-fx
// QR Code
ImageChartsGenerator.chartType = "qr"
ImageChartsGenerator.chartData = "https://example.com"
ImageChartsGenerator.customParams = "chs=300x300"

// Bar Chart  
ImageChartsGenerator.chartType = "bvs"
ImageChartsGenerator.chartData = "a:10,20,30,40"
ImageChartsGenerator.customParams = "chs=400x300&chl=Q1|Q2|Q3|Q4"
```

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `accountId` | Text | No* | Enterprise Account ID |
| `secretKey` | Text | No* | Enterprise Secret Key |
| `privateCloudDomain` | Text | No* | Private Cloud domain |
| `chartType` | Text | **Yes** | Image-Charts `cht` parameter (e.g., `qr`, `bvs`, `p`, `lc`) |
| `chartData` | Text | **Yes** | Image-Charts `chd` parameter |
| `customParams` | Text | No | Additional parameters (`key=value&key2=value2`) |
| `chartSize` | Text | No | Size (`WIDTHxHEIGHT`) |
| `advancedOptions` | Text | No | More parameters |
| `showDebugUrl` | Boolean | No | Display generated URL |
| `signedUrl` | Text | Output | Generated URL |

## Supported Chart Types

| Type | Description |
|------|-------------|
| `qr` | QR Code |
| `bvs` | Vertical Bar Chart |
| `bhs` | Horizontal Bar Chart |
| `p` | Pie Chart |
| `pd` | Doughnut Chart |
| `lc` | Line Chart |
| `ls` | Sparkline |
| `gm` | Google-o-meter |
| `r` | Radar Chart |

See full list at [Image-Charts Documentation](https://documentation.image-charts.com/reference/chart-type/)

## Documentation

[https://documentation.image-charts.com/integrations/power-apps/](https://documentation.image-charts.com/integrations/power-apps/)

## License

MIT
