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

var
hasProp = Object.prototype.hasOwnProperty,
slice   = Array.prototype.slice;

function copyObj(from, to) {
    var name;
    for (name in from) {
        if (hasProp.call(from, name)) {
            to[name] = from[name];
        }
    }
}


CRL = (typeof CRL !== 'undefined' && Object(CRL) === CRL) ? CRL : {

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
                instancerArgs.push('a[' + i + ']');
            }
            this.instancers[argc] = instancer = new Function('c', 'a', 'return new c(' + instancerArgs.join(',') + ');');
        }

        if (typeof Class === 'function') {
            return instancer(Class, args);
        }

        throw Error('Runtime Error: trying to instanstiate no class');
    },

    createAndConf: function(Class, conf) {
        var
        obj, name;

        obj = new Class();
        for (name in conf) {
            if (hasProp.call(conf, name) && hasProp.call(obj, name)) {
                obj[name] = conf[name];
            }
        }
        return obj;
    },

    defineClass: function(Class, supers) {
        var superIds, len, i, _super;

        if (supers) {
            superIds = {};
            len      = supers.length;

            for (i = 0; i < len; i++) {
                _super = supers[i];
                if (_super.$classId) {
                    _super.$classId = this.idSeed++;
                }
                superIds[_super.$classId] = null;
                copyObj(superIds, _super.$superIds || {});

                if (typeof _super.$setupPrototype === 'function') {
                    _super.$setupPrototype.call(Class);
                }
                else {
                    copyObj(_super.prototype, Class.prototype);
                }
            }
        }

        if (typeof Class.$setupPrototype === 'function') {
            Class.$setupPrototype.call(Class);
        }

        Class.$classId  = this.idSeed++;
        Class.$superIds = superIds;
        Class.prototype.constructor = Class;
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

}).call(this);
