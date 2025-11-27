import {hook, Logger} from 'named-logs';

export type CLogger = Logger & {
	namespace: string;
	decoration?: string;
	level: number;
	traceLevel: number;
	enabled: boolean;
};

type G = Record<string, unknown> & {
	console: Console;
	location: Location;
};

const noop = () => undefined;
const W: G = (typeof window !== 'undefined' ? window : globalThis) as unknown as G;
const oldConsole = W.console;

const disabledRegexps: RegExp[] = [];
const enabledRegexps: RegExp[] = [];

function bindCall<T>(
	logFunc: (...args: T[]) => void,
	logger: CLogger,
	localTraceLevel: number,
	level: number,
	allowDecoration?: boolean,
) {
	if (logger.enabled && (logger.level >= level || factory.level >= level)) {
		if (localTraceLevel >= level || factory.traceLevel >= level) {
			if (factory.labelVisible) {
				if (logger.decoration) {
					return oldConsole.trace.bind(oldConsole, logger.namespace, logger.decoration);
				} else {
					return oldConsole.trace.bind(oldConsole, logger.namespace);
				}
			} else {
				return oldConsole.trace.bind(oldConsole);
			}
		} else {
			if (allowDecoration && factory.labelVisible) {
				if (logger.decoration) {
					return logFunc.bind(oldConsole, logger.namespace as any, logger.decoration as any);
				} else {
					return logFunc.bind(oldConsole, logger.namespace as any);
				}
			} else {
				return logFunc.bind(oldConsole);
			}
		}
	} else {
		return noop;
	}
}

const loggers: {[namespace: string]: CLogger} = {};

function write(msg: string) {
	process.stdout.write(msg);
}

export const factory: {
	(namespace: string): CLogger;
	level: number; // TODO setting should affect all logger (unless set before ?)
	traceLevel: number; // TODO setting should affect all logger (unless set before ?)
	labelVisible: boolean;
	setTraceLevelFor: (namespace: string, newLevel: number) => void;
	disable: () => void;
	enable: (namespaces?: string) => void;
} = (namespace: string, decoration?: string): CLogger => {
	let logger = loggers[namespace];

	if (logger) {
		return logger;
	}
	let level = factory.level;
	let traceLevel = factory.traceLevel;

	return (logger = loggers[namespace] =
		{
			namespace,
			decoration,
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
				} else {
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
			set level(newLevel: number) {
				level = newLevel;
			},
			get traceLevel() {
				return traceLevel;
			},
			set traceLevel(newLevel: number) {
				traceLevel = newLevel;
			},
			enabled: enabled(namespace, {disabledRegexps, enabledRegexps}),
		});
};

const logLevels: {[name: string]: number} = {error: 1, warn: 2, info: 3, log: 4, debug: 5, trace: 6};

factory.level = 2;
factory.traceLevel = 6;

factory.setTraceLevelFor = (namespaces: string, newLevel: number) => {
	processNamespaces(namespaces || '*', {disabledRegexps: [], enabledRegexps: []}, (namespace, enabled) => {
		if (enabled) {
			loggers[namespace].traceLevel = newLevel;
		}
	});
};
factory.disable = () => {
	disabledRegexps.splice(0, disabledRegexps.length);
	enabledRegexps.splice(0, enabledRegexps.length);
	for (const namespace of Object.keys(loggers)) {
		loggers[namespace].enabled = false;
	}
	try {
		localStorage.removeItem('debug');
	} catch (e) {}
};
factory.enable = (namespaces?: string) => {
	disabledRegexps.splice(0, disabledRegexps.length);
	enabledRegexps.splice(0, enabledRegexps.length);
	if (namespaces === '') {
		namespaces = '*';
	} else {
		namespaces = namespaces || '*';
	}
	processNamespaces(
		namespaces,
		{disabledRegexps, enabledRegexps},
		(namespace, enabled) => (loggers[namespace].enabled = enabled),
	);
	try {
		localStorage.setItem('debug', namespaces);
	} catch (e) {}
};

function enabled(
	name: string,
	{disabledRegexps, enabledRegexps}: {disabledRegexps: RegExp[]; enabledRegexps: RegExp[]},
): boolean {
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

function processNamespaces(
	namespaces: string,
	{disabledRegexps, enabledRegexps}: {disabledRegexps: RegExp[]; enabledRegexps: RegExp[]},
	func: (namespace: string, enabled: boolean) => void,
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

export function replaceConsole(namespace = 'console'): Console {
	const logger = factory(namespace);
	W.console = {
		...logger,
		clear: oldConsole.clear.bind(oldConsole),
		count: noop,
		countReset: noop,
		dirxml: noop, // TODO ?
		exception: noop,
		group: noop,
		groupCollapsed: noop,
		groupEnd: noop,
		timeStamp: noop,
		profile: noop,
		profileEnd: noop,
		// timeStamp: oldConsole.timeStamp.bind(oldConsole),
		// profile: (oldConsole as any).profile.bind(oldConsole),
		// profileEnd: (oldConsole as any).profileEnd.bind(oldConsole),
	} as unknown as Console;
	return oldConsole;
}

export function hookup(): void {
	hook(factory);
}

if (typeof localStorage !== 'undefined') {
	try {
		const str = localStorage.getItem('debug');
		if (str && str !== '') {
			factory.enable(str);
		}
	} catch (e) {}
} else if (typeof process !== 'undefined') {
	let val = process.env['NAMED_LOGS'];
	if (val) {
		factory.enable(val);
	} else {
		factory.disable();
	}
	val = process.env['NAMED_LOGS_LEVEL'];
	if (val) {
		factory.level = (logLevels[val] || parseInt(val) || factory.level) as number;
	}

	val = process.env['NAMED_LOGS_TRACE_LEVEL'];
	if (val) {
		factory.traceLevel = (logLevels[val] || parseInt(val) || factory.level) as number;
	}

	val = process.env['NAMED_LOGS_LABEL'];
	if (val) {
		factory.labelVisible = true;
	}
}

const vars = W.location ? W.location.search.slice(1).split('&') : [];
for (const variable of vars) {
	if (variable.startsWith('debug=')) {
		const val = variable.slice(6);
		if (val === '') {
			factory.disable();
		} else {
			factory.enable(val);
		}
	} else if (variable.startsWith('debugLevel=')) {
		const val = variable.slice(11);
		factory.level = (logLevels[val] || parseInt(val) || factory.level) as number;
	} else if (variable.startsWith('traceLevel=')) {
		const val = variable.slice(11);
		factory.traceLevel = (logLevels[val] || parseInt(val) || factory.level) as number;
	} else if (variable.startsWith('debugLabel')) {
		factory.labelVisible = true;
	}
}

if (typeof window !== 'undefined') {
	(window as any)._logFactory = factory;
} else if (typeof global !== 'undefined') {
	(global as any)._logFactory = factory;
}
