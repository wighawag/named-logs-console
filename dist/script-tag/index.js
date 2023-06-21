"use strict";var nop=function(){},W="undefined"!=typeof window?window:globalThis,oldConsole=W.console,disabledRegexps=[],enabledRegexps=[];function bindCall(e,l,a,r){return l.enabled&&(l.level>=r||factory.level>=r)?a<=r||factory.traceLevel<=r?oldConsole.trace.bind(oldConsole):e.bind(oldConsole):nop}var loggers={};function write(e){process.stdout.write(e)}var factory=function(e){var l=loggers[e];if(l)return l;var a=factory.level,r=factory.traceLevel;return l=loggers[e]={get assert(){return bindCall(oldConsole.assert,l,r,1)},get error(){return bindCall(oldConsole.error,l,r,1)},get warn(){return bindCall(oldConsole.warn,l,r,2)},get info(){return bindCall(oldConsole.info,l,r,3)},get write(){return"undefined"!=typeof process?bindCall(write,l,r,3):bindCall(oldConsole.info,l,r,3)},get log(){return bindCall(oldConsole.log,l,r,4)},get debug(){return bindCall(oldConsole.debug,l,r,5)},get trace(){return bindCall(oldConsole.trace,l,r,6)},get dir(){return bindCall(oldConsole.dir,l,r,5)},get table(){return bindCall(oldConsole.table||oldConsole.debug,l,r,5)},get time(){return bindCall(oldConsole.time||oldConsole.debug,l,r,5)},get timeEnd(){return bindCall(oldConsole.timeEnd||oldConsole.debug,l,r,5)},get timeLog(){return bindCall(oldConsole.timeLog||oldConsole.debug,l,r,5)},get level(){return a},set level(e){a=e},get traceLevel(){return r},set traceLevel(e){r=e},enabled:enabled(e,{disabledRegexps:disabledRegexps,enabledRegexps:enabledRegexps})}},logLevels={error:1,warn:2,info:3,log:4,debug:5,trace:6};function enabled(e,l){var a,r,o=l.disabledRegexps,t=l.enabledRegexps;if("*"===e[e.length-1])return!0;for(a=0,r=o.length;a<r;a++)if(o[a].test(e))return!1;for(a=0,r=t.length;a<r;a++)if(t[a].test(e))return!0;return!1}function processNamespaces(e,l,a){for(var r=l.disabledRegexps,o=l.enabledRegexps,t=("string"==typeof e?e:"").split(/[\s,]+/),s=t.length,n=0;n<s;n++)t[n]&&("-"===(e=t[n].replace(/\*/g,".*?"))[0]?r.push(new RegExp("^"+e.substr(1)+"$")):o.push(new RegExp("^"+e+"$")));for(var d=0,i=Object.keys(loggers);d<i.length;d++){var g=i[d];a(g,enabled(g,{disabledRegexps:r,enabledRegexps:o}))}}if(factory.level=2,factory.traceLevel=6,factory.setTraceLevelFor=function(e,l){processNamespaces(e||"*",{disabledRegexps:[],enabledRegexps:[]},(function(e,a){a&&(loggers[e].traceLevel=l)}))},factory.disable=function(){disabledRegexps.splice(0,disabledRegexps.length),enabledRegexps.splice(0,enabledRegexps.length);for(var e=0,l=Object.keys(loggers);e<l.length;e++){var a=l[e];loggers[a].enabled=!1}try{localStorage.removeItem("debug")}catch(e){}},factory.enable=function(e){disabledRegexps.splice(0,disabledRegexps.length),enabledRegexps.splice(0,enabledRegexps.length),processNamespaces(e=""===e?"*":e||"*",{disabledRegexps:disabledRegexps,enabledRegexps:enabledRegexps},(function(e,l){return loggers[e].enabled=l}));try{localStorage.setItem("debug",e)}catch(e){}},"undefined"!=typeof localStorage)try{var str=localStorage.getItem("debug");str&&""!==str&&factory.enable(str)}catch(e){}else if("undefined"!=typeof process){(val=process.env.NAMED_LOGS)?factory.enable(val):factory.disable(),(val=process.env.NAMED_LOGS_LEVEL)&&(factory.level=logLevels[val]||parseInt(val)||factory.level),(val=process.env.NAMED_LOGS_TRACE_LEVEL)&&(factory.traceLevel=logLevels[val]||parseInt(val)||factory.level)}for(var vars=W.location?W.location.search.slice(1).split("&"):[],_i=0,vars_1=vars;_i<vars_1.length;_i++){var variable=vars_1[_i];if(variable.startsWith("debug="))""===(val=variable.slice(6))?factory.disable():factory.enable(val);else if(variable.startsWith("log=")){var val=variable.slice(4);factory.level=logLevels[val]||parseInt(val)||factory.level}else if(variable.startsWith("trace=")){val=variable.slice(6);factory.traceLevel=logLevels[val]||parseInt(val)||factory.level}}globalThis._logFactory=factory;