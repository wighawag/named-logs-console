"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hookup = exports.replaceConsole = exports.logs = void 0;
const named_logs_1 = require("named-logs");
const noop = () => undefined;
const W = (typeof window !== 'undefined' ? window : globalThis);
const oldConsole = W.console;
const disabledRegexps = [];
const enabledRegexps = [];
function bindCall(logFunc, logger, localTraceLevel, level) {
    if (logger.enabled && (logger.level >= level || exports.logs.level >= level)) {
        if (localTraceLevel <= level || exports.logs.traceLevel <= level) {
            return oldConsole.trace.bind(oldConsole);
        }
        else {
            return logFunc.bind(oldConsole);
        }
    }
    else {
        return noop;
    }
}
const loggers = {};
const logs = (namespace) => {
    let logger = loggers[namespace];
    if (logger) {
        return logger;
    }
    let level = exports.logs.level;
    let traceLevel = exports.logs.traceLevel;
    return (logger = loggers[namespace] =
        {
            get assert() {
                return bindCall(oldConsole.assert, logger, traceLevel, 1);
            },
            get error() {
                return bindCall(oldConsole.error, logger, traceLevel, 1);
            },
            get warn() {
                return bindCall(oldConsole.warn, logger, traceLevel, 2);
            },
            get info() {
                return bindCall(oldConsole.info, logger, traceLevel, 3);
            },
            get log() {
                return bindCall(oldConsole.log, logger, traceLevel, 4);
            },
            get debug() {
                return bindCall(oldConsole.debug, logger, traceLevel, 5);
            },
            get trace() {
                return bindCall(oldConsole.trace, logger, traceLevel, 6);
            },
            get dir() {
                return bindCall(oldConsole.dir, logger, traceLevel, 5);
            },
            get table() {
                return bindCall(oldConsole.table || oldConsole.debug, logger, traceLevel, 5);
            },
            get level() {
                return level;
            },
            set level(newLevel) {
                level = newLevel;
            },
            get traceLevel() {
                return traceLevel;
            },
            set traceLevel(newLevel) {
                traceLevel = newLevel;
            },
            enabled: enabled(namespace, { disabledRegexps, enabledRegexps }),
        });
};
exports.logs = logs;
const logLevels = { error: 1, warn: 2, info: 3, log: 4, debug: 5, trace: 6 };
exports.logs.level = 2;
exports.logs.traceLevel = 6;
exports.logs.setTraceLevelFor = (namespaces, newLevel) => {
    processNamespaces(namespaces || '*', { disabledRegexps: [], enabledRegexps: [] }, (namespace, enabled) => {
        if (enabled) {
            loggers[namespace].traceLevel = newLevel;
        }
    });
};
exports.logs.disable = () => {
    disabledRegexps.splice(0, disabledRegexps.length);
    enabledRegexps.splice(0, enabledRegexps.length);
    for (const namespace of Object.keys(loggers)) {
        loggers[namespace].enabled = false;
    }
    try {
        localStorage.removeItem('debug');
    }
    catch (e) { }
};
exports.logs.enable = (namespaces) => {
    disabledRegexps.splice(0, disabledRegexps.length);
    enabledRegexps.splice(0, enabledRegexps.length);
    if (namespaces === '') {
        namespaces = '*';
    }
    else {
        namespaces = namespaces || '*';
    }
    processNamespaces(namespaces, { disabledRegexps, enabledRegexps }, (namespace, enabled) => (loggers[namespace].enabled = enabled));
    try {
        localStorage.setItem('debug', namespaces);
    }
    catch (e) { }
};
function enabled(name, { disabledRegexps, enabledRegexps }) {
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
function processNamespaces(namespaces, { disabledRegexps, enabledRegexps }, func) {
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
        }
        else {
            enabledRegexps.push(new RegExp('^' + namespaces + '$'));
        }
    }
    for (const namespace of Object.keys(loggers)) {
        func(namespace, enabled(namespace, { disabledRegexps, enabledRegexps }));
    }
}
function replaceConsole(namespace = 'console') {
    const logger = exports.logs(namespace);
    W.console = Object.assign(Object.assign({}, logger), { clear: oldConsole.clear.bind(oldConsole), count: noop, countReset: noop, dirxml: noop, exception: noop, group: noop, groupCollapsed: noop, groupEnd: noop, time: noop, timeEnd: noop, timeLog: noop, timeStamp: noop, profile: noop, profileEnd: noop });
    return oldConsole;
}
exports.replaceConsole = replaceConsole;
function hookup() {
    named_logs_1.hook(exports.logs);
}
exports.hookup = hookup;
if (typeof localStorage !== 'undefined') {
    try {
        const str = localStorage.getItem('debug');
        if (str && str !== '') {
            exports.logs.enable(str);
        }
    }
    catch (e) { }
}
else if (typeof process !== 'undefined') {
    let val = process.env['NAMED_LOGS'];
    if (val) {
        exports.logs.enable(val);
    }
    else {
        exports.logs.disable();
    }
    val = process.env['NAMED_LOGS_LEVEL'];
    if (val) {
        exports.logs.level = (logLevels[val] || parseInt(val) || exports.logs.level);
    }
    val = process.env['NAMED_LOGS_TRACE_LEVEL'];
    if (val) {
        exports.logs.traceLevel = (logLevels[val] || parseInt(val) || exports.logs.level);
    }
}
const vars = W.location ? W.location.search.slice(1).split('&') : [];
for (const variable of vars) {
    if (variable.startsWith('debug=')) {
        const val = variable.slice(6);
        if (val === '') {
            exports.logs.disable();
        }
        else {
            exports.logs.enable(val);
        }
    }
    else if (variable.startsWith('log=')) {
        const val = variable.slice(4);
        exports.logs.level = (logLevels[val] || parseInt(val) || exports.logs.level);
    }
    else if (variable.startsWith('trace=')) {
        const val = variable.slice(6);
        exports.logs.traceLevel = (logLevels[val] || parseInt(val) || exports.logs.level);
    }
}
if (typeof window !== undefined) {
    window._logFactory = exports.logs;
}
else if (typeof global !== undefined) {
    global._logFactory = exports.logs;
}
//# sourceMappingURL=index.js.map