import { Logger } from 'named-logs';
export type CLogger = Logger & {
    namespace: string;
    decoration?: string;
    level: number;
    traceLevel: number;
    enabled: boolean;
};
export declare const factory: {
    (namespace: string, options?: {
        decoration?: string;
    }): CLogger;
    level: number;
    traceLevel: number;
    labelVisible: boolean;
    setTraceLevelFor: (namespace: string, newLevel: number) => void;
    disable: () => void;
    enable: (namespaces?: string) => void;
};
export declare function replaceConsole(namespace?: string): Console;
export declare function hookup(): void;
//# sourceMappingURL=index.d.ts.map