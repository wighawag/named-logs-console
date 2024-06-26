"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hookup = exports.replaceConsole = exports.factory = void 0;
const named_logs_1 = require("named-logs");
const nop = () => undefined;
const W = (typeof window !== 'undefined' ? window : globalThis);
const oldConsole = W.console;
const disabledRegexps = [];
const enabledRegexps = [];
function bindCall(logFunc, logger, localTraceLevel, level) {
    if (logger.enabled && (logger.level >= level || exports.factory.level >= level)) {
        if (localTraceLevel <= level || exports.factory.traceLevel <= level) {
            return oldConsole.trace.bind(oldConsole);
        }
        else {
            return logFunc.bind(oldConsole);
        }
    }
    else {
        return nop;
    }
}
const loggers = {};
function write(msg) {
    process.stdout.write(msg);
}
const factory = (namespace) => {
    let logger = loggers[namespace];
    if (logger) {
        return logger;
    }
    let level = exports.factory.level;
    let traceLevel = exports.factory.traceLevel;
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
            get write() {
                if (typeof process !== 'undefined') {
                    return bindCall(write, logger, traceLevel, 3);
                }
                else {
                    return bindCall(oldConsole.info, logger, traceLevel, 3);
                }
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
            get time() {
                return bindCall(oldConsole.time || oldConsole.debug, logger, traceLevel, 5);
            },
            get timeEnd() {
                return bindCall(oldConsole.timeEnd || oldConsole.debug, logger, traceLevel, 5);
            },
            get timeLog() {
                return bindCall(oldConsole.timeLog || oldConsole.debug, logger, traceLevel, 5);
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
exports.factory = factory;
const logLevels = { error: 1, warn: 2, info: 3, log: 4, debug: 5, trace: 6 };
exports.factory.level = 2;
exports.factory.traceLevel = 6;
exports.factory.setTraceLevelFor = (namespaces, newLevel) => {
    processNamespaces(namespaces || '*', { disabledRegexps: [], enabledRegexps: [] }, (namespace, enabled) => {
        if (enabled) {
            loggers[namespace].traceLevel = newLevel;
        }
    });
};
exports.factory.disable = () => {
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
exports.factory.enable = (namespaces) => {
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
    const logger = (0, exports.factory)(namespace);
    W.console = Object.assign(Object.assign({}, logger), { clear: oldConsole.clear.bind(oldConsole), count: nop, countReset: nop, dirxml: nop, exception: nop, group: nop, groupCollapsed: nop, groupEnd: nop, timeStamp: nop, profile: nop, profileEnd: nop });
    return oldConsole;
}
exports.replaceConsole = replaceConsole;
function hookup() {
    (0, named_logs_1.hook)(exports.factory);
}
exports.hookup = hookup;
if (typeof localStorage !== 'undefined') {
    try {
        const str = localStorage.getItem('debug');
        if (str && str !== '') {
            exports.factory.enable(str);
        }
    }
    catch (e) { }
}
else if (typeof process !== 'undefined') {
    let val = process.env['NAMED_LOGS'];
    if (val) {
        exports.factory.enable(val);
    }
    else {
        exports.factory.disable();
    }
    val = process.env['NAMED_LOGS_LEVEL'];
    if (val) {
        exports.factory.level = (logLevels[val] || parseInt(val) || exports.factory.level);
    }
    val = process.env['NAMED_LOGS_TRACE_LEVEL'];
    if (val) {
        exports.factory.traceLevel = (logLevels[val] || parseInt(val) || exports.factory.level);
    }
}
const vars = W.location ? W.location.search.slice(1).split('&') : [];
for (const variable of vars) {
    if (variable.startsWith('debug=')) {
        const val = variable.slice(6);
        if (val === '') {
            exports.factory.disable();
        }
        else {
            exports.factory.enable(val);
        }
    }
    else if (variable.startsWith('log=')) {
        const val = variable.slice(4);
        exports.factory.level = (logLevels[val] || parseInt(val) || exports.factory.level);
    }
    else if (variable.startsWith('trace=')) {
        const val = variable.slice(6);
        exports.factory.traceLevel = (logLevels[val] || parseInt(val) || exports.factory.level);
    }
}
if (typeof window !== 'undefined') {
    window._logFactory = exports.factory;
}
else if (typeof global !== 'undefined') {
    global._logFactory = exports.factory;
}
//# sourceMappingURL=index.js.map