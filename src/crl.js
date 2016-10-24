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
CRL.copy = Object.assign ? Object.assign : function copy(dest, src) {
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
    CRL.copy(subClass, superClass);

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
        console.error('Uncaught (in promise): ' + reason);
    }

    p.catchListeners.forEach(function(listener) {
        listener(reason);
    })

    p.fail      = true;
    p.reason    = reason;
    p.completed = true;
};

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
    return p && typeof p.then === 'function' && typeof p.catch === 'function';
}

function isFunction(f) {
    return typeof f === 'function';
}

function isChannel(ch) {
    return ch instanceof Channel;
}

CRL.isChannel = isChannel;

function timeout(time, v) {
    if (!isNaN(time) && time !== null) {
        return new CRL.Promise(function(resolve) {
            schedule(function() { resolve(v) }, time)
        })
    }

    throw 'Invalid time';
}

CRL.timeout = timeout;

// Generator Runner (Corountines)
CRL.go = function go(genf, _this) {
    var state, promise,
    gen = genf.call(_this || {});

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
                // blocked
                value.then(
                    function onFulfilled(value) {
                        next(value);
                    },
                    function onRejected(reason) {
                        gen.throw(reason);
                    }
                )
                return;
            }

            next(value);
        }
    })
}

// Buffer: array based buffer to use with channels
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

function scheduleResolveDeferred(deferred, value) {
    schedule(function() { deferred.resolve(value) })
}

function detachAllPromises(array) {
    var promise, reg, i, j;

    for (i = 0; i < array.length; i++) {
        promise = array[i];

        if (isPromise(promise) && promise.registry) {
            // detach the promise from its registry
            reg = promise.registry;
            for (j = 0; j < reg.length; j++) {
                if (reg[j].promise === promise) {
                    reg.splice(j, 1);
                    break;
                }
            }
        }
    }
}

// Channel: a structure to transport messages
function Channel() {
    this.closed         = false;
    this.data           = void 0;
    this.senderPromises = [];
    this.recverPromises = [];
}

Channel.prototype = {

    isFull: function() {
        return this.data !== void 0;
    },

    hasData: function() {
        return this.data !== void 0;
    },

    newSenderPromise: function() {
        var deferred = Promise.defer();
        this.senderPromises.push(deferred);
        // add a reference to the regsitry for easy detach
        deferred.promise.registry = this.senderPromises;
        return deferred.promise;
    },

    newRecverPromise: function() {
        var deferred = Promise.defer();
        this.recverPromises.push(deferred);
        // add a reference to the regsitry for easy detach
        deferred.promise.registry = this.recverPromises;
        return deferred.promise;
    },

    performRecv: function() {
        var data  = this.data;
        this.data = void 0;
        this.unblockSender();
        return data;
    },

    performSend: function(data) {
        if (this.closed) {
            throw 'closed channel'
        }
        this.data = data;
        this.unblockReceiver();
        return timeout(0);
    },

    unblockSender: function() {
        if (this.senderPromises.length) {
            // async unblock the first sender
            scheduleResolveDeferred(this.senderPromises.shift(), true);
            //this.senderPromises.shift().resolve(true);
        }
    },

    unblockReceiver: function() {
        if (this.recverPromises.length) {
            // inmediately unblock the first receiver
            this.recverPromises.shift().resolve(true);
        }
    },

    close: function() {
        this.closed         = true;
        this.senderPromises = [];
        while (this.recverPromises.length) {
            scheduleResolveDeferred(this.recverPromises.shift(), false);
        }
    }
}

// Buffered Channel
function BufferedChannel(buffer) {
    Channel.call(this);
    this.buffer = buffer;
}

BufferedChannel.prototype = new Channel();

CRL.copy(BufferedChannel.prototype, {

    senderPromises: null,

    recverPromises: null,

    isFull: function() {
        return this.buffer.isFull();
    },

    hasData: function() {
        return !this.buffer.isEmpty();
    },

    performRecv: function() {
        var data = this.buffer.read();
        this.unblockSender();
        return data;
    },

    performSend: function(data) {
        if (this.closed) { throw 'closed channel' }
        this.buffer.write(data);
        this.unblockReceiver();
    }
})

// send
CRL.requestSend = function requestSend(ch) {
    if (! isChannel(ch)) {
        throw 'invalid channel';
    }

    if (ch.isFull()) {
        return ch.newSenderPromise();
    }

    return true;
}

CRL.performSend = function performSend(ch, value) {
    if (! isChannel(ch)) {
        throw 'invalid channel';
    }

    return ch.performSend(value);
}

// receive
// returns true if 'receive' can be performed
// returns a promise otherwise
CRL.requestRecv = function requestRecv(obj) {
    if (isChannel(obj)) {
        if (obj.hasData()) {
            return true;
        } else {
            return obj.newRecverPromise();
        }
    }

    return true;
}

// a special case is this request receiveing for select statement
// where Promises are passed through
CRL.requestRecvForSelect = function requestRecvForSelect(obj) {
    if (isPromise(obj)) {
        return obj;
    }
    return CRL.requestRecv(obj);
}

CRL.performRecv = function performRecv(obj) {
    if (isChannel(obj)) {
        return obj.performRecv();
    }

    return obj;
}

// select
CRL.select = function select(array) {
    var i, ready = [];

    // look for ready promises
    for (var i = 0; i < array.length; i++) {
        if (array[i] === true) {
            ready.push(i);
        }
    }

    // select one of it if there is some value
    if (ready.length) {
        // perform random selection
        return ready[Math.floor(Math.random() * ready.length)];
    }

    // return a Promise that resolves once some Promise
    // is resolved. Detach promises from Channels where they are binded
    return new CRL.Promise(function(resolve) {
        var promise, isResolved = false;

        array.forEach(function(promise, index) {
            setupThen(promise, index, resolve);
        })

        function setupThen(promise, index, resolve) {
            promise.then(function(value) {
                if (isResolved) { return }
                isResolved = true;
                resolve(index);
                // remove other promises
                detachAllPromises(array);
            })
        }
    })
}

CRL.chan = function chan(size) {
    // isNaN(null) == false  :O
    if (isNaN(size) || size === null) {
        return new Channel();
    }

    return new BufferedChannel(new Buffer(size));
}

})(this);