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
    var Generator = function () { };
    Generator.prototype = _.clone(object);
    (object.init || function(){}).call(this);
    return new Generator();
}

/**
 * @param classObject
 * @return {*}
 */
function makeClass(classObject) {
    if(!classObject.init) {classObject.init = function(){};}
    //
    var fn = classObject.init;
    each(classObject, function (el, i) {
        fn.prototype[i] = el;
    });
    return fn;
}


//
// Ugly hell extending
//

HTMLElement.prototype.trigger || (HTMLElement.prototype.trigger = function(event){
    this.dispatchEvent(new CustomEvent(event));
    return this;
});
NodeList.prototype.addEventListener = function(){
    var args = $a(arguments).v;
    if(!arguments.length || !this.length) return;
    $a(this).each(function(el,i,a){
        console.log(el, args);
        HTMLElement.prototype.addEventListener.apply(el,args);
    });
};

NodeList.prototype.each = function(fn){
    $a(this).each(fn);
};


RegExp.escape = function (s) {
    return s.replace(/[\-\/\^\$\*\+\?\.\(\)\|\[\]\{\}\\]/g, '\\$&');
};

var proxies = (function () {
    var $ProxyStatics = function (self, valuePreprocessor, valuePostprocessor) {
        self.chaining = self.v !== undefined;
        self.toValue = function () { this.chaining = false; return this; }.bind(self);
        self.valueOf = function () { return this.v; }.bind(self);
        valuePreprocessor = valuePreprocessor || _.identity;
        valuePostprocessor = valuePostprocessor || _.identity;
        //
        this.wrapFn = function (fn) {
            return function () {
                var args = _.difference(arguments,[]),// array clone lo-dash hack :(
                    out;
                if (!this.v) { this.v = valuePreprocessor(arguments[0]); args.shift(); }
                args.unshift(this.v);
                out = fn.apply(this, args);
                if (out !== undefined && this.chaining) { this.v = out; } // иначе при включенном chaining значение потеряется
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
            return function (d) {
                return new function domProxy(d) {
                    var valuePreprocessor = function (v) {
                        return v && (typeof v === 'string' ? _.toArray(document.querySelectorAll(v)) : [v]);
                    }
                    var valuePostprocessor = function (v) {
                        if(v.length === 1) return v[0];
                        return v;
                    };
                    this.v = valuePreprocessor(d);
                    this.el = function () { return this.v[0]; }.bind(this);
                    var statics = new $ProxyStatics(this, valuePreprocessor, valuePostprocessor);
                    //
                    this.append = statics.wrapFn(function (v, child) {
                        v.forEach(function (parent) {
                            $d(child).v.forEach(function (child) { parent.appendChild(child); });
                        });
                    }.bind(this));
                    this.show = statics.wrapFn(function (v) {
                        v.forEach(function (el) { el.classList.remove('stash'); });
                    }.bind(this));
                    this.stash = statics.wrapFn(function (v) {
                        v.forEach(function (el) { el.classList.add('stash'); });
                    }.bind(this));
                    this.on = statics.wrapFn(function (v, events, callback, bubbling) {
                        events.split(/\s+/).forEach(function (event) {
                            v.forEach(function (el) { el.addEventListener(event, callback, bubbling); });
                        }.bind(this));
                    }.bind(this));
                    this.off = statics.wrapFn(function (v, events, callback, bubbling) {
                        events.split(/\s+/).forEach(function (event) {
                            v.forEach(function (el) { el.removeEventListener(event, callback, bubbling); });
                        }.bind(this));
                    }.bind(this));
                }(d);
            };
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
                    this.replaceMap = statics.wrapFn(function (v, /*string|regExp|object*/pattern, /*=*/replacement) {
                        var strNew;
                        if (_.isPlainObject(pattern)) {
                            _.forEach(pattern, function (replacement, pattern) { strNew = v.replace(pattern, replacement); });
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

/**
 * Make template processors if haystack described by box or variable enclosure
 * @param haystack String|HTMLElement|Function - box or variable enclosure or complete function
 * @param key String - variable_enclosure's variable_name
 * @returns Function
 */
function delayedSetter(haystack, /**String=*/key) {
    var processorCallback;
    if (!haystack instanceof Function) {
        if (haystack instanceof String || haystack instanceof HTMLElement) {// box is
            processorCallback = function (needle) {
                $(haystack).html(needle);
            };
        }
        else if (haystack instanceof Object) {
            processorCallback = function (needle) {
                haystack[key] = needle;
            };
        }
    }
    else if (haystack) {
        processorCallback = haystack;
    }
    else {
        processorCallback = function () {
        };
    }
    //
    return processorCallback;
}


/**
 * @reference http://blog.invntrm.ru/pravoslavnoie-dobavlieniie-html-eliemientov-js/
 * @param o
 * @returns {string}
 */
function cssStringify(o) {
    var out = '';
    $o(o).each(function(v, i, a) {// $$$ - object proxy
        out += i + ':' + v + ';';
    });
    return out;
}

/**
 * Make form ajax-able
 * @version 2.0
 * @example ['order', 'call-req'].forEach(setFormInitHandler);
 * @param formSelector
 * @param additionData
 * @param callbacks
 */
function setFormInitHandler (formSelector, additionData, callbacks) {
    // v.1 deleted
    // todo write setFormInitHandler v.2
}

/**
 * Pre-load images
 * @type {{isLoadingStarted: boolean, add: add, load: load, init: init, images: Array}}
 * HTML5 Link Prefetch
 * <link rel="prefetch" href="...jpg" />
 */

function getShortDate(){
    var d = new Date();
    var curr_day = d.getDate();
    var curr_month = d.getMonth() + 1;
    var curr_year = d.getFullYear();
    return "{1}.{2}.{3}".format(curr_day,curr_month,curr_year);
}

/**
 *
 * @example getRadioGroupValue('group-1');
 */
function getRadioGroupValue (name){
    try{
        $a(document.querySelectorAll('[type="radio"][name="{1}"]'.format(name)))
            .each(function(el,i){
                if(el.checked)
                    throw el.value == 'on' ? i : el.value;
            });
    } catch(e){
        return e;
    }
    return undefined;
}

function getMeta(name) {
    return document.querySelector('meta[name="{1}"]'.format(name)).content;
}

try{
    if ($ && $.pnotify) {
        /**
         * Show notification
         * @param text string
         * @param title string
         * @param delay integer
         * @param type string
         */
        function openNoty(title, text, /*string=*/type, /*integer=*/delay) {
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
}catch (e){}


var JS_COMMENTS_RX = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

//
// Deprecated functions
//


/**
 * @deprecated
 * @type {*}
 */
//var Ajax = $ && makeObjInit({
//    init: function () {
//        /**
//         * Add jQuery Ajax.form handler
//         * @param done
//         * @param fail
//         * @param dataType
//         * @returns {$.fn}
//         * @param before
//         */
//        $.fn.setSubmit = function (done, fail, before, dataType) {
//            Ajax.setFormSubmit(this, done, fail, before, dataType);
//            return this;
//        };
//        /**
//         * @todo add (key), (keys), (key,val), (keys,vals)
//         * @param dataObj
//         */
//        $.fn.formData = function (dataObj) {
//            if (typeof dataObj == 'object') {
//                var self = this;
//                each(dataObj, function (val, key) {
//                    self.append($('<input/>', {type: 'hidden', name: key, value: val}));
//                });
//            }
//        };
//        /**
//         * Init ajax status animation icon
//         */
//        ($['ajaxSetup'] || $['ajaxSettings'])({
//            beforeSend: function (xhr1, xhr2) {
//                var statusParent = xhr2.statusParent;
//                if (statusParent) {
//                    xhr2.statusEl =
//                        $('<div/>', {class: 'status animation'})
//                            .css({opacity: 0})
//                            .appendTo(statusParent);
//                    setTimeout(function () {
//                        xhr2.statusEl.css({opacity: 1});
//                    });
//                }
//            },
//            complete: function () {
//                var statusEl = this.statusEl;
//                if (statusEl) {
//                    statusEl.css({opacity: 0});
//                    setTimeout(function () {
//                            statusEl.remove();
//                        },
//                        parseInt(statusEl.css('transition-duration'))
//                            * $s(statusEl.css('transition-duration')).match(/[a-z]+/i)[0].replaceMap({ms: 1, s: 1000})
//                    );
//                }
//            }
//        });
//    },
//    /**
//     * Send the form data via ajax
//     * @param form
//     * @param done
//     * @param fail
//     * @param dataType
//     * @param before
//     */
//    form: function (form, done, fail, before, dataType) {
//        var $form = $(form);
//        form = $form[0];
//        if (before){Ajax.form.onBeforeSubmit = before;}
//        Ajax.form.onBeforeSubmit && Ajax.form.onBeforeSubmit(form);
//        var options = {'type': form.method, 'url': form.action, 'cache': false, 'data': $form.serialize()};
//        if (dataType) {
//            options.dataType = dataType;
//        }
//        options.statusParent = form; // parent node for animation status block
//
//        $.ajax(options)
//            .done(function (resp) {
//                var isOk = (/\[\[Ok:.*\]\]/i.test(resp));
//                delayedSetter(done)(resp, isOk);
//                console.log(resp, isOk);
//                if(isOk){form.reset();}
//            })
//            .fail(function (nc, err) {
//                delayedSetter(fail)(nc, err);
//                console.log(nc, err);
//            });
//    },
//
//    /**
//     * Set form ajax submit handler
//     * Example $('form').setSubmit( function(){write success notify handler}, function(){write fail handler});
//     * @param form
//     * @param done
//     * @param fail
//     * @param dataType
//     * @param before
//     */
//    setFormSubmit: function (form, done, fail, before, dataType) {
//        $(form).on('submit', function (e) {
//            Ajax.form(form, done, fail, before, dataType);
//            e.preventDefault(); // prevent browser form submit
//        });
//    }
//});

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
    String.prototype.format = function() {
        var args = $a(arguments).v;
        args.unshift(null);
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined' ? args[number] : '';
        });
    };
}
/**
 * @deprecated by lodash
 * @example ['k','v'] --> {"k":"v"}
 */
function akv2okv(a) {
    var o = {};
    o[a[0]] = a[1];
    return o;
}

/**
 * @deprecated by lodash
 * @param func
 * @return {Function}
 */
function curry(func) {
    var curryArgs = [];
    if (typeof func !== 'function') {
        throw new Error('The first arguments must be function!');
    }
    for (var i = 1; i < arguments.length; i++) {
        curryArgs[i - 1] = arguments[i];
    }
    return function () {
        // convert arguments to array
        var argsArr = Array.prototype.slice.call(arguments, 0);
        curryArgs = curryArgs.concat(argsArr);
        return func.apply(this, curryArgs);
    }
}


/**
 * @deprecated by lodash
 * For each with return value
 * @param arr
 * @param fn
 * @returns {*}
 */
function forEach (arr, fn){
    var i = 0, l = arr.length;
    var result;
    for(i=0;i<l;++i){
        result = fn(arr[i],i,arr);
        if(result !== undefined) {
            return result;
        }
    }
    return null;
}

/**
 * @deprecated by lodash
 * forEach analogy for Objects
 * @param fn
 * @example each({1:1,2:2},function(v,i,a){console.log(v,i,a,'!!!');})
 */
var oEach, each = Function.prototype.call.bind(oEach = function (context_fn, fn) {
    var context;
    if (arguments.length === 1) {
        fn = context_fn;
    } else if (arguments.length === 2) {
        context = context_fn;
    } else {
        throw 'Too much arguments;';
    }
    // 'this' is given object
    for (var index in this) {
        if (this.hasOwnProperty(index)) {
            var value = this[index],
                array = this;
            fn.call(context || this, value, index, array);
        }
    }
    return this;
});

/**
 * @deprecated by lodash
 * $o(object) wrapper
 * @example $o({a:1,b:2}).each(function(el,prop,obj){console.log(el,prop);}); // --> a 1\n b 2
 * @param o object - wrapped object
 * @constructor
 */
var ObjectProxy = function (o) {
    this.obj = o;
    //
    // Wrapper methods
    this.each = function (fn) {
        (oEach.bind(this.obj))(fn);
        return this;
    }.bind(this);
    this.copy = function(){return Object.create(this.obj);}.bind(this);
    this.copyDeep = function clone(){
        var obj = this.obj;
        if(obj === null || typeof(obj) !== 'object') {
            return obj;
        }
        var temp = obj.constructor(); // changed
        this.each(function(el,key){
            temp[key] = $o(obj[key]).copyDeep();
        });
        return temp;
    }.bind(this);
    // put another methods here ...
}, ObjectProxyConstruct = function (o) {
    return new ObjectProxy(o);
}, $o = ObjectProxyConstruct;

/**
 * @deprecated by lodash
 * @param a
 * @constructor
 */
var ArrayProxy = function (a) {
    if (a) {
        if (a instanceof Array) {
            this.v = a;
        }
        else { // Convert array like object to array
            this.v = [].slice.call(a);
            if (!this.v || !this.v.length) {
                this.v = [a];
            }
        }
    } else {
        this.v = [];
    }
    this.each = Array.prototype.forEach.bind(this.v);
    this.obj = akv2okv.bind(this,this.v); // curry once
    this.fill = function(count,value){return this.v = new Array(1 + count).join(value).split('');}.bind(this);
    this.del = function(index){this.v.splice(index, 1); return this;}.bind(this);
    this.uniq = function(arr) {
        var hash = {}, outArr = [];
        arr.forEach(function(el) {
            if(!hash[el]) {hash[el] = true; outArr.push(el)}
        });
        return outArr;
    };
    this.push = function (el) {
        var newArray = $o(this.v).copyDeep();
        newArray.push(el);
        return newArray;
    }.bind(this);
    //
    // get value copy of array
    this.copy = function(){ return [].concat(this.v); }.bind(this);
    //
    // ...
}, ArrayProxyConstruct = function (o) {
    return new ArrayProxy(o);
}, $a = ArrayProxyConstruct;

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
    activate: function (/*=bool|function*/isSwitchOn, blurSelector) {
        Modal.onClose = function () {
        };
        if (isSwitchOn === undefined) {
            isSwitchOn = true;
        }
        else if (typeof isSwitchOn == 'function') {
            Modal.onClose = isSwitchOn;
            isSwitchOn = true;
        }
        if (Modal.isModal && isSwitchOn) {
            return false;
        }
        this.blurSelector = (!blurSelector) ? 'body>*:not(.modals)' : blurSelector;
        if (isSwitchOn) { // activate modal mode
            $('html').addClass('fixed'); // hide overflow
            Modal._$shut = $('<div/>', {class: 'shut shut-modal'}).appendTo('body'); // open shut
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
        }
        else {
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
        $(this.blurSelector ).removeClass('bg-blur');
        Modal.isModal = false;
        slidepage && (slidepage.isPageFreeze = false);
        //
        return true;
    }
};


function getFileSize (size) {
    var i = Math.floor(Math.log(size) / Math.log(1024)); // https://en.wikipedia.org/wiki/Logarithm#Change_of_base
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

