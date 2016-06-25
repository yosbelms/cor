(function(){
/*
CRL (Cor Runtime Library)
*/

CRL = (typeof CRL === 'undefined' ? {} : CRL);

var
hasProp     = Object.prototype.hasOwnProperty,
toString    = Object.prototype.toString,
slice       = Array.prototype.slice,

// store function that instantiate classes
// whith different quantity of arguments
instancers  = [],
nativeTypes = {
    'String'   : String,
    'Number'   : Number,
    'Boolean'  : Boolean,
    'RegExp'   : RegExp,
    'Array'    : Array,
    'Object'   : Object,
    'Function' : Function
};

// copy properties from an object to another
// returns the object which properties has been copied to
CRL.copyObj = function copyObj(from, to) {
    var name;

    for (name in from) {
        if (hasProp.call(from, name)) {
            to[name] = from[name];
        }
    }

    return to;
};

// creates an instance of a class
// CRL.create(Class, arg1, arg2, ...)
CRL.create = function create(Class) {
    if (typeof Class !== 'function') {
        throw Error('Runtime Error: trying to instanstiate no class');
    }

    var
    instancerArgs,        
    args      = slice.call(arguments, 1),
    argc      = args.length,
    i         = -1,
    instancer = instancers[argc];

    if (! instancer) {
        instancerArgs = [];

        while (++i < argc) {
            instancerArgs.push('args[' + i + ']');
        }

        instancer = instancers[argc] = new Function(
            'cls',
            'args',
            'return new cls(' + instancerArgs.join(',') + ');'
        );
    }

    return instancer(Class, args);
};

// convert a class in a subclass of other class
// CRL.subclass(Subclass, Superclass)
CRL.subclass = function subclass(subClass, superClass) {
    CRL.copyObj(superClass, subClass);

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

    if (typeof Class !== 'function') {
        throw 'Trying to assert undefined class';
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
