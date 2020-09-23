import { Logger } from "named-logs";
export declare type CLogger = Logger & {
    level: number;
    traceLevel: number;
    enabled: boolean;
};
export declare const logs: {
    (namespace: string): CLogger;
    level: number;
    traceLevel: number;
    setTraceLevelFor: (namespace: string, newLevel: number) => void;
    disable: () => void;
    enable: (namespaces?: string) => void;
};
export declare function replaceConsole(namespace?: string): Console;
//# sourceMappingURL=index.d.ts.map