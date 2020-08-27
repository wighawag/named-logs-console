import {hook, Logger} from "named-logs";

export type CLogger = Logger & {
  level: number;
  traceLevel: number;
  enabled: boolean;
};

const noop = () => undefined;
const oldConsole = window.console;

const disabledRegexps: RegExp[] = [];
const enabledRegexps: RegExp[] = [];

function bindCall(logFunc: (...args: any[]) => void, logger: CLogger, localTraceLevel: number, level: number) {
  if (logger.enabled && (logger.level >= level || logs.level >= level)) {
    if (localTraceLevel <= level || logs.traceLevel <= level) {
      return oldConsole.trace.bind(oldConsole);
    } else {
      return logFunc.bind(oldConsole);
    }
  } else {
    return noop;
  }
}

const loggers: {[namespace: string]: CLogger} = {};

export const logs : {
  (namespace: string): CLogger;
  level: number;
  traceLevel: number;
  setTraceLevelFor: (namespace: string, newLevel: number) => void;
  disable: () => void;
  enable: (namespaces?: string) => void;
} = (namespace: string): CLogger => {
  let logger = loggers[namespace];
  if (logger) {
    return logger;
  }
  let level = logs.level;
  let traceLevel = logs.traceLevel;
  
  return logger = loggers[namespace] = {
    get assert() {
      return bindCall(oldConsole.assert, logger, Number.MAX_SAFE_INTEGER, 1)
    },
    get error() {
      return bindCall(oldConsole.error, logger, traceLevel, 1)
    },
    get warn() {
      return bindCall(oldConsole.warn, logger, traceLevel, 2)
    },
    get info() {
      return bindCall(oldConsole.info, logger, traceLevel, 3)
    },
    get log() {
      return bindCall(oldConsole.log, logger, traceLevel, 4)
    },
    get debug() {
      return bindCall(oldConsole.debug, logger, traceLevel, 5)
    },
    get trace() {
      return bindCall(oldConsole.trace, logger, traceLevel, 6)
    },
    get level() {return level;},
    set level(newLevel: number){
      level = newLevel;
    },
    get traceLevel() {return traceLevel;},
    set traceLevel(newLevel: number) {
      traceLevel = newLevel;
    },
    enabled: enabled(namespace, {disabledRegexps, enabledRegexps})
  };
}

const logLevels: {[name: string]: number} = {error:1, warn:2, info:3, log:4, debug:5, trace:6};

logs.level = 2
logs.traceLevel = 6;

logs.setTraceLevelFor = (namespaces: string, newLevel: number) => {
  process(namespaces || "*", {disabledRegexps: [], enabledRegexps: []},(namespace, enabled) => {
    if (enabled) {
      loggers[namespace].traceLevel = newLevel;
    }
  });
}
logs.disable = () => {
  disabledRegexps.splice(0, disabledRegexps.length);
  enabledRegexps.splice(0, enabledRegexps.length);
  for (const namespace of Object.keys(loggers)) {
    loggers[namespace].enabled = false;
  }
}
logs.enable = (namespaces?: string) => {
  disabledRegexps.splice(0, disabledRegexps.length);
  enabledRegexps.splice(0, enabledRegexps.length);
  process(namespaces || "*", {disabledRegexps, enabledRegexps}, (namespace, enabled) => loggers[namespace].enabled = enabled);
}

function enabled(name: string, {disabledRegexps, enabledRegexps}: {disabledRegexps: RegExp[]; enabledRegexps: RegExp[]}): boolean {
  if (name[name.length - 1] === '*') {
    return true;
  }

  let i;
  let len;
  for (i = 0, len = disabledRegexps.length; i < len; i++) {
    if (disabledRegexps[i].test(name)) {
      return false;
    }
  }

  for (i = 0, len = enabledRegexps.length; i < len; i++) {
    if (enabledRegexps[i].test(name)) {
      oldConsole.log({name, regex: enabledRegexps[i]});
      return true;
    }
  }
  return false;
}


function process(
  namespaces: string,
  {disabledRegexps, enabledRegexps}: {disabledRegexps: RegExp[]; enabledRegexps: RegExp[]},
  func: (namespace: string, enabled: boolean) => void
) {
  const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
  const len = split.length;

  for (let i = 0; i < len; i++) {
    if (!split[i]) {
      // ignore empty strings
      continue;
    }

    namespaces = split[i].replace(/\*/g, '.*?');

    if (namespaces[0] === '-') {
      disabledRegexps.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      enabledRegexps.push(new RegExp('^' + namespaces + '$'));
    }
  }
  
  for (const namespace of Object.keys(loggers)) { 
    func(namespace, enabled(namespace, {disabledRegexps, enabledRegexps}));
  }
}

export function replaceConsole(namespace?: string): Console {
  (window as any).console = logs(namespace || '*');
  return oldConsole;
}

hook(logs);


try{
  const str = localStorage.getItem("debug");
  if (str) {
    logs.enable(str);
  }
} catch(e) {}

const vars = location.search.slice(1).split("&");
for (const variable of vars) {
  if (variable.startsWith("debug=")) {
    logs.enable(variable.slice(6));
  } else if (variable.startsWith("log=")) {
    const val = variable.slice(4);
    logs.level = (logLevels[val] || parseInt(val) || logs.level) as number;
  } else if (variable.startsWith("trace=")) {
    const val = variable.slice(6);
    logs.traceLevel = (logLevels[val] || parseInt(val) || logs.level) as number;
  }
}
