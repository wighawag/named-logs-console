"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.factory = void 0;
exports.replaceConsole = replaceConsole;
exports.hookup = hookup;
const named_logs_1 = require("named-logs");
const noop = () => undefined;
const W = (typeof window !== 'undefined' ? window : globalThis);
const oldConsole = W.console;
const disabledRegexps = [];
const enabledRegexps = [];
function bindCall(logFunc, logger, localTraceLevel, level, allowDecoration) {
    if (logger.enabled && (logger.level >= level || exports.factory.level >= level)) {
        if (localTraceLevel >= level || exports.factory.traceLevel >= level) {
            if (exports.factory.labelVisible) {
                if (logger.decoration) {
                    return oldConsole.trace.bind(oldConsole, `%c${logger.namespace}`, logger.decoration);
                }
                else {
                    return oldConsole.trace.bind(oldConsole, logger.namespace);
                }
            }
            else {
                return oldConsole.trace.bind(oldConsole);
            }
        }
        else {
            if (allowDecoration && exports.factory.labelVisible) {
                if (logger.decoration) {
                    return logFunc.bind(oldConsole, `%c${logger.namespace}`, logger.decoration);
                }
                else {
                    return logFunc.bind(oldConsole, logger.namespace);
                }
            }
            else {
                return logFunc.bind(oldConsole);
            }
        }
    }
    else {
        return noop;
    }
}
const loggers = {};
function write(msg) {
    process.stdout.write(msg);
}
const factory = (namespace, options) => {
    let logger = loggers[namespace];
    if (logger) {
        return logger;
    }
    let level = exports.factory.level;
    let traceLevel = exports.factory.traceLevel;
    return (logger = loggers[namespace] =
        {
            namespace,
            decoration: options === null || options === void 0 ? void 0 : options.decoration,
            get assert() {
                return bindCall(oldConsole.assert, logger, traceLevel, 1, false);
            },
            get error() {
                return bindCall(oldConsole.error, logger, traceLevel, 1, true);
            },
            get warn() {
                return bindCall(oldConsole.warn, logger, traceLevel, 2, true);
            },
            get info() {
                return bindCall(oldConsole.info, logger, traceLevel, 3, true);
            },
            get write() {
                if (typeof process !== 'undefined') {
                    return bindCall(write, logger, traceLevel, 3, false);
                }
                else {
                    return bindCall(oldConsole.info, logger, traceLevel, 3, false);
                }
            },
            get log() {
                return bindCall(oldConsole.log, logger, traceLevel, 4, true);
            },
            get debug() {
                return bindCall(oldConsole.debug, logger, traceLevel, 5, true);
            },
            get trace() {
                return bindCall(oldConsole.trace, logger, traceLevel, 6, true);
            },
            get dir() {
                return bindCall(oldConsole.dir, logger, traceLevel, 5, false);
            },
            get table() {
                return bindCall(oldConsole.table || oldConsole.debug, logger, traceLevel, 5, false);
            },
            get time() {
                return bindCall(oldConsole.time || oldConsole.debug, logger, traceLevel, 5, false);
            },
            get timeEnd() {
                return bindCall(oldConsole.timeEnd || oldConsole.debug, logger, traceLevel, 5, false);
            },
            get timeLog() {
                return bindCall(oldConsole.timeLog || oldConsole.debug, logger, traceLevel, 5, false);
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
exports.factory.traceLevel = 0;
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
    W.console = Object.assign(Object.assign({}, logger), { clear: oldConsole.clear.bind(oldConsole), count: noop, countReset: noop, dirxml: noop, exception: noop, group: noop, groupCollapsed: noop, groupEnd: noop, timeStamp: noop, profile: noop, profileEnd: noop });
    return oldConsole;
}
function hookup() {
    (0, named_logs_1.hook)(exports.factory); // TODO type fix
}
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
    val = process.env['NAMED_LOGS_LABEL'];
    if (val) {
        exports.factory.labelVisible = true;
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
    else if (variable.startsWith('debugLevel=')) {
        const val = variable.slice(11);
        exports.factory.level = (logLevels[val] || parseInt(val) || exports.factory.level);
    }
    else if (variable.startsWith('traceLevel=')) {
        const val = variable.slice(11);
        exports.factory.traceLevel = (logLevels[val] || parseInt(val) || exports.factory.level);
    }
    else if (variable.startsWith('debugLabel')) {
        exports.factory.labelVisible = true;
    }
}
if (typeof window !== 'undefined') {
    window._logFactory = exports.factory;
}
else if (typeof global !== 'undefined') {
    global._logFactory = exports.factory;
}
//# sourceMappingURL=index.js.map