import * as https from 'https';

export interface ConfigResponse {
  tier: string;
  telemetry_enabled: boolean;
  volume_limit: number | null;
  volume_used: number;
  downgraded: boolean;
  protocol_version: string;
}

const DEFAULT_CONFIG: ConfigResponse = {
  tier: 'free',
  telemetry_enabled: true,
  volume_limit: 1000,
  volume_used: 0,
  downgraded: false,
  protocol_version: '0.1.0',
};

interface CachedConfig {
  data: ConfigResponse;
  expiresAt: number;
}

export class ConfigClient {
  private baseUrl: string;
  private projectKey: string;
  private cache: CachedConfig | null = null;
  private cacheTtlMs: number;

  constructor(baseUrl: string, projectKey: string, cacheTtlMs: number = 300000) {
    if (!baseUrl.startsWith('https://')) {
      throw new Error('baseUrl must use HTTPS protocol');
    }
    this.baseUrl = baseUrl;
    this.projectKey = projectKey;
    this.cacheTtlMs = cacheTtlMs;
  }

  async getConfig(): Promise<ConfigResponse> {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.data;
    }
    return this.refreshConfig();
  }

  async refreshConfig(): Promise<ConfigResponse> {
    try {
      const config = await this.fetchConfig();
      this.cache = {
        data: config,
        expiresAt: Date.now() + this.cacheTtlMs,
      };
      return config;
    } catch {
      if (this.cache) {
        return this.cache.data;
      }
      return { ...DEFAULT_CONFIG };
    }
  }

  private fetchConfig(): Promise<ConfigResponse> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(this.baseUrl);
      const normalisedPath = urlObj.pathname.replace(/\/+$/, '');
      const configPath = `${normalisedPath}/config`;

      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port ? parseInt(urlObj.port, 10) : 443,
        path: configPath,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.projectKey}`,
          Accept: 'application/json',
        },
        timeout: 10000,
        rejectUnauthorized: true,
      };
      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const body = Buffer.concat(chunks).toString('utf-8');
            try {
              const data = JSON.parse(body);
              resolve({
                tier: data.tier || DEFAULT_CONFIG.tier,
                telemetry_enabled: data.telemetry_enabled !== undefined ? data.telemetry_enabled : DEFAULT_CONFIG.telemetry_enabled,
                volume_limit: data.volume_limit !== undefined ? data.volume_limit : DEFAULT_CONFIG.volume_limit,
                volume_used: data.volume_used || DEFAULT_CONFIG.volume_used,
                downgraded: data.downgraded || DEFAULT_CONFIG.downgraded,
                protocol_version: data.protocol_version || DEFAULT_CONFIG.protocol_version,
              });
            } catch {
              reject(new Error('Invalid config response JSON'));
            }
          } else {
            reject(new Error(`Config endpoint returned status ${res.statusCode}`));
          }
        });
      });
      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Config endpoint request timed out'));
      });
      req.end();
    });
  }

  isCacheValid(): boolean {
    return this.cache !== null && Date.now() < this.cache.expiresAt;
  }

  clearCache(): void {
    this.cache = null;
  }
}
