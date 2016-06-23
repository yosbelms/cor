(function(){
/*
CRL (Cor Runtime Library)
*/

var
hasProp = Object.prototype.hasOwnProperty,
slice   = Array.prototype.slice;

CRL = (typeof CRL === 'undefined' ? {} : CRL);

CRL.idSeed      = 1;
CRL.instancers  = [];
CRL.nativeTypes = {
    'String'   : String,
    'Number'   : Number,
    'Boolean'  : Boolean,
    'RegExp'   : RegExp,
    'Array'    : Array,
    'Object'   : Object,
    'Function' : Function
};

CRL.copyObj = function copyObj(from, to, strict) {
    var name;
    if (strict) {
        for (name in from) {
            if (hasProp.call(from, name)) {
                to[name] = from[name];
            }
        }
    }
    else {
        for (name in from) {
            to[name] = from[name];
        }   
    }

    return to;
};

CRL.create = function create(Class) {
    var
    instancerArgs,        
    args      = slice.call(arguments, 1),
    argc      = args.length,
    i         = -1,
    instancer = this.instancers[argc];

    if (! instancer) {
        instancerArgs = [];
        while (++i < argc) {
            instancerArgs.push('args[' + i + ']');
        }
        this.instancers[argc] = instancer = new Function('cls', 'args', 'return new cls(' + instancerArgs.join(',') + ');');
    }

    if (typeof Class === 'function') {
        return instancer(Class, args);
    }

    throw Error('Runtime Error: trying to instanstiate no class');
};

CRL.extend = function extend(Cls, baseCls) {
    CRL.copyObj(baseCls, Cls, true);

    function Proto() {
        this.constructor = Cls;
    }

    Proto.prototype = baseCls.prototype;
    Cls.prototype   = new Proto();
}


CRL.keys = function keys(obj) {
    var keys, i, len;

    if (obj instanceof Array) {            
        i    = -1;
        len  = obj.length;
        keys = [];

        while (++i < len) {
            keys.push(i);
        }
    }
    else {
        if (typeof Object.keys === 'function') {
            keys = Object.keys(obj);
        }
        else {
            for (i in obj) {
                if (hasProp.call(obj, i)) {
                    keys.push(i);
                }
            }
        }
    }

    return keys;
};

CRL.assertType = function assertType(obj, Class) {
    var type;

    // Class is a Class?
    if (typeof Class === 'function') {        
        // object is defined?
        if (typeof obj !== 'undefined') {
            if (obj instanceof Class) {
                return true;
            }
            // otherwise find the native type according to "Object.prototype.toString"
            else {
                type = Object.prototype.toString.call(obj);
                type = type.substring(8, type.length - 1);
                if(hasProp.call(this.nativeTypes, type) && this.nativeTypes[type] === Class) {
                    return true;
                }
            }
        }
        else {
            throw 'Trying to assert undefined object';
        }
    }
    else {
        throw 'Trying to assert undefined class';
    }

    return false;
};

})();


(function() {

// Lightweight non standard compliant Promise
function Promise(resolverFn) {
    if (typeof resolverFn !== 'function') {
        throw 'provided resolver must be a function';
    }

    var p = this;

    // this.value;
    // this.reason;
    this.completed      = false;
    this.thenListeners  = [];
    this.catchListeners = [];

    resolverFn(
        function resolve(value){
            Promise.resolve(p, value);
        },
        function reject(reson) {
            Promise.reject(p, reason);
        }
    );
}

Promise.prototype = {

    then: function(fn) {
        this.thenListeners.push(fn);
        if (this.completed) {
            Promise.resolve(this, this.value);
        }
        return this;
    },

    catch: function(fn) {
        this.catchListeners.push(fn);
        if (this.completed) {
            Promise.reject(this, this.reason);
        }
        return this;
    }
};

Promise.resolve = function resolve(p, value) {
    p.thenListeners.forEach(function(listener) {
        listener(value);
    })

    p.completed = true;
    p.value     = value;
};

Promise.reject = function reject(p, reason) {
    p.catchListeners.forEach(function(listener){
        listener(reason);
    })

    p.completed = true;
    p.reason    = reason;
};

CRL.Promise = Promise;

})();

// Coroutines
(function(global) {

// polyfill Promise
if (typeof Promise !== 'function') {
    Promise = CRL.Promise;
}

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

// Generator Runner
CRL.go = function go(genf, ctx) {
    var state, gen = genf.apply(ctx || {});

    return new CRL.Promise(function(resolve, reject) {
        schedule(next);
        //next();

        function next(value) {
            state = gen.next(value);
            value = state.value;

            if (isPromise(value)) {
                value.then(function(value) {
                    next(value);
                })
                return;
            }

            if (state.done) {
                resolve(value);
            } else {
                next(value);
            }
        }
    })
}

// receiver
CRL.receive = function receive(value) {
    return value;
}

// sender
CRL.send = function send(channel, value) {
    return channel.send(value);
}

})(this);
