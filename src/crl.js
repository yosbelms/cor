(function(){
/*
CRL (Cor Runtime Library)
*/

var
hasProp = Object.prototype.hasOwnProperty,
slice   = Array.prototype.slice;

if (typeof CRL !== 'undefined') {
    return;
}

CRL = {

    idSeed      : 1,
    instancers  : [],
    nativeTypes : {
        'String'   : String,
        'Number'   : Number,
        'Boolean'  : Boolean,
        'RegExp'   : RegExp,
        'Array'    : Array,
        'Object'   : Object,
        'Function' : Function
    },

    copyObj: function(from, to, strict) {
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
    },

    create: function(Class) {
        var
        instancerArgs,        
        args      = slice.call(arguments, 1),
        argc      = args.length,
        i         = -1,
        instancer = this.instancers[argc];

        if (! instancer) {
            var instancerArgs = [];
            while (++i < argc) {
                instancerArgs.push('args[' + i + ']');
            }
            this.instancers[argc] = instancer = new Function('cls', 'args', 'return new cls(' + instancerArgs.join(',') + ');');
        }

        if (typeof Class === 'function') {
            return instancer(Class, args);
        }

        throw Error('Runtime Error: trying to instanstiate no class');
    },
    
    applyConf: function(obj, conf) {
        if (conf instanceof this.Conf) {
            this.copyObj(conf.data, obj, true);
            return true;
        }
        return false;
    },

    defineClass: function(Class, supers) {
        var
        len, i, _super,
        superIds,
        newProto = {};

        if (supers) {
            superIds = {};
            len      = supers.length;

            for (i = 0; i < len; i++) {
                _super = supers[i];
                if (_super.$classId) {
                    _super.$classId = this.idSeed++;
                }
                superIds[_super.$classId] = null;
                this.copyObj(superIds, _super.$superIds || {});
                this.copyObj(_super.prototype, newProto);
            }
        }
        
        this.copyObj(Class.prototype, newProto);

        newProto.constructor = Class;

        Class.$classId  = this.idSeed++;
        Class.$superIds = superIds;
        Class.prototype = newProto;
    },


    keys: function(obj) {
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
    },

    assertType: function(obj, Class) {
        var
        ret, classId,
        superIds, type,
        objectClass;

        // it is a Class?
        if (typeof Class === 'function') {

            // object is defined
            if (typeof obj !== 'undefined') {
                classId     = Class.$classId;
                objectClass = obj.constructor;

                //is a cor class
                if (classId && objectClass) {
                    superIds = objectClass.$superIds;
                    if (typeof objectClass.$classId !== 'undefined') {
                        // if the type is it's own or is of a combined class
                        if (objectClass.$classId === classId || hasProp.call(superIds, classId)) {
                            return Class;
                        }    
                    }
                }

                // it is for non cor classes
                else if (obj instanceof Class) {
                    return obj.constructor;
                }

                // otherwise find the native type according to "Object.prototype.toString"
                else {
                    type = Object.prototype.toString.call(obj);
                    type = type.substring(8, type.length - 1);
                    if(hasProp.call(this.nativeTypes, type) && this.nativeTypes[type] === Class) {
                        return Class;
                    }
                }
            }
        }
        else {
            throw 'Trying to assert type with not valid class';
        }
    }
};


CRL.Conf = function(obj) {
    this.data = obj || {};
};

}).call(this);
