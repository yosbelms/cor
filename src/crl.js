(function(){
/*
CRL (Cor Runtime Library)
*/
if (typeof global === 'undefined') {
    global = window;
}

var o         = global;
o.crl_hasProp = Object.prototype.hasOwnProperty;
o.crl_slice   = Array.prototype.slice;
o.crl_Object  = Object;

o.crl_mergeObject = function(obj, add) {
    var name;
    for (name in add) {
        if (crl_hasProp.call(add, name)) {
            obj[name] = add[name];
        }
    }
}

o.crl_instancers = [];
o.crl_new = function(cls) {
    var
    args = crl_slice.call(arguments, start),
    argc = args.length,
    i    = -1,
    instancer = crl_instancers[argc];

    if (! instancer) {
        var xargs = [];
        while (++i < argc) {
            xargs.push('a[' + i + ']');
        }
        crl_instancers[argc] = instancer = new Function('c', 'a', 'return new c(' + xargs.join(',') + ');');
    }

    if (typeof cls === 'function') {
        return instancer(cls, args);
    }

    throw Error('Runtime Error: trying to instanstiate no class');
}

o.crl_newByConf = function(cls, conf) {
    var instance, name;
    instance = new cls();
    for (name in conf) {
        if (crl_hasProp.call(conf, name) && crl_hasProp.call(instance, name)) {
            instance[name] = conf[name];
        }
    }
    return instance;
}

o.crl_setProp = function(obj, prop, value) {
    obj && (typeof obj.setProperty === 'function') && obj.setProperty(prop, value);
    return value;
}

o.crl_classIdSeed     = 1;
o.crl_classRegistry   = {};
o.crl_Class           = function(){this.$plugins = []};
o.crl_Class.prototype = {

    $init: function(){
        typeof this.$setup === 'function' && this.$setup.apply(this, arguments);
    },

    $class: crl_Class,

    // plugins executed before construct
    // $plugins: [],
}

o.crl_genClassId = function() {
    return 'class-' + (crl_classIdSeed++);
}

// combine
o.crl_defineClass = function(Class, supers) {
    var
    i, len, sup, superIds,
    id    = crl_genClassId(),
    proto = new crl_Class();

    if (supers) {
        superIds = {};
        len      = supers.length;

        for (i = 0; i < len; i++) {
            sup = supers[i];
            superIds[sup.$classId] = null;
            crl_mergeObject(superIds, sup.$superIds);
            sup.$classBody.call(proto);
        }
    }

    proto.$class    = crl_classRegistry[id] = Class;
    Class.prototype = proto;
    Class.$classId  = id;
    Class.$superIds = superIds;
    Class.$classBody.call(proto);
};


o.crl_assertType = function(obj, Class) {
    var ret, clsId, superIds, objCls, type,
    nativeTypes = {
        'String'   : String,
        'Number'   : Number,
        'Boolean'  : Boolean,
        'RegExp'   : RegExp,
        'Array'    : Array,
        'Object'   : Object,
        'Function' : Function,

    };

    if (typeof Class === 'function') {
        if (typeof obj !== 'undefined') {
            clsId  = Class.$classId;
            objCls = obj.$class;
            if (clsId && objCls) { //is a cor class
                superIds = objCls.$superIds;
                if (objCls.$classId === clsId || crl_hasProp.call(superIds, clsId)) {
                    return Class;
                }
            }
            else if (obj instanceof Class) {
                return obj.constructor;
            }
            else {
                type = Object.prototype.toString.call(obj);
                type = type.substring(8, type.length-1);
                if(crl_hasProp.call(nativeTypes, type) && nativeTypes[type] === Class) {
                    return Class;
                }
            }
        }
    }
    else {
        throw 'Provided type must be a class';
    }
};

o.crl_keys = function(object) {
    var keys = [], i, len;

    if (object instanceof Array) {
        for (i = 0, len = object.length; i < len; i++) {
            keys.push(i);
        }
    }
    else {
        if (Object.keys) {
            keys = Object.keys(object);
        }
        else {
            for (i in object) {
                if (crl_hasProp.call(object, i)) {
                    keys.push(i);
                }
            }
        }
    }

    return keys;
}

}).call(this);
