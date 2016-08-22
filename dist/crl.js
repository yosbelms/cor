/*
Cor is released under the BSD license:

Copyright 2015 (c) Yosbel Marin <yosbel.marin@gtm.jovenclub.cu>

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

    * Redistributions of source code must retain the above
      copyright notice, this list of conditions and the following
      disclaimer.

    * Redistributions in binary form must reproduce the above
      copyright notice, this list of conditions and the following
      disclaimer in the documentation and/or other materials
      provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
SUCH DAMAGE.
*/
(function(){
/*
CRL (Cor Runtime Library)
*/

CRL = (typeof CRL === 'undefined' ? {} : CRL);

var
hasProp     = Object.prototype.hasOwnProperty,
toString    = Object.prototype.toString,
nativeTypes = {
    'String'   : String,
    'Number'   : Number,
    'Boolean'  : Boolean,
    'RegExp'   : RegExp,
    'Array'    : Array,
    'Object'   : Object,
    'Function' : Function
};

// copy object own properties from an source `src` to a destiny `dst`
// returns the destiny object
CRL.copyObj = Object.assign ? Object.assign : function copyObj(dest, src) {
    var name;

    for (name in src) {
        if (hasProp.call(src, name)) {
            dest[name] = src[name];
        }
    }

    return dest;
};

// convert a class in a subclass of other class
// CRL.subclass(Subclass, Superclass)
CRL.subclass = function subclass(subClass, superClass) {
    CRL.copyObj(subClass, superClass);

    function Proto() {
        this.constructor = subClass;
    }

    Proto.prototype    = superClass.prototype;
    subClass.prototype = new Proto();
}

// extract keys from an object or array
// CRL.keys([5, 7, 3])    -> [0, 1, 2]
// CRL.keys({x: 2, y: 4}) -> ['x', 'y']
CRL.keys = function keys(obj) {
    var keys, i, len;

    // is array
    if (obj instanceof Array) {            
        i    = -1;
        len  = obj.length;
        keys = [];

        while (++i < len) {
            keys.push(i);
        }

        return keys;
    }

    // if has key function
    if (typeof Object.keys === 'function') {
        return Object.keys(obj);
    }

    // otherwise polyfill it
    for (i in obj) {
        if (hasProp.call(obj, i)) {
            keys.push(i);
        }
    }
    return keys;
};

// whether a object is instance of a class or not
// CRL.assertType({}, Object)
// CRL.assertType(person, Person)
CRL.assertType = function assertType(obj, Class) {
    var type;

    if (Class === void 0) {
        return obj === void 0;
    }

    if (typeof Class !== 'function') {
        throw 'Trying to assert invalid class';
    }

    if (typeof obj === 'undefined') {
        throw 'Trying to assert undefined object';
    }

    // try with instanceof
    if (obj instanceof Class) {
        return true;
    }

    // try with finding the native type according to "Object.prototype.toString"
    type = toString.call(obj);
    type = type.substring(8, type.length - 1);
    if(hasProp.call(nativeTypes, type) && nativeTypes[type] === Class) {
        return true;
    }

    return false;
};

CRL.regex = function regex(pattern, flags) {
    return new RegExp(pattern, flags);
}

})();


(function(global) {

// Lightweight non standard compliant Promise
function Promise(resolverFn) {
    if (typeof resolverFn !== 'function') {
        throw 'provided resolver must be a function';
    }

    var p = this;

    // this.value;
    // this.reason;
    this.completed      = false;
    this.fail           = false;
    this.success        = false;
    this.thenListeners  = [];
    this.catchListeners = [];

    resolverFn(
        function resolve(value){
            Promise.doResolve(p, value);
        },
        function reject(reason) {
            Promise.doReject(p, reason);
        }
    );
}

Promise.prototype = {

    then: function(onSuccess, onFail) {
        if (isFunction(onSuccess)) {
            // proactive add
            this.thenListeners.push(onSuccess);
            if (this.success) {
                Promise.doResolve(this, this.value);
            }
        }

        if (isFunction(onFail)) {
            // proactive add
            this.catchListeners.push(onFail);
            if (this.fail) {
                Promise.doReject(this, this.reason);
            }
        }
    },

    catch: function(onFail) {
        this.then(null, onFail);
    }
};

Promise.doResolve = function doResolve(p, value) {
    p.thenListeners.forEach(function(listener) {
        listener(value);
    })

    p.success   = true;
    p.value     = value;
    p.completed = true;
};

Promise.doReject = function doReject(p, reason) {

    if (p.catchListeners.length === 0) {
        console.log('Uncaught (in promise): ' + reason);
    }

    p.catchListeners.forEach(function(listener) {
        listener(reason);
    })

    p.fail      = true;
    p.reason    = reason;
    p.completed = true;
};

Promise.all = function all(array) {
    var promise,
    i          = -1,
    numPending = 0,
    result     = [],
    len        = array.length;

    return new Promise(function(resolve) {
        while (++i < len) {
            promise = array[i];
            if (isPromise(promise)) {
                setupThen(promise, i);
            }
            else {
                result[i] = array[i];
                tryToResolve();
            }
        }

        function setupThen(promise, i) {
            numPending++;

            // default value
            result[i] = void 0;

            promise.then(function(value) {
                result[i] = value;
                numPending--;
                tryToResolve();
            })
        }

        function tryToResolve() {
            if (numPending === 0) {
                resolve(result)
            }
        }
    })
}

Promise.defer = function defer() {
    var deferred     = {};
    // use CRL.Promise
    deferred.promise = new CRL.Promise(function(resolve, reject) {
        deferred.resolve = resolve;
        deferred.reject  = reject;
    })

    return deferred;
}


CRL.Promise = Promise;

// polyfill Promise
if (typeof global.Promise !== 'function') {
    global.Promise = CRL.Promise;
}

// Coroutines
// Schedule
function schedule(fn, time) {
    if (time === void 0 && typeof global.setImmediate !== 'undefined') {
        setImmediate(fn);
    } else {
        setTimeout(fn, +time);
    }
}

function isPromise(p) {
    return p && typeof p.then === 'function';
}

function isFunction(f) {
    return typeof f === 'function';
}

function isObject(obj) {
    return obj && Object == obj.constructor;
}

function isArray(arr) {
    return Array.isArray(arr);
}

// Generator Runner
CRL.go = function go(genf, ctx) {
    var state, gen = genf.apply(ctx || {});

    return new CRL.Promise(function(resolve, reject) {
        // ensure it runs asynchronously
        schedule(next);

        function next(value) {
            if (state && state.done) {
                resolve(value);
                return;
            }

            try {
                state = gen.next(value);
                value = state.value;
            } catch (e) {
                console.error(e.stack ? '\n' + e.stack : e);
                return;
            }

            if (isPromise(value)) {
                value.then(
                    function onFulfilled(value) {
                        next(value)
                    },
                    function onRejected(reason) {
                        gen.throw(reason)
                    }
                )
                return;
            }

            next(value);
        }
    })
}

// convert to promise as much possible
function toPromise(obj) {
    if (isPromise(obj)) {
        return obj;
    }

    if (isArray(obj)) {
        return arrayToPromise(obj);
    }

    if (isObject(obj)) {
        return objectToPromise(obj);
    }
}

// convert array to promise
function arrayToPromise(array) {
    var promise;
    return CRL.Promise.all(array.map(function(value) {
        promise = toPromise(value);
        if (isPromise(promise)) {
            return promise;
        }

        return value;
    }));
}

// convert object to promise
function objectToPromise(obj) {
    var key, promise, ret,
    promises = [],
    result   = {},
    i        = -1,
    keys     = Object.keys(obj),
    len      = keys.length;

    ret = new CRL.Promise(function(resolve) {

        while (++i < len) {
            key     = keys[i];
            promise = toPromise(obj[key]);
            if (isPromise(promise)) {
                setupThen(promise, key);
            }
            else {
                result[key] = obj[key];
            }
        }

        CRL.Promise.all(promises).then(function() {
            resolve(result);
        })

        function setupThen(promise, key) {
            // default value
            result[key] = void 0;

            promise.then(function(value) {
                result[key] = value;
            })

            promises.push(promise);
        }

    })

    return ret;
}

// receiver
CRL.receive = function receive(obj) {
    var prom;

    if (obj && isFunction(obj.receive)) {
        return obj.receive();
    }

    prom = toPromise(obj);
    if (isPromise(prom)) {
        return prom;
    }

    return obj;
}

// sender
CRL.send = function send(obj, value) {
    if (obj && isFunction(obj.send)) {
        return obj.send(value);
    }
    throw 'unable to receive values';
}


function timeout(time) {
    if (!isNaN(time) && time !== null) {
        return new CRL.Promise(function(resolve) {
            schedule(resolve, time)
        })
    }

    throw 'Invalid time';
}

CRL.timeout = timeout;

// Buffer: simple array based buffer to use with channels
function Buffer(size) {
    this.size  = isNaN(size) ? 1 : size;
    this.array = [];
}

Buffer.prototype = {

    read: function() {
        return this.array.shift();
    },

    write: function(value) {
        if (this.isFull()) { return false }
        this.array.push(value);
        return true;
    },

    isFull: function() {
        return !(this.array.length < this.size);
    },

    isEmpty: function() {
        return this.array.length === 0;
    }
}

function isBuffer(b) {
    return (b
        && isFunction(b.read)
        && isFunction(b.write)
        && isFunction(b.isFull)
        && isFunction(b.isEmpty));
}

// Channel: a structure to transport messages
function indentityFn(x) {return x}

function scheduledResolve(deferred, value) {
    schedule(function() { deferred.resolve(value) })
}

function Channel(buffer, transform) {
    this.buffer           = buffer;
    this.closed           = false;
    this.data             = void 0;
    this.senderPromises   = [];
    this.receiverPromises = [];
    this.transform        = transform || indentityFn;
}

Channel.prototype = {

    receive: function() {
        var data, deferred;

        // is unbuffered
        if (! this.buffer) {
            // there is data?
            if (this.data !== void 0) {
                // resume the first sender coroutine
                if (this.senderPromises[0]) {
                    scheduledResolve(this.senderPromises.shift());
                }
                // clean and return
                data      = this.data;
                this.data = void 0;
                return data;

            // if no data
            } else {
                // suspend the coroutine wanting to receive
                deferred = Promise.defer();
                this.receiverPromises.push(deferred);
                return deferred.promise;
            }
        }

        // if buffered
        // empty buffer?
        if (this.buffer.isEmpty()) {
            // suspend the coroutine wanting to receive
            deferred = Promise.defer();
            this.receiverPromises.push(deferred);
            return deferred.promise;

        // some value in the buffer?
        } else {
            // resume the first sender coroutine
            if (this.senderPromises[0]) {
                scheduledResolve(this.senderPromises.shift());
            }
            // clean and return
            return this.buffer.read();
        }
    },

    send: function(data) {
        if (this.closed) { throw 'closed channel' }
        var deferred;

        // is unbuffered
        if (! this.buffer) {
            // some stored data?
            if (this.data !== void 0) {
                // deliver data to the first waiting coroutine
                if (this.receiverPromises[0]) {
                    scheduledResolve(this.receiverPromises.shift(), this.data);
                }

            // no stored data?
            } else {
                // pass sent data directly to the first waiting for it
                if (this.receiverPromises[0]) {
                    this.data = void 0;
                    scheduledResolve(this.receiverPromises.shift(), this.transform(data));
                    // schedule the the sender coroutine
                    return timeout(0);
                }
            }

            // else, store the transformed data
            this.data = this.transform(data);
            deferred = Promise.defer();
            this.senderPromises.push(deferred);
            return deferred.promise;
        }

        // if buffered
        // emty buffer?
        if (! this.buffer.isFull()) {
            // TODO: optimize below code
            // store sent value in the buffer
            this.buffer.write(this.transform(data));
            // if any waiting for the data, give it
            if (this.receiverPromises[0]) {
                scheduledResolve(this.receiverPromises.shift(), this.buffer.read());
            }
        }

        // full buffer?
        if (this.buffer.isFull()) {
            // stop until the buffer start to be drained
            deferred = Promise.defer();
            this.senderPromises.push(deferred);
            return deferred.promise;
        }
    },

    close: function() {
        this.closed         = true;
        this.senderPromises = [];
        while (this.receiverPromises.length) {
            scheduledResolve(this.receiverPromises.shift());
        }
    }
}

CRL.Channel = Channel;

CRL.chan = function chan(size, transform) {
    if (isBuffer(size)) {
        return new Channel(size, transform);
    }

    // isNaN(null) == false  :O
    if (isNaN(size) || size === null) {
        return new Channel(null, transform);
    }

    return new Channel(new Buffer(size), transform);
}

})(this);
