import { Sink } from '../sinks/types';
import { createConsoleSink } from '../sinks/console';
import { ConfigClient, ConfigResponse } from '../config';
import { createTransport, TransportManager } from '../transport';
import { createCapture, CaptureResult } from './capture';
import { PROTOCOL_VERSION, SDK_INFO, LogLevel, createEventId } from '../events/envelope';

function parseMajorVersion(version: string): number {
  const parts = version.split('.');
  return parseInt(parts[0], 10) || 0;
}

function checkProtocolCompatibility(serverVersion: string): 'normal' | 'degraded-sdk-ahead' | 'degraded-server-ahead' | 'blocked' {
  const sdkMajor = parseMajorVersion(PROTOCOL_VERSION);
  const serverMajor = parseMajorVersion(serverVersion);

  if (sdkMajor === serverMajor) {
    return 'normal';
  }

  const diff = Math.abs(sdkMajor - serverMajor);

  if (diff > 1) {
    return 'blocked';
  }

  if (serverMajor > sdkMajor) {
    return 'degraded-server-ahead';
  }

  return 'degraded-sdk-ahead';
}

export interface SignalOptions {
  projectKey?: string;
  environment?: string;
  baseUrl?: string;
  configCacheTtlMs?: number;
  sink?: Sink;
}

export class Signal {
  private static instance: Signal | null = null;

  private options: Required<SignalOptions>;
  private sink: Sink;
  private configClient: ConfigClient | null = null;
  private transport: TransportManager | null = null;
  private capture: ReturnType<typeof createCapture>;
  private enabled: boolean = true;
  private static versionWarningShown: boolean = false;

  private constructor(options: SignalOptions) {
    const baseUrl = options.baseUrl || 'https://ingest.axius.pro';
    if (!baseUrl.startsWith('https://')) {
      throw new Error('baseUrl must use HTTPS protocol');
    }
    this.options = {
      projectKey: options.projectKey || '',
      environment: options.environment || 'production',
      baseUrl,
      configCacheTtlMs: options.configCacheTtlMs || 300000,
      sink: options.sink || createConsoleSink(),
    };
    this.sink = this.options.sink;
    this.capture = createCapture({
      projectKey: this.options.projectKey,
      environment: this.options.environment,
      sink: this.sink,
      transport: null,
    });
  }

  static init(options: SignalOptions = {}): Signal {
    if (Signal.instance) {
      Signal.instance.configure(options);
      return Signal.instance;
    }
    Signal.instance = new Signal(options);
    Signal.instance.startTransportAsync();
    return Signal.instance;
  }

  private async startTransportAsync(): Promise<void> {
    if (!this.options.projectKey) {
      return;
    }

    this.configClient = new ConfigClient(
      this.options.baseUrl,
      this.options.projectKey,
      this.options.configCacheTtlMs
    );

    let config: ConfigResponse;
    try {
      config = await this.configClient.getConfig();
    } catch {
      config = { tier: 'free', telemetry_enabled: true, volume_limit: 1000, volume_used: 0, downgraded: false, protocol_version: '0.1.0' };
    }

    const compatibility = checkProtocolCompatibility(config.protocol_version);

    if (compatibility === 'blocked') {
      this.sink.write({
        protocol_version: PROTOCOL_VERSION,
        project_key: this.options.projectKey,
        event_id: 'internal',
        event_type: 'log',
        timestamp: new Date().toISOString(),
        sdk: { ...SDK_INFO },
        environment: 'internal',
        payload: {
          level: 'error',
          message: `Protocol version mismatch: SDK ${PROTOCOL_VERSION} is incompatible with server ${config.protocol_version}. Telemetry sending blocked.`,
          context: {},
        },
      });
      return;
    }

    if (compatibility === 'degraded-sdk-ahead') {
      if (!Signal.versionWarningShown) {
        Signal.versionWarningShown = true;
        this.sink.write({
          protocol_version: PROTOCOL_VERSION,
          project_key: this.options.projectKey,
          event_id: 'internal',
          event_type: 'log',
          timestamp: new Date().toISOString(),
          sdk: { ...SDK_INFO },
          environment: 'internal',
          payload: {
            level: 'warn',
            message: `SDK protocol version ${PROTOCOL_VERSION} is ahead of server ${config.protocol_version}. Deprecation warning.`,
            context: {},
          },
        });
      }
    }

    if (compatibility === 'degraded-server-ahead') {
      this.sink.write({
        protocol_version: PROTOCOL_VERSION,
        project_key: this.options.projectKey,
        event_id: 'internal',
        event_type: 'log',
        timestamp: new Date().toISOString(),
        sdk: { ...SDK_INFO },
        environment: 'internal',
        payload: {
          level: 'info',
          message: `Server protocol version ${config.protocol_version} is ahead of SDK ${PROTOCOL_VERSION}. SDK will send using its compiled version.`,
          context: {},
        },
      });
    }

    if (config.telemetry_enabled) {
      this.transport = createTransport(
        this.options.baseUrl,
        this.options.projectKey,
        this.configClient,
        this.sink
      );
      this.transport.start();
      this.capture = createCapture({
        projectKey: this.options.projectKey,
        environment: this.options.environment,
        sink: this.sink,
        transport: this.transport,
      });
    }
  }

  configure(options: Partial<SignalOptions>): void {
    const transportRunning = this.transport !== null;

    if (options.projectKey !== undefined) {
      if (transportRunning) {
        this.sink.write({
          protocol_version: PROTOCOL_VERSION,
          project_key: this.options.projectKey,
          event_id: createEventId(),
          event_type: 'log',
          timestamp: new Date().toISOString(),
          sdk: { ...SDK_INFO },
          environment: 'internal',
          payload: { level: 'debug', message: 'projectKey change ignored: transport is already running', context: {} },
        });
      } else {
        this.options.projectKey = options.projectKey;
      }
    }
    if (options.environment !== undefined) {
      this.options.environment = options.environment;
    }
    if (options.baseUrl !== undefined) {
      if (transportRunning) {
        this.sink.write({
          protocol_version: PROTOCOL_VERSION,
          project_key: this.options.projectKey,
          event_id: createEventId(),
          event_type: 'log',
          timestamp: new Date().toISOString(),
          sdk: { ...SDK_INFO },
          environment: 'internal',
          payload: { level: 'debug', message: 'baseUrl change ignored: transport is already running', context: {} },
        });
      } else {
        this.options.baseUrl = options.baseUrl;
      }
    }
    if (options.configCacheTtlMs !== undefined) {
      this.options.configCacheTtlMs = options.configCacheTtlMs;
    }
    if (options.sink !== undefined) {
      this.options.sink = options.sink;
      this.sink = options.sink;
      this.capture = createCapture({
        projectKey: this.options.projectKey,
        environment: this.options.environment,
        sink: this.sink,
        transport: this.transport,
      });
    }
  }

  captureError(error: unknown, context?: Record<string, unknown>): CaptureResult {
    if (!this.enabled) {
      return { eventId: '' };
    }
    return this.capture.captureError(error, context);
  }

  captureLog(level: LogLevel, message: string, context?: Record<string, unknown>): CaptureResult {
    if (!this.enabled) {
      return { eventId: '' };
    }
    return this.capture.captureLog(level, message, context);
  }

  disable(): void {
    this.enabled = false;
  }

  enable(): void {
    this.enabled = true;
  }

  async flush(): Promise<void> {
    if (this.transport) {
      await this.transport.flush();
    }
  }
}
