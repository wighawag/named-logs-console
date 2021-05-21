declare type Logger = {
    readonly assert: (condition?: boolean, ...data: any[]) => void;
    readonly error: (...data: any[]) => void;
    readonly warn: (...data: any[]) => void;
    readonly info: (...data: any[]) => void;
    readonly log: (...data: any[]) => void;
    readonly debug: (...data: any[]) => void;
    readonly dir: (item?: any, options?: any) => void;
    readonly table: (tabularData?: any, properties?: string[]) => void;
    readonly trace: (...data: any[]) => void;
};
declare type CLogger = Logger & {
    level: number;
    traceLevel: number;
    enabled: boolean;
};
declare type G = Record<string, unknown> & {
    console: Console;
    location: Location;
};
declare const noop: () => undefined;
declare const W: G;
declare const oldConsole: Console;
declare const disabledRegexps: RegExp[];
declare const enabledRegexps: RegExp[];
declare function bindCall<T>(logFunc: (...args: T[]) => void, logger: CLogger, localTraceLevel: number, level: number): (...args: T[]) => void;
declare const loggers: {
    [namespace: string]: CLogger;
};
declare const logs: {
    (namespace: string): CLogger;
    level: number;
    traceLevel: number;
    setTraceLevelFor: (namespace: string, newLevel: number) => void;
    disable: () => void;
    enable: (namespaces?: string) => void;
};
declare const logLevels: {
    [name: string]: number;
};
declare function enabled(name: string, { disabledRegexps, enabledRegexps }: {
    disabledRegexps: RegExp[];
    enabledRegexps: RegExp[];
}): boolean;
declare function processNamespaces(namespaces: string, { disabledRegexps, enabledRegexps }: {
    disabledRegexps: RegExp[];
    enabledRegexps: RegExp[];
}, func: (namespace: string, enabled: boolean) => void): void;
declare const vars: string[];
//# sourceMappingURL=index.d.ts.map