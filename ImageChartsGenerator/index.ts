/**
 * ImageChartsGenerator - Generic Image-Charts PCF Component
 * Supports all chart types through chartType and customParams properties
 * @version 1.0.0
 */

import { IInputs, IOutputs } from "./generated/ManifestTypes";
import {
  computeHmacSha256Sync, isValidHostname,
  debounce, loadImageWithRetry, createErrorPlaceholder,
  DEFAULT_DEBOUNCE_MS, DEFAULT_TIMEOUT_MS
} from "../shared/image-charts-utils";

export class ImageChartsGenerator implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private _container!: HTMLDivElement;
  private _imgElement!: HTMLImageElement;
  private _debugElement: HTMLDivElement | null = null;
  private _signedUrl: string = "";
  private _notifyOutputChanged!: () => void;
  private _isLoading: boolean = false;
  private _debouncedUpdate!: (context: ComponentFramework.Context<IInputs>) => void;

  public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
    this._notifyOutputChanged = notifyOutputChanged;
    this._container = container;
    this._container.className = 'image-charts-generic-container';
    this._imgElement = document.createElement("img");
    this._imgElement.className = 'image-charts-generic';
    this._container.appendChild(this._imgElement);
    this._debouncedUpdate = debounce((ctx) => this._performUpdate(ctx), DEFAULT_DEBOUNCE_MS);
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void { this._debouncedUpdate(context); }

  private _performUpdate(context: ComponentFramework.Context<IInputs>): void {
    const accountId = context.parameters.accountId?.raw || "";
    const secretKey = context.parameters.secretKey?.raw || "";
    const privateCloudDomain = context.parameters.privateCloudDomain?.raw || "";
    const chartType = context.parameters.chartType?.raw || "";
    const chartData = context.parameters.chartData?.raw || "";
    const customParams = context.parameters.customParams?.raw || "";
    const chartSize = context.parameters.chartSize?.raw || "300x300";
    const advancedOptions = context.parameters.advancedOptions?.raw || "";
    const showDebugUrl = context.parameters.showDebugUrl?.raw || false;
    const errorPlaceholderUrl = context.parameters.errorPlaceholderUrl?.raw || "";

    if (!chartType) { this._showError("Missing chart type (cht)", errorPlaceholderUrl); return; }
    if (!chartData) { this._showError("Missing chart data (chd)", errorPlaceholderUrl); return; }
    const isEnterpriseMode = accountId && secretKey;
    const isPrivateCloudMode = privateCloudDomain && isValidHostname(privateCloudDomain);
    if (!isEnterpriseMode && !isPrivateCloudMode) { this._showError("Missing authentication", errorPlaceholderUrl); return; }

    const url = this._buildChartUrl({ accountId, secretKey, privateCloudDomain, chartType, chartData, customParams, chartSize, advancedOptions });
    this._signedUrl = url;
    this._loadImage(url, errorPlaceholderUrl);
    this._updateDebugDisplay(showDebugUrl, url);
    this._notifyOutputChanged();
  }

  private _buildChartUrl(params: any): string {
    const host = params.privateCloudDomain || 'image-charts.com';
    const queryParts: string[] = [`cht=${params.chartType}`, `chs=${params.chartSize}`, `chd=${params.chartData}`];

    // Parse and add custom params (key=value&key2=value2 format)
    if (params.customParams) {
      const customParts = params.customParams.split('&').filter((p: string) => p.includes('='));
      queryParts.push(...customParts);
    }

    // Parse and add advanced options (key=value&key2=value2 format)
    if (params.advancedOptions) {
      const advParts = params.advancedOptions.split('&').filter((p: string) => p.includes('='));
      queryParts.push(...advParts);
    }

    if (params.accountId && !params.privateCloudDomain) queryParts.push(`icac=${params.accountId}`);
    const qs = queryParts.join('&');
    if (params.accountId && params.secretKey && !params.privateCloudDomain) {
      return `https://${host}/chart?${qs}&ichm=${computeHmacSha256Sync(params.secretKey, qs)}`;
    }
    return `https://${host}/chart?${qs}`;
  }

  private _loadImage(url: string, errorPlaceholderUrl: string): void {
    if (this._isLoading) return;
    this._isLoading = true;
    this._clearError();
    loadImageWithRetry(url, { maxRetries: 3, totalTimeout: DEFAULT_TIMEOUT_MS })
      .then(() => { this._imgElement.src = url; this._imgElement.style.display = 'block'; this._isLoading = false; })
      .catch((e: Error) => { this._showError(e.message, errorPlaceholderUrl); this._isLoading = false; });
  }

  private _showError(msg: string, url: string): void {
    this._imgElement.style.display = 'none'; this._signedUrl = "";
    const ex = this._container.querySelector('.image-charts-error'); if (ex) ex.remove();
    this._container.appendChild(createErrorPlaceholder(msg, url || undefined));
    this._notifyOutputChanged();
  }

  private _clearError(): void { const e = this._container.querySelector('.image-charts-error'); if (e) e.remove(); }

  private _updateDebugDisplay(show: boolean, url: string): void {
    if (show) {
      if (!this._debugElement) { this._debugElement = document.createElement('div'); this._debugElement.className = 'image-charts-debug-url'; this._container.appendChild(this._debugElement); }
      this._debugElement.textContent = url; this._debugElement.style.display = 'block';
    } else if (this._debugElement) { this._debugElement.style.display = 'none'; }
  }

  public getOutputs(): IOutputs { return { signedUrl: this._signedUrl }; }
  public destroy(): void {}
}
