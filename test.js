/**
 * Unit Tests for ImageChartsGenerator (Generic) PCF Component
 */

const crypto = require('crypto');

function computeHmacSha256Sync(secretKey, message) {
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
}

function isValidHostname(hostname) {
  if (!hostname) return false;
  const trimmed = hostname.trim();
  if (trimmed.length > 253) return false;
  const hostnameRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*$/;
  return hostnameRegex.test(trimmed);
}

function buildGenericChartUrl(params) {
  const { accountId, secretKey, privateCloudDomain, chartType, chartData, customParams, chartSize } = params;
  const host = privateCloudDomain || 'image-charts.com';

  const queryParts = ['cht=' + chartType, 'chs=' + (chartSize || '300x300'), 'chd=' + chartData];

  // Parse and add custom params
  if (customParams) {
    const customParts = customParams.split('&').filter(p => p.includes('='));
    queryParts.push(...customParts);
  }

  if (accountId && !privateCloudDomain) queryParts.push('icac=' + accountId);

  const queryString = queryParts.join('&');

  if (accountId && secretKey && !privateCloudDomain) {
    const signature = computeHmacSha256Sync(secretKey, queryString);
    return 'https://' + host + '/chart?' + queryString + '&ichm=' + signature;
  }
  return 'https://' + host + '/chart?' + queryString;
}

describe('Generic Chart URL Building', () => {
  test('should build QR code URL', () => {
    const url = buildGenericChartUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      chartType: 'qr',
      chartData: 'https://example.com',
      chartSize: '300x300'
    });

    expect(url).toContain('cht=qr');
    expect(url).toContain('chd=https://example.com');
    expect(url).toContain('ichm=');
  });

  test('should build bar chart URL', () => {
    const url = buildGenericChartUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      chartType: 'bvs',
      chartData: 'a:10,20,30,40'
    });

    expect(url).toContain('cht=bvs');
    expect(url).toContain('chd=a:10,20,30,40');
  });

  test('should build pie chart URL', () => {
    const url = buildGenericChartUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      chartType: 'p',
      chartData: 'a:30,40,30'
    });

    expect(url).toContain('cht=p');
  });

  test('should include custom params', () => {
    const url = buildGenericChartUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      chartType: 'bvs',
      chartData: 'a:10,20,30',
      customParams: 'chl=Q1|Q2|Q3&chco=FF0000'
    });

    expect(url).toContain('chl=Q1|Q2|Q3');
    expect(url).toContain('chco=FF0000');
  });

  test('should handle Private Cloud mode', () => {
    const url = buildGenericChartUrl({
      privateCloudDomain: 'charts.mycompany.com',
      chartType: 'qr',
      chartData: 'Test'
    });

    expect(url).toContain('https://charts.mycompany.com/chart');
    expect(url).not.toContain('ichm=');
    expect(url).not.toContain('icac=');
  });
});

describe('Hostname Validation', () => {
  test('should validate correct hostnames', () => {
    expect(isValidHostname('charts.example.com')).toBe(true);
    expect(isValidHostname('my-charts.company.io')).toBe(true);
    expect(isValidHostname('localhost')).toBe(true);
  });

  test('should reject invalid hostnames', () => {
    expect(isValidHostname('')).toBe(false);
    expect(isValidHostname(null)).toBe(false);
    expect(isValidHostname('http://example.com')).toBe(false);
    expect(isValidHostname('-invalid.com')).toBe(false);
  });
});

describe('Supported Chart Types', () => {
  const chartTypes = [
    { type: 'qr', name: 'QR Code' },
    { type: 'bvs', name: 'Vertical Bar' },
    { type: 'bhs', name: 'Horizontal Bar' },
    { type: 'p', name: 'Pie' },
    { type: 'pd', name: 'Doughnut' },
    { type: 'lc', name: 'Line' },
    { type: 'ls', name: 'Sparkline' },
    { type: 'gm', name: 'Google-o-meter' },
    { type: 'r', name: 'Radar' }
  ];

  chartTypes.forEach(({ type, name }) => {
    test('should build URL for ' + name + ' chart (cht=' + type + ')', () => {
      const url = buildGenericChartUrl({
        accountId: 'test',
        secretKey: 'test',
        chartType: type,
        chartData: type === 'qr' ? 'Test' : 'a:10,20,30'
      });

      expect(url).toContain('cht=' + type);
    });
  });
});
