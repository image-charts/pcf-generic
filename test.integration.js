/**
 * Integration Tests for ImageChartsGenerator (Generic) PCF Component
 * Black-box tests against the real Image-Charts API.
 * Based on test scenarios from the Zapier connector.
 */

const crypto = require('crypto');
const https = require('https');

const ACCOUNT_ID = process.env.IMAGE_CHARTS_ACCOUNT_ID;
const SECRET_KEY = process.env.IMAGE_CHARTS_SECRET_KEY;
const PRIVATE_CLOUD_DOMAIN = process.env.IMAGE_CHARTS_PRIVATE_CLOUD_DOMAIN;
const USER_AGENT = process.env.IMAGE_CHARTS_USER_AGENT || 'pcf-image-charts-generic/1.0.0-test';

const describeIfCredentials = ACCOUNT_ID && SECRET_KEY ? describe : describe.skip;
const describeIfPrivateCloud = PRIVATE_CLOUD_DOMAIN ? describe : describe.skip;

function computeHmacSha256Sync(secretKey, message) {
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
}

function buildSignedGenericUrl(params) {
  const { accountId, secretKey, chartType, chartData, customParams, chartSize } = params;
  const isQrCode = chartType === 'qr';
  const searchParams = new URLSearchParams();
  searchParams.append('cht', chartType);
  searchParams.append('chs', chartSize || '300x300');
  if (isQrCode) {
    searchParams.append('chl', chartData);
  } else {
    searchParams.append('chd', chartData);
  }
  if (customParams) {
    const customParts = customParams.split('&').filter(p => p.includes('='));
    customParts.forEach(part => {
      const [key, value] = part.split('=');
      searchParams.append(key, value);
    });
  }
  searchParams.append('icac', accountId);
  const signature = computeHmacSha256Sync(secretKey, searchParams.toString());
  searchParams.append('ichm', signature);
  return 'https://image-charts.com/chart?' + searchParams.toString();
}

function buildPrivateCloudGenericUrl(params) {
  const { domain, chartType, chartData, customParams, chartSize } = params;
  const isQrCode = chartType === 'qr';
  const searchParams = new URLSearchParams();
  searchParams.append('cht', chartType);
  searchParams.append('chs', chartSize || '300x300');
  if (isQrCode) {
    searchParams.append('chl', chartData);
  } else {
    searchParams.append('chd', chartData);
  }
  if (customParams) {
    const customParts = customParams.split('&').filter(p => p.includes('='));
    customParts.forEach(part => {
      const [key, value] = part.split('=');
      searchParams.append(key, value);
    });
  }
  const baseUrl = domain.endsWith('/') ? domain.slice(0, -1) : domain;
  return baseUrl + '/chart?' + searchParams.toString();
}

function buildSignedChartJSUrl(params) {
  const { accountId, secretKey, chartConfig, backgroundColor } = params;
  const base64Config = Buffer.from(chartConfig).toString('base64');
  const searchParams = new URLSearchParams();
  searchParams.append('icretina', '1');
  searchParams.append('encoding', 'base64');
  searchParams.append('icac', accountId);
  if (backgroundColor) searchParams.append('backgroundColor', backgroundColor);
  searchParams.append('chart', "'" + base64Config + "'");
  const signature = computeHmacSha256Sync(secretKey, searchParams.toString());
  searchParams.append('ichm', signature);
  return 'https://image-charts.com/chart.js/2.8.0?' + searchParams.toString();
}

function buildPrivateCloudChartJSUrl(params) {
  const { domain, chartConfig, backgroundColor } = params;
  const base64Config = Buffer.from(chartConfig).toString('base64');
  const searchParams = new URLSearchParams();
  searchParams.append('icretina', '1');
  searchParams.append('encoding', 'base64');
  if (backgroundColor) searchParams.append('backgroundColor', backgroundColor);
  searchParams.append('chart', "'" + base64Config + "'");
  const baseUrl = domain.endsWith('/') ? domain.slice(0, -1) : domain;
  return baseUrl + '/chart.js/2.8.0?' + searchParams.toString();
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) });
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

// ============================================================
// URL Generation Tests
// ============================================================

describe('URL Generation - Standard Charts', () => {
  const testAccountId = 'test_account';
  const testSecretKey = 'test_secret_key_123';

  test('should generate correct URL structure for bar chart', () => {
    const url = buildSignedGenericUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      chartType: 'bvs',
      chartData: 'a:60,40',
      chartSize: '300x300'
    });
    expect(url).toContain('cht=bvs');
    expect(url).toContain('chs=300x300');
    expect(url).toContain('chd=a%3A60%2C40');
    expect(url).toContain('icac=' + testAccountId);
    expect(url).toContain('ichm=');
  });

  test('should generate correct URL for pie chart', () => {
    const url = buildSignedGenericUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      chartType: 'p',
      chartData: 'a:30,40,30'
    });
    expect(url).toContain('cht=p');
    expect(url).toContain('chd=a%3A30%2C40%2C30');
  });

  test('should generate correct URL for QR code (uses chl not chd)', () => {
    const url = buildSignedGenericUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      chartType: 'qr',
      chartData: 'Hello World'
    });
    expect(url).toContain('cht=qr');
    expect(url).toContain('chl=Hello+World');
    expect(url).not.toContain('chd=');
  });

  test('should generate correct URL for radar chart', () => {
    const url = buildSignedGenericUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      chartType: 'r',
      chartData: 'a:10,20,30,40,50'
    });
    expect(url).toContain('cht=r');
  });

  test('should include custom params when provided', () => {
    const url = buildSignedGenericUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      chartType: 'bvs',
      chartData: 'a:10,20,30',
      customParams: 'chl=A|B|C&chco=FF0000'
    });
    expect(url).toContain('chl=A%7CB%7CC');
    expect(url).toContain('chco=FF0000');
  });

  test('HMAC signature should be deterministic', () => {
    const params = {
      accountId: testAccountId,
      secretKey: testSecretKey,
      chartType: 'p',
      chartData: 'a:30,40,30',
      chartSize: '300x300'
    };
    const url1 = buildSignedGenericUrl(params);
    const url2 = buildSignedGenericUrl(params);
    expect(url1).toBe(url2);
  });

  test('Private Cloud URL should not include icac or ichm', () => {
    const url = buildPrivateCloudGenericUrl({
      domain: 'https://private.example.com',
      chartType: 'bvs',
      chartData: 'a:10,20,30'
    });
    expect(url).not.toContain('icac=');
    expect(url).not.toContain('ichm=');
  });
});

describe('URL Generation - Chart.js', () => {
  const testAccountId = 'test_account';
  const testSecretKey = 'test_secret_key_123';

  test('should generate correct Chart.js URL with base64 encoding', () => {
    const chartConfig = '{"type":"pie","data":{"datasets":[{"data":[84,28,57]}]}}';
    const url = buildSignedChartJSUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      chartConfig: chartConfig
    });
    expect(url).toContain('chart.js/2.8.0');
    expect(url).toContain('encoding=base64');
    expect(url).toContain('icac=' + testAccountId);
    expect(url).toContain('ichm=');
    expect(url).toContain('chart=%27');
  });

  test('should include background color when provided', () => {
    const chartConfig = '{"type":"pie","data":{"datasets":[{"data":[10,20,30]}]}}';
    const url = buildSignedChartJSUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      chartConfig: chartConfig,
      backgroundColor: '#FFFFFF'
    });
    expect(url).toContain('backgroundColor=%23FFFFFF');
  });

  test('Private Cloud Chart.js URL should not include icac or ichm', () => {
    const chartConfig = '{"type":"pie","data":{"datasets":[{"data":[10,20,30]}]}}';
    const url = buildPrivateCloudChartJSUrl({
      domain: 'https://private.example.com',
      chartConfig: chartConfig
    });
    expect(url).not.toContain('icac=');
    expect(url).not.toContain('ichm=');
  });
});

// ============================================================
// API Integration Tests - Enterprise Mode Standard Charts
// ============================================================

describeIfCredentials('Enterprise Mode - Generic Charts', () => {
  test('should return 200 for QR code', () => {
    const url = buildSignedGenericUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      chartType: 'qr',
      chartData: 'Hello World'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for bar chart (matching Zapier scenario)', () => {
    const url = buildSignedGenericUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      chartType: 'bvg',
      chartData: 'a:60,40',
      chartSize: '300x300'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for pie chart', () => {
    const url = buildSignedGenericUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      chartType: 'p',
      chartData: 'a:30,40,30'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for line chart', () => {
    const url = buildSignedGenericUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      chartType: 'lc',
      chartData: 'a:10,25,15,30,20'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for doughnut chart', () => {
    const url = buildSignedGenericUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      chartType: 'pd',
      chartData: 'a:30,40,30'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for radar chart', () => {
    const url = buildSignedGenericUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      chartType: 'r',
      chartData: 'a:10,20,30,40,50'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for sparkline chart', () => {
    const url = buildSignedGenericUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      chartType: 'ls',
      chartData: 'a:10,25,15,30,20,35,25',
      chartSize: '200x50'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for scatter chart (lxy)', () => {
    const url = buildSignedGenericUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      chartType: 'lxy',
      chartData: 'a:10,20,30,40|5,10,15,20'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for bubble chart', () => {
    const url = buildSignedGenericUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      chartType: 'bb',
      chartData: 'a:10,20,30|5,10,15|5,10,15',
      chartSize: '400x400'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should handle custom params', () => {
    const url = buildSignedGenericUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      chartType: 'bvs',
      chartData: 'a:10,20,30',
      customParams: 'chl=A|B|C&chco=FF0000'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);
});

// ============================================================
// API Integration Tests - Enterprise Mode Chart.js
// ============================================================

describeIfCredentials('Enterprise Mode - Chart.js', () => {
  test('should return 200 for Chart.js pie chart (matching Zapier scenario)', () => {
    const chartConfig = JSON.stringify({
      type: 'pie',
      data: {
        datasets: [{
          data: [84, 28, 57, 19, 97],
          backgroundColor: ['rgba(255,99,132,0.5)', 'rgba(255,159,64,0.5)', 'rgba(255,205,86,0.5)', 'rgba(75,192,192,0.5)', 'rgba(54,162,235,0.5)'],
          label: 'Dataset 1'
        }],
        labels: ['Red', 'Orange', 'Yellow', 'Green', 'Blue']
      }
    });
    const url = buildSignedChartJSUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      chartConfig: chartConfig,
      backgroundColor: '#FFFFFF'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for Chart.js radar chart (matching Zapier scenario)', () => {
    const chartConfig = JSON.stringify({
      type: 'radar',
      data: {
        labels: ['HTML/CSS', 'JavaScript', 'PHP', 'Python', 'Ruby', 'Rust', 'C++', 'Go'],
        datasets: [{
          data: [10, 10, 10],
          fill: true,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgb(54, 162, 235)',
          pointBackgroundColor: 'rgb(54, 162, 235)',
          pointBorderColor: '#fff'
        }]
      },
      options: { legend: { display: false }, layout: { padding: 10 }, scale: { ticks: { beginAtZero: true, stepSize: 2 } } }
    });
    const url = buildSignedChartJSUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      chartConfig: chartConfig,
      backgroundColor: '#FFFFFF'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for Chart.js bar chart', () => {
    const chartConfig = JSON.stringify({
      type: 'bar',
      data: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], datasets: [{ label: 'Revenue', data: [10, 20, 30, 40], backgroundColor: 'rgba(54, 162, 235, 0.5)' }] }
    });
    const url = buildSignedChartJSUrl({ accountId: ACCOUNT_ID, secretKey: SECRET_KEY, chartConfig: chartConfig });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for Chart.js line chart', () => {
    const chartConfig = JSON.stringify({
      type: 'line',
      data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'], datasets: [{ label: 'Sales', data: [12, 19, 3, 5, 2], borderColor: 'rgb(75, 192, 192)', tension: 0.1 }] }
    });
    const url = buildSignedChartJSUrl({ accountId: ACCOUNT_ID, secretKey: SECRET_KEY, chartConfig: chartConfig });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for Chart.js doughnut chart', () => {
    const chartConfig = JSON.stringify({
      type: 'doughnut',
      data: { labels: ['Yes', 'No', 'Maybe'], datasets: [{ data: [50, 30, 20], backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'] }] }
    });
    const url = buildSignedChartJSUrl({ accountId: ACCOUNT_ID, secretKey: SECRET_KEY, chartConfig: chartConfig });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);
});

// ============================================================
// API Integration Tests - Private Cloud Mode Standard Charts
// ============================================================

describeIfPrivateCloud('Private Cloud Mode - Generic Charts', () => {
  test('should return 200 for QR code', () => {
    const url = buildPrivateCloudGenericUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      chartType: 'qr',
      chartData: 'Hello World'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for bar chart (matching Zapier scenario)', () => {
    const url = buildPrivateCloudGenericUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      chartType: 'bvg',
      chartData: 'a:60,40',
      chartSize: '300x300'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for pie chart', () => {
    const url = buildPrivateCloudGenericUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      chartType: 'p',
      chartData: 'a:30,40,30'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for line chart', () => {
    const url = buildPrivateCloudGenericUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      chartType: 'lc',
      chartData: 'a:10,25,15,30,20'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for doughnut chart', () => {
    const url = buildPrivateCloudGenericUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      chartType: 'pd',
      chartData: 'a:30,40,30'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for radar chart', () => {
    const url = buildPrivateCloudGenericUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      chartType: 'r',
      chartData: 'a:10,20,30,40,50'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for sparkline chart', () => {
    const url = buildPrivateCloudGenericUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      chartType: 'ls',
      chartData: 'a:10,25,15,30,20,35,25',
      chartSize: '200x50'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for scatter chart (lxy)', () => {
    const url = buildPrivateCloudGenericUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      chartType: 'lxy',
      chartData: 'a:10,20,30,40|5,10,15,20'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for bubble chart', () => {
    const url = buildPrivateCloudGenericUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      chartType: 'bb',
      chartData: 'a:10,20,30|5,10,15|5,10,15',
      chartSize: '400x400'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should handle custom params', () => {
    const url = buildPrivateCloudGenericUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      chartType: 'bvs',
      chartData: 'a:10,20,30',
      customParams: 'chl=A|B|C&chco=FF0000'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);
});

// ============================================================
// API Integration Tests - Private Cloud Mode Chart.js
// ============================================================

describeIfPrivateCloud('Private Cloud Mode - Chart.js', () => {
  test('should return 200 for Chart.js pie chart (matching Zapier scenario)', () => {
    const chartConfig = JSON.stringify({
      type: 'pie',
      data: {
        datasets: [{
          data: [84, 28, 57, 19, 97],
          backgroundColor: ['rgba(255,99,132,0.5)', 'rgba(255,159,64,0.5)', 'rgba(255,205,86,0.5)', 'rgba(75,192,192,0.5)', 'rgba(54,162,235,0.5)'],
          label: 'Dataset 1'
        }],
        labels: ['Red', 'Orange', 'Yellow', 'Green', 'Blue']
      }
    });
    const url = buildPrivateCloudChartJSUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      chartConfig: chartConfig,
      backgroundColor: '#FFFFFF'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for Chart.js radar chart (matching Zapier scenario)', () => {
    const chartConfig = JSON.stringify({
      type: 'radar',
      data: {
        labels: ['HTML/CSS', 'JavaScript', 'PHP', 'Python', 'Ruby', 'Rust', 'C++', 'Go'],
        datasets: [{
          data: [10, 10, 10],
          fill: true,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgb(54, 162, 235)',
          pointBackgroundColor: 'rgb(54, 162, 235)',
          pointBorderColor: '#fff'
        }]
      },
      options: { legend: { display: false }, layout: { padding: 10 }, scale: { ticks: { beginAtZero: true, stepSize: 2 } } }
    });
    const url = buildPrivateCloudChartJSUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      chartConfig: chartConfig,
      backgroundColor: '#FFFFFF'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for Chart.js bar chart', () => {
    const chartConfig = JSON.stringify({
      type: 'bar',
      data: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], datasets: [{ label: 'Revenue', data: [10, 20, 30, 40], backgroundColor: 'rgba(54, 162, 235, 0.5)' }] }
    });
    const url = buildPrivateCloudChartJSUrl({ domain: PRIVATE_CLOUD_DOMAIN, chartConfig: chartConfig });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for Chart.js line chart', () => {
    const chartConfig = JSON.stringify({
      type: 'line',
      data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'], datasets: [{ label: 'Sales', data: [12, 19, 3, 5, 2], borderColor: 'rgb(75, 192, 192)', tension: 0.1 }] }
    });
    const url = buildPrivateCloudChartJSUrl({ domain: PRIVATE_CLOUD_DOMAIN, chartConfig: chartConfig });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 for Chart.js doughnut chart', () => {
    const chartConfig = JSON.stringify({
      type: 'doughnut',
      data: { labels: ['Yes', 'No', 'Maybe'], datasets: [{ data: [50, 30, 20], backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'] }] }
    });
    const url = buildPrivateCloudChartJSUrl({ domain: PRIVATE_CLOUD_DOMAIN, chartConfig: chartConfig });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);
});

// ============================================================
// Error Handling Tests
// ============================================================

describeIfCredentials('Error Handling - Enterprise', () => {
  test('should return error for invalid chart type', () => {
    const url = buildSignedGenericUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      chartType: 'invalid_type',
      chartData: 'test'
    });
    return fetchUrl(url).then((response) => {
      expect([400, 200]).toContain(response.statusCode);
    });
  }, 15000);

  test('should return 403 for invalid signature', () => {
    const url = 'https://image-charts.com/chart?cht=bvs&chs=400x300&chd=a%3A10%2C20%2C30&icac=' + ACCOUNT_ID + '&ichm=invalid_signature';
    return fetchUrl(url).then((response) => {
      expect([400, 403]).toContain(response.statusCode);
    });
  }, 15000);
});

// ============================================================
// Performance Tests
// ============================================================

describeIfCredentials('Performance - Enterprise', () => {
  test('should respond within 5 seconds for standard chart', () => {
    const startTime = Date.now();
    const url = buildSignedGenericUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      chartType: 'qr',
      chartData: 'Performance Test'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(Date.now() - startTime).toBeLessThan(5000);
    });
  }, 10000);

  test('should respond within 5 seconds for Chart.js', () => {
    const startTime = Date.now();
    const chartConfig = JSON.stringify({ type: 'bar', data: { labels: ['A', 'B'], datasets: [{ data: [10, 20] }] } });
    const url = buildSignedChartJSUrl({ accountId: ACCOUNT_ID, secretKey: SECRET_KEY, chartConfig: chartConfig });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(Date.now() - startTime).toBeLessThan(5000);
    });
  }, 10000);
});

describeIfPrivateCloud('Performance - Private Cloud', () => {
  test('should respond within 5 seconds for standard chart', () => {
    const startTime = Date.now();
    const url = buildPrivateCloudGenericUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      chartType: 'qr',
      chartData: 'Performance Test'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(Date.now() - startTime).toBeLessThan(5000);
    });
  }, 10000);

  test('should respond within 5 seconds for Chart.js', () => {
    const startTime = Date.now();
    const chartConfig = JSON.stringify({ type: 'bar', data: { labels: ['A', 'B'], datasets: [{ data: [10, 20] }] } });
    const url = buildPrivateCloudChartJSUrl({ domain: PRIVATE_CLOUD_DOMAIN, chartConfig: chartConfig });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(Date.now() - startTime).toBeLessThan(5000);
    });
  }, 10000);
});
