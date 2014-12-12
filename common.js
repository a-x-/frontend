/**
 * @file slidepage /
 * Created: 10.05.14 / 23:28
 */

/**
 * Make the object, call object.init() and return its.
 * @param object
 * @depends each
 * @returns {*}
 */
function makeObjInit(object) {
    var Generator = function () {
    };
    Generator.prototype = _.clone(object);
    (object.init || function () {
    }).call(this);
    return new Generator();
}

/**
 * @param classObject
 * @return {*}
 */
function makeClass(classObject) {
    if (!classObject.init) {
        classObject.init = function () {
        };
    }
    //
    var fn = classObject.init;
    each(classObject, function (el, i) {
        fn.prototype[i] = el;
    });
    return fn;
}

//
// Pretty cool wrappers
//

var proxies = (function () {
        var $ProxyStatics = function (self, valuePreprocessor, valuePostprocessor) {
            self.chaining = self.v !== undefined;
            /**
             * Switch off chaining and return proxy
             */
            self.toValue = function () {
                this.chaining = false;
                return this;
            }.bind(self);
            self.valueOf = function () {
                return this.v;
            }.bind(self);
            valuePreprocessor = valuePreprocessor || _.identity;
            valuePostprocessor = valuePostprocessor || _.identity;
            //
            this.wrapFn = function (fn) {
                return function () {
                    var args = _.difference(arguments, []), // array clone lo-dash hack :(
                        out;
                    if (!this.v) {
                        this.v = valuePreprocessor(arguments[0]);
                        args.shift();
                    }
                    args.unshift(this.v);
                    out = fn.apply(this, args);
                    if (out !== undefined /*&& this.chaining*/) {
                        if (
                            out instanceof HTMLElement ||
                            out instanceof NodeList ||
                            out instanceof Array && out.length && out[0] instanceof HTMLElement ||
                            out.toString() ==="[object domProxy]"
                        )
                            this.v = valuePreprocessor(out); // fn as a filter. pass element back into wrapper
                        else
                            return valuePostprocessor(out);
                    }
                    return this.chaining ? this : (valuePostprocessor(this.v) || arguments[0]);
                }.bind(this);
            }.bind(self);
        };
        return {
            /**
             * Dom element or dom elements collection wrapper
             * @version 2.0 no backward compatibility
             * $d.append(parentEl,childEl); -> parentEl HTMLElement
             * $d(parentEl).append(childEl); -> DomProxy{parentEl}
             */
            d: (function () {
                var proxy = function (d) {
                    return new function domProxy(d) {
                        var valuePreprocessor = function (v) {
                            if (!v)return;
                            if (v.toString() === "[object domProxy]") return v.valueOf();
                            if (v.toString() === '[object NodeList]') return _.toArray(v);
                            if (_.isArray(v)) return v;
                            return typeof v === 'string' ? _.toArray(document.querySelectorAll(v)) : [v];
                        }
                        var valuePostprocessor = function (v) {
                            if (v.length === 1) return v[0];
                            return v;
                        };
                        this.v = valuePreprocessor(d);
                        this.el = function () {
                            return this.v[0];
                        }.bind(this);
                        var statics = new $ProxyStatics(this, valuePreprocessor, valuePostprocessor);
                        //
                        this.append = statics.wrapFn(function (v, child) {
                            v.forEach(function (parent) {
                                $d(child).v.forEach(function (child) {
                                    parent.appendChild(child);
                                });
                            });
                        }.bind(this));
                        this.show = statics.wrapFn(function (v) {
                            v.forEach(function (el) {
                                el.classList.remove('stash');
                                el.classList.remove('stash-force');
                            });
                        }.bind(this));
                        this.stash = statics.wrapFn(function (v, isForce) {
                            v.forEach(function (el) {
                                el.classList.add(isForce ? 'stash-force': 'stash');
                            });
                        }.bind(this));
                        this.on = statics.wrapFn(function (v, events, callback, bubbling) {
                            events.split(/\s+/).forEach(function (event) {
                                v.forEach(function (el) {
                                    el.addEventListener(event, callback, bubbling);
                                });
                            }.bind(this));
                        }.bind(this));
                        this.off = statics.wrapFn(function (v, events, callback, bubbling) {
                            events.split(/\s+/).forEach(function (event) {
                                v.forEach(function (el) {
                                    el.removeEventListener(event, callback, bubbling);
                                });
                            }.bind(this));
                        }.bind(this));
                        /**
                         * Find child by css query and callback
                         */
                        this.query = statics.wrapFn(function (v, query, callback) {
                            if (callback)
                                v.forEach(function (el) {
                                    callback(el.querySelector(query), el);
                                });
                            else
                                return v.map(function (el) {
                                    return el.querySelector(query);
                                });
                        }.bind(this));
                        this.style = statics.wrapFn(function (v) {
                            return v.map(function (el) {
                                return getComputedStyle(el);
                            });
                        }.bind(this));
                        this.visible = statics.wrapFn(function (v) {
                            return v.map(function (el) {
                                return $d(el).style().display !== 'none';
                            });
                        }.bind(this));
                        this.toString = function () {
                            return '[object domProxy]'
                        };

                        //d.prototype = HTMLElement.prototype;
                        //d.__proto__ = HTMLElement.prototype;
                        //d.setAttribute.call(d.el(), 'dfd','gfg')
                    }(d);
                };
                proxy.TEMP_STATIC_PARAM = true;
                proxy.create = function (tagName, params, value) {
                    var element = document.createElement(tagName);
                    //var element.setAttribute()
                    _(params).forEach(function (value, name) {
                        // Transform style object to string
                        if (name === 'style' && _.isPlainObject(value)) {
                            value = _(value)
                                .map(function (ruleValue, ruleName) {
                                    return '{1}: {2}'.format(ruleName, ruleValue);
                                })
                                .join(';');
                        } else if (name === 'class' && _.isArray(value)) {
                            value = value.join(' ');
                        } else if (name === 'dataset') {
                            _(value).forEach(function (itemValue, itemName) {
                                element.dataset[itemName] = itemValue;
                            });
                            return;
                        }
                        element.setAttribute(name, value);
                    });
                    if (value)
                        element[!!~['input', 'textarea'].indexOf(tagName) ? 'value' : 'innerHTML'] = value;
                    return $d(element);
                };
                return proxy;
            }()),

            /**
             * @version 2.0 no backward compatibility
             */
            s: (function () {
                return function (s) {
                    var $S = function (s) {
                        this.v = s;
                        var statics = new $ProxyStatics(this);
                        //
                        /**
                         * Map replace
                         * @param pattern       string|regExp|object
                         * @param replacement   string
                         * @example $s ('123').replace( {'1': -1, '2':-2, '3':-3} )
                         */
                        this.replaceMap = statics.wrapFn(function (v, /*string|regExp|object*/ pattern, /*=*/ replacement) {
                            var strNew;
                            if (_.isPlainObject(pattern)) {
                                _.forEach(pattern, function (replacement, pattern) {
                                    strNew = v.replace(pattern, replacement);
                                });
                            }
                            return strNew;
                        }.bind(this));
                    };
                    $S.prototype = String.prototype; // extend String type
                    return new $S(s);
                };
            }())
        };
    }()),
    $s = proxies.s,
    $d = proxies.d;

var $form = {
    /**
     * @todo rewrite with $ajax
     * @todo check get method
     * @param form
     * @param callback
     */
    send: function (form, callback) {
        var formData = new FormData(form);
        var method = form.method || 'post';
        var path = form.action;
        $ajax[method](path, formData, callback);
    },

    /**
     * Make form ajaxy a bit
     * Note: see also MLaritz/Vanilla-Notify for notifications
     * @example see ab-club/vip/support for reference
     * @param form
     * @param success
     * @param fail
     */
    init: function (form, success, fail) {
        var submit = function () {
            sendForm(form, function () {
                (this.status === 200 ? success : fail).apply(this, arguments);
            });
        };
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            submit();
        });
        form.addEventListener('keydown', function (e) {
            if (!$e.isCtrlEnter(e)) return;
            submit();
        });
    },

    /**
     * Auto expanding textarea
     * @author Thanks to great snippet: https://github.com/ramitos/resizable-textarea
     * @param area
     */
    autoExpandingTextarea: function (area, max) {
        area.addEventListener('input', function (e) {
            var rows = parseInt(area.getAttribute('rows'));
            var scrollHeight = area.scrollHeight;
            var height = area.clientHeight;
            var rowsNew = Math.ceil(((scrollHeight * rows) / height));
            if (rowsNew > (max || 10)) return;
            area.setAttribute('rows', rowsNew)
        });
    },

    /**
     *
     * @example getRadioGroupValue('group-1');
     */
    getRadioGroupValue: function (name) {
        try {
            _(document.querySelectorAll('[type="radio"][name="{1}"]'.format(name)))
                .forEach(function (el, i) {
                    if (el.checked)
                        throw el.value == 'on' ? i : el.value;
                });
        } catch (e) {
            return e;
        }
        return undefined;
    }
};


/**
 * Make template processors if haystack described by box or variable enclosure
 * @param haystack String|HTMLElement|Function - box or variable enclosure or complete function
 * @param key String - variable_enclosure's variable_name
 * @returns Function
 */
function delayedSetter(haystack, /**String=*/ key) {
    var processorCallback;
    if (!haystack instanceof Function) {
        if (haystack instanceof String || haystack instanceof HTMLElement) { // box is
            processorCallback = function (needle) {
                $(haystack).html(needle);
            };
        } else if (haystack instanceof Object) {
            processorCallback = function (needle) {
                haystack[key] = needle;
            };
        }
    } else if (haystack) {
        processorCallback = haystack;
    } else {
        processorCallback = function () {
        };
    }
    //
    return processorCallback;
}

function getMeta(name) {
    return document.querySelector('meta[name="{1}"]'.format(name)).content;
}

function getShortDate() {
    var d = new Date();
    var curr_day = d.getDate();
    var curr_month = d.getMonth() + 1;
    var curr_year = d.getFullYear();
    return "{1}.{2}.{3}".format(curr_day, curr_month, curr_year);
}


//var $localStorage = Object.create(
//    {},{}
//);

// Simple powerfull strong logger :)
var _d = console.log.bind(console);

//var mixins = {};
//_.mixin(mixins);
var JS_COMMENTS_RX = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;


//
// Ugly hell extending
//

HTMLElement.prototype.trigger || (HTMLElement.prototype.trigger = function (event) {
    this.dispatchEvent(new CustomEvent(event));
    return this;
});
NodeList.prototype.addEventListener = function () {
    var args = _(arguments).toArray();
    if (!arguments.length || !this.length) return;
    _(this).forEach(function (el, i, a) {
        HTMLElement.prototype.addEventListener.apply(el, args);
    });
};

NodeList.prototype.each = function (fn) {
    _(this).forEach(fn);
};


RegExp.escape = function (s) {
    return s.replace(/[\-\/\^\$\*\+\?\.\(\)\|\[\]\{\}\\]/g, '\\$&');
};


/**
 * http://stackoverflow.com/questions/1026069/capitalize-the-first-letter-of-string-in-javascript
 * @returns {string}
 */
String.prototype.toCapital = function () {
    var string = this;
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};

//
// Deprecated functions
//

/**
 * @deprecated by $d.create
 * @reference http://blog.invntrm.ru/pravoslavnoie-dobavlieniie-html-eliemientov-js/
 * @param o
 * @returns {string}
 */
function cssStringify(o) {
    var out = '';
    _(o).forEach(function (v, i, a) {
        out += i + ':' + v + ';';
    });
    return out;
}

/**
 * @deprecated as so narrow
 */
try {
    if ($ && $.pnotify) {
        /**
         * Show notification
         * @param text string
         * @param title string
         * @param delay integer
         * @param type string
         */
        function openNoty(title, text, /*string=*/ type, /*integer=*/ delay) {
            if (type == 'fail') {
                type = 'error';
            }
            $.pnotify({
                title: title,
                text: text,
                nonblock: true,
                nonblock_opacity: 0.2,
                type: type || 'success',
                delay: delay || $.pnotify.DELAY
            });
        }

        $.pnotify.DELAY = 4000;
    }
} catch (e) {
}

/**
 * @deprecated as not required in XXI
 * reference http://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically-from-javascript
 * @param func
 * @returns {Array|{index: number, input: string}}
 */
function getParamNames(func) {
    var fnStr = func.toString().replace(JS_COMMENTS_RX, '');
    var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(/([^\s,]+)/g);
    if (result === null) {
        result = [];
    }
    return result
}


/**
 * @deprecated by lodash
 */
if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = _.toArray(arguments);
        args.unshift(null);
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined' ? args[number] : '';
        });
    };
}

//
// For $d, domProxy, $s see proxies
//

/**
 * @deprecated as no required in XXI
 * new Function(['a','b'],'return ' + ((function(){return 42+a+b;}).toString()) + '();' )(1,2) // --> 45
 * @example makeFnWithArguments([a,b],function(){return 42+a+b;})(1,2); // --> 45
 * @param argsNames
 * @param fn
 * @returns {Function}
 */
function makeFnWithArguments(argsNames, fn) {
    return new Function(argsNames, 'return (' + fn.toString() + ')();');
}

/**
 * @deprecated by fancybox
 * @type {{isModal: boolean, _$shut: undefined, blurSelector: string, onClose: onClose, activate: activate, deactivate: deactivate}}
 */
var Modal = {
    isModal: false,
    _$shut: undefined,
    blurSelector: '',
    onClose: function () {
    },
    /**
     *
     * @param isSwitchOn bool|function
     * @returns bool
     * @param blurSelector
     */
    activate: function (/*=bool|function*/ isSwitchOn, blurSelector) {
        Modal.onClose = function () {
        };
        if (isSwitchOn === undefined) {
            isSwitchOn = true;
        } else if (typeof isSwitchOn == 'function') {
            Modal.onClose = isSwitchOn;
            isSwitchOn = true;
        }
        if (Modal.isModal && isSwitchOn) {
            return false;
        }
        this.blurSelector = (!blurSelector) ? 'body>*:not(.modals)' : blurSelector;
        if (isSwitchOn) { // activate modal mode
            $('html').addClass('fixed'); // hide overflow
            Modal._$shut = $('<div/>', {
                class: 'shut shut-modal'
            }).appendTo('body'); // open shut
            $(this.blurSelector).addClass('bg-blur'); // blur background layer
            // Set esc event handler
            $('*').on('keydown.Modal', null, 'esc', function (event) {
                console.log(event, 'keydown.Modal: esc');
                Modal.deactivate();
            });
            //
            // Set shut click action
            Modal._$shut.on('click', function () {
                console.log(event, 'Modal._$shut.on(click)');
                Modal.deactivate();
            });
            slidepage && (slidepage.isPageFreeze = true);
            //
            Modal.isModal = true;
        } else {
            return Modal.deactivate();
        }
        //
        return true;
    },
    deactivate: function () {
        if (!Modal.isModal) {
            return false;
        }
        //
        Modal.onClose();
        $('html').removeClass('fixed');
        Modal._$shut.remove();
        $(this.blurSelector).removeClass('bg-blur');
        Modal.isModal = false;
        slidepage && (slidepage.isPageFreeze = false);
        //
        return true;
    }
};


function getFileSize(size) {
    var i = Math.floor(Math.log(size) / Math.log(1024)); // https://en.wikipedia.org/wiki/Logarithm#Change_of_base
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

var $e = {
    ENTER: 13,
    ESCAPE: 27,
    SPACE: 32,
    /**
     *
     * @param e Event
     * @returns {boolean}
     */
    isEnter: function (e) {
        return (e.keyCode === $e.ENTER);
    },
    isSpace: function(e){
        return e.keyCode === $e.SPACE;
    },
    isCtrlEnter: function (e) {
        return (e.keyCode === $e.ENTER && e.ctrlKey);
    },
    isEscape: function(e) {
        return e.keyCode === $e.ESCAPE;
    }
};
