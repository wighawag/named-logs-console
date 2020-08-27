import {hook, Logger} from "named-logs";

export type CLogger = Logger & {
  level: number;
  traceLevel: number;
  enabled: boolean;
};

const noop = () => undefined;
const oldConsole = window.console;

function bindCall(logFunc: (...args: any[]) => void, localLevel: number, localTraceLevel: number, level: number) {
  if (localLevel >= level || logs.level >= level) {
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

export const logs = (namespace: string): CLogger => {
  const logger = loggers[namespace];
  if (logger) {
    return logger;
  }
  let level = logs.level;
  let traceLevel = logs.traceLevel;
  return loggers[namespace] = {
    get assert() {
      return bindCall(oldConsole.assert, level, Number.MAX_SAFE_INTEGER, 1)
    },
    get error() {
      return bindCall(oldConsole.error, level, traceLevel, 1)
    },
    get warn() {
      return bindCall(oldConsole.warn, level, traceLevel, 2)
    },
    get info() {
      return bindCall(oldConsole.info, level, traceLevel, 3)
    },
    get log() {
      return bindCall(oldConsole.log, level, traceLevel, 4)
    },
    get debug() {
      return bindCall(oldConsole.debug, level, traceLevel, 5)
    },
    get trace() {
      return bindCall(oldConsole.trace, level, traceLevel, 6)
    },
    get level() {return level;},
    set level(newLevel: number){
      level = newLevel;
    },
    get traceLevel() {return traceLevel;},
    set traceLevel(newLevel: number) {
      traceLevel = newLevel;
    },
    enabled: true
  };
}

function process(namespaces: string, func: (namespace: string, enabled: boolean) => void) {
  const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
  const len = split.length;
  for (let i = 0; i < len; i++) {
    if (!split[i]) {
      // ignore empty strings
      continue;
    }

    namespaces = split[i].replace(/\*/g, '.*?');

    const disabledRegexps: RegExp[] = [];
    const enabledRegexps: RegExp[] = [];
    if (namespaces[0] === '-') {
      disabledRegexps.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      enabledRegexps.push(new RegExp('^' + namespaces + '$'));
    }
    function enabled(name: string): boolean {
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
          return true;
        }
      }
      return false;
    }

    
    for (const namespace of Object.keys(loggers)) { 
			func(namespace, enabled(namespace));
		}
  }
}

// error:1, warn:2, info:3, log:4, debug:5, trace:6
logs.level = 2;
logs.traceLevel = 6;
logs.setTraceLevelFor = (namespaces: string, newLevel: number) => {
  process(namespaces || "*", (namespace, enabled) => {
    if (enabled) {
      loggers[namespace].traceLevel = newLevel;
    }
  });
}
logs.disable = () => {
  for (const namespace of Object.keys(loggers)) {
    loggers[namespace].enabled = false;
  }
}
logs.enable = (namespaces?: string) => {
  process(namespaces || "*", (namespace, enabled) => loggers[namespace].enabled = enabled);
}

export function replaceConsole(namespace?: string): Console {
  (window as any).console = logs(namespace || 'console');
  return oldConsole;
}

hook(logs);
