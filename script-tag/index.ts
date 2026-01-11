/* eslint-disable @typescript-eslint/no-explicit-any */
type Logger = {
	readonly assert: (condition?: boolean, ...data: any[]) => void;
	readonly error: (...data: any[]) => void;
	readonly warn: (...data: any[]) => void;
	readonly info: (...data: any[]) => void;
	readonly log: (...data: any[]) => void;
	readonly debug: (...data: any[]) => void;
	readonly dir: (item?: any, options?: any) => void;
	readonly table: (tabularData?: any, properties?: string[]) => void;
	readonly time: (label: string) => void;
	readonly timeEnd: (label: string) => void;
	readonly timeLog: (label?: string) => void;
	readonly trace: (...data: any[]) => void;
	readonly write: (msg: string) => void;
};
/* eslint-enable @typescript-eslint/no-explicit-any */
type CLogger = Logger & {
	namespace: string;
	decoration?: string;
	level: number | undefined;
	traceLevel: number | undefined;
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

function bindCall<T>(logFunc: (...args: T[]) => void, logger: CLogger, level: number, allowDecoration?: boolean) {
	if (logger.enabled && (logger.level !== undefined ? logger.level >= level : factory.level >= level)) {
		if (logger.traceLevel !== undefined ? logger.traceLevel >= level : factory.traceLevel >= level) {
			if (factory.labelVisible) {
				const label =
					typeof factory.labelVisible === 'string' ? `${factory.labelVisible}${logger.namespace}` : logger.namespace;
				if (logger.decoration) {
					return oldConsole.trace.bind(oldConsole, `%c${label}`, logger.decoration);
				} else {
					return oldConsole.trace.bind(oldConsole, label);
				}
			} else {
				return oldConsole.trace.bind(oldConsole);
			}
		} else {
			if (allowDecoration && factory.labelVisible) {
				const label =
					typeof factory.labelVisible === 'string' ? `${factory.labelVisible}${logger.namespace}` : logger.namespace;
				if (logger.decoration) {
					return logFunc.bind(oldConsole, `%c${label}` as any, logger.decoration as any);
				} else {
					return logFunc.bind(oldConsole, label as any);
				}
			} else {
				return logFunc.bind(oldConsole);
			}
		}
	} else {
		return noop;
	}
}

const _loggers: {[namespace: string]: CLogger} = {};

function write(msg: string) {
	process.stdout.write(msg);
}

const factory: {
	(namespace: string, options?: {decoration?: string}): CLogger;
	level: number; // TODO setting should affect all logger (unless set before ?)
	traceLevel: number; // TODO setting should affect all logger (unless set before ?)
	labelVisible: boolean | string;
	setTraceLevelFor: (namespace: string, newLevel: number) => void;
	disable: () => void;
	enable: (namespaces?: string) => void;
} = (namespace: string, options?: {decoration?: string}): CLogger => {
	let logger = _loggers[namespace];

	if (logger) {
		return logger;
	}
	let namespaceLevel: number | undefined = undefined;
	let namespaceTraceLevel: number | undefined = undefined;

	logger = _loggers[namespace] = {
		namespace,
		decoration: options?.decoration,
		get assert() {
			return bindCall(oldConsole.assert, logger, 1, false);
		},
		get error() {
			return bindCall(oldConsole.error, logger, 1, true);
		},
		get warn() {
			return bindCall(oldConsole.warn, logger, 2, true);
		},
		get info() {
			return bindCall(oldConsole.info, logger, 3, true);
		},
		get write() {
			if (typeof process !== 'undefined') {
				return bindCall(write, logger, 3, false);
			} else {
				return bindCall(oldConsole.info, logger, 3, false);
			}
		},
		get log() {
			return bindCall(oldConsole.log, logger, 3, true);
		},
		get debug() {
			return bindCall(oldConsole.debug, logger, 4, true);
		},
		get trace() {
			return bindCall(oldConsole.trace, logger, 5, true);
		},
		get dir() {
			return bindCall(oldConsole.dir, logger, 4, false);
		},
		get table() {
			return bindCall(oldConsole.table || oldConsole.debug, logger, 4, false);
		},
		get time() {
			return bindCall(oldConsole.time || oldConsole.debug, logger, 4, false);
		},
		get timeEnd() {
			return bindCall(oldConsole.timeEnd || oldConsole.debug, logger, 4, false);
		},
		get timeLog() {
			return bindCall(oldConsole.timeLog || oldConsole.debug, logger, 4, false);
		},
		get level(): number | undefined {
			return namespaceLevel;
		},
		set level(newLevel: number) {
			namespaceLevel = newLevel;
		},
		get traceLevel(): number | undefined {
			return namespaceTraceLevel;
		},
		set traceLevel(newLevel: number) {
			namespaceTraceLevel = newLevel;
		},
		enabled: enabled(namespace, {disabledRegexps, enabledRegexps}),
	};

	return logger;
};

const logLevels: {[name: string]: number} = {error: 1, warn: 2, info: 3, debug: 4, trace: 5};

factory.level = 2;
factory.traceLevel = 0;

factory.setTraceLevelFor = (namespaces: string, newLevel: number) => {
	processNamespaces(namespaces || '*', {disabledRegexps: [], enabledRegexps: []}, (namespace, enabled) => {
		if (enabled) {
			_loggers[namespace].traceLevel = newLevel;
		}
	});
};
factory.disable = () => {
	disabledRegexps.splice(0, disabledRegexps.length);
	enabledRegexps.splice(0, enabledRegexps.length);
	for (const namespace of Object.keys(_loggers)) {
		_loggers[namespace].enabled = false;
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
		(namespace, enabled) => (_loggers[namespace].enabled = enabled),
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

	for (const namespace of Object.keys(_loggers)) {
		func(namespace, enabled(namespace, {disabledRegexps, enabledRegexps}));
	}
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
		factory.traceLevel = (logLevels[val] || parseInt(val) || factory.traceLevel) as number;
	} else if (variable.startsWith('debugLabel')) {
		const val = variable.slice(11);
		if (val) {
			factory.labelVisible = val;
		} else {
			factory.labelVisible = true;
		}
	}
}

(globalThis as any)._logFactory = factory;
