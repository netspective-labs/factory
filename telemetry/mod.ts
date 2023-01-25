export type UntypedBaggage = Record<string, unknown>;

export interface Instrumentable<Baggage> {
  readonly mark: () => PerformanceMark;
  readonly measure: () => Instrument<Baggage>;
  readonly baggage?: Baggage;
}

export interface Instrument<Baggage> extends Instrumentable<Baggage> {
  readonly performanceMeasure: PerformanceMeasure;
}

export type InstrumentIdentity = string;

export interface InstrumentationOptions<Baggage> {
  readonly identity?: InstrumentIdentity;
  readonly baggage?: Baggage;
}

export interface InstrumentationSupplier<Baggage> {
  readonly instruments: Instrument<Baggage>[];
}

export interface Instrumentation<Baggage>
  extends InstrumentationSupplier<Baggage> {
  readonly prepareInstrument: (
    options?: InstrumentationOptions<Baggage>,
  ) => Instrumentable<Baggage>;
}

export class Telemetry<Baggage> implements Instrumentation<Baggage> {
  readonly instruments: Instrument<Baggage>[] = [];

  constructor(readonly prefix?: InstrumentIdentity) {
  }

  prepareInstrument(
    options?: InstrumentationOptions<Baggage>,
  ): Instrumentable<Baggage> {
    const identity = options?.identity ||
      `instrument_${this.instruments.length}`;
    const name = this.prefix ? `${this.prefix}${identity}` : identity;
    const mark = performance.mark(identity, { detail: options?.baggage });
    const result: Instrumentable<Baggage> = {
      mark: () => mark,
      measure: () => {
        const performanceMeasure = performance.measure(name, {
          detail: options?.baggage,
          start: mark.startTime,
        });
        const instrument = {
          ...result,
          performanceMeasure,
        };
        this.instruments.push(instrument);
        return instrument;
      },
      baggage: options?.baggage,
    };
    result.mark();
    return result; // it's the responsibility of the caller to later call result.measure()
  }
}
