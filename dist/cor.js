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
(function(){
    cor = (typeof cor === 'undefined' ? {} : cor);

    var    
    isBrowser   = typeof window !== 'undefined' &&
                  typeof window.document !== 'undefined',
    isNode      = ! isBrowser &&
                  typeof global !== 'undefined' &&
                  typeof process !== 'undefined';

    if (isBrowser) {
        global = window;
    }

    cor.isBrowser = isBrowser;
    cor.isNode    = isNode;

    cor.compile = function(src, filename) {
        var
        comp = new cor.Compiler(src, filename),
        ast  = comp.parse(),
        js   = comp.compile(ast);

        return js;
    };

    cor.run = function(src, require, module, exports) {
        exports = exports || {};
        require = require || function(){};
        module  = module  || {exports: exports};

        var
        PROG,
        js = this.compile(src);

        eval('var PROG=function(require,module,exports){var PROG;' + js + '};');
        PROG(require, module, exports);

        return module.exports;
    };

})();

(function(cor){

/*
A library to provide some OO features across
Cor source code


Usage:
var
Class = cor.Class;

var A = Class({
    init: function(){
        this.xx = true;
        this.y()
    },

    y: function(){
        console.log('A')
    }
})

var B = Class(A, {
    y: function(){
        this.base('y')
        console.log('B')
    }
})


var C = Class(B, {
    y: function(){
        this.base('y')
        console.log('C')
    }
})

c = new C()
c;
*/


var
hasProp = Object.prototype.hasOwnProperty;

function Class(Base, classBody){
    if (! classBody){
        classBody = Base || {};
        Base      = function(){};
    }

    var
    key, member,
    base  = newBaseMethod(),
    Class = newClass(),
    proto = Object.create(Base.prototype);

    for (key in classBody) {
        if (! hasProp.call(classBody, key)){
            continue;
        }
        member = classBody[key];
        if (typeof member === 'function') {
            member.$owner = Class;
        }
        proto[key] = classBody[key];
    }

    proto._base_    = Base;
    proto.base      = base;
    Class.prototype = proto;

    return Class;
};


function newClass() {
    return function() {
        (typeof this.init === 'function') && this.init.apply(this, arguments);
    };
}

function newBaseMethod() {
    return function base(methodName, args){
        var
        callerMethod = this.base.caller,
        meth = callerMethod.$owner.prototype._base_.prototype[methodName];

        if (typeof meth === 'function') {
            return meth.apply(this, args);
        }
        throw "Can not find the base method '" + methodName + "'";
    };
}

cor.Class = Class;

})(typeof cor === 'undefined' ? {} : cor);

/* parser generated by jison 0.4.15 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var CorParser = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[2,4],$V1=[1,11],$V2=[1,14],$V3=[1,9],$V4=[1,10],$V5=[1,12],$V6=[5,9,10,22,26,37],$V7=[1,24],$V8=[5,9,10,14,16,18,22,24,26,28,30,33,37,49,105,106,109,111,112,113,114,115,116,117,118,122,123,126,131,137,139],$V9=[5,22],$Va=[1,42],$Vb=[1,55],$Vc=[1,51],$Vd=[1,50],$Ve=[1,52],$Vf=[1,53],$Vg=[1,54],$Vh=[1,46],$Vi=[1,47],$Vj=[1,48],$Vk=[1,49],$Vl=[1,63],$Vm=[1,40],$Vn=[1,66],$Vo=[1,64],$Vp=[1,65],$Vq=[5,9,10,14,16,18,22,26,30,33,37,137,139],$Vr=[2,166],$Vs=[1,74],$Vt=[1,75],$Vu=[1,76],$Vv=[1,77],$Vw=[5,9,10,14,16,18,22,26,30,33,37,49,105,106,118,122,126,137,139],$Vx=[1,78],$Vy=[1,79],$Vz=[1,80],$VA=[1,81],$VB=[1,82],$VC=[1,83],$VD=[1,84],$VE=[2,94],$VF=[5,9,10,14,16,18,22,26,30,33,37,49,105,106,111,112,113,114,115,116,117,118,122,126,137,139],$VG=[5,9,10,14,16,18,22,24,26,28,30,33,37,49,105,106,109,111,112,113,114,115,116,117,118,120,122,123,126,131,137,139],$VH=[2,91],$VI=[2,108],$VJ=[1,91],$VK=[1,88],$VL=[1,89],$VM=[1,90],$VN=[5,9,10,14,16,18,22,26,28,30,33,37,49,105,106,109,111,112,113,114,115,116,117,118,122,123,126,131,137,139],$VO=[2,96],$VP=[1,103],$VQ=[1,104],$VR=[1,109],$VS=[30,33],$VT=[1,118],$VU=[2,10],$VV=[1,117],$VW=[1,134],$VX=[1,132],$VY=[1,133],$VZ=[1,142],$V_=[1,140],$V$=[1,143],$V01=[1,141],$V11=[1,147],$V21=[1,148],$V31=[1,149],$V41=[1,150],$V51=[1,151],$V61=[1,152],$V71=[1,153],$V81=[1,159],$V91=[1,157],$Va1=[1,146],$Vb1=[1,155],$Vc1=[1,154],$Vd1=[1,144],$Ve1=[1,156],$Vf1=[1,145],$Vg1=[1,158],$Vh1=[1,171],$Vi1=[1,172],$Vj1=[2,33],$Vk1=[1,198],$Vl1=[1,199],$Vm1=[1,200],$Vn1=[1,201],$Vo1=[1,202],$Vp1=[1,206],$Vq1=[1,203],$Vr1=[1,204],$Vs1=[1,205],$Vt1=[10,18,22,26],$Vu1=[18,22],$Vv1=[14,105,106,111,112,113,114,115,116,117,118],$Vw1=[1,228],$Vx1=[10,26,28,30,38,93,94,95,96,105,106,107,108,117,118,133,135,138],$Vy1=[10,18,22,26,28,38,51,56,64,69,71,73,78,80,84,87,93,94,95,96,105,106,107,108,117,118,133,135,138],$Vz1=[1,245],$VA1=[2,39],$VB1=[1,246],$VC1=[2,40],$VD1=[1,247],$VE1=[2,213],$VF1=[1,260],$VG1=[1,261],$VH1=[16,18,22],$VI1=[2,129],$VJ1=[1,282],$VK1=[1,287],$VL1=[1,288],$VM1=[2,214],$VN1=[1,307],$VO1=[1,308],$VP1=[18,69,71],$VQ1=[1,333],$VR1=[1,334],$VS1=[1,335];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"Module":3,"Source":4,"EOF":5,"GlobalStmt":6,"GlobalStmtNoSemicolon":7,"ClassStmt":8,"CLASS":9,"IDENT":10,"ClassStmt_option0":11,"ClassBlock":12,"ExtendsStmt":13,":":14,"QualifiedIdent":15,"{":16,"MemberList":17,"}":18,"Member":19,"MemberNotSemicolon":20,"PropertyDecl":21,";":22,"FunctionStmt":23,"=":24,"Value":25,"FUNC":26,"FunctionStmt_option0":27,"(":28,"FunctionStmt_option1":29,")":30,"FunctionStmt_group0":31,"FunctionArgs":32,",":33,"Block":34,"StmtList":35,"UseStmt":36,"USE":37,"STRING":38,"UseStmt_option0":39,"GlobalDeclarationStmt":40,"Stmt":41,"StmtNotSemicolon":42,"StrictStmtList":43,"SimpleStmt":44,"Expr":45,"IncDecStmt":46,"SimpleStmtNotSemicolon":47,"OperationExpr":48,"INCDECOP":49,"IfStmt":50,"IF":51,"IfStmt_option0":52,"ElseStmt":53,"ELSE":54,"ForStmt":55,"FOR":56,"ForStmt_option0":57,"ForStmt_option1":58,"ForStmt_option2":59,"ForInStmt":60,"IN":61,"ForInRangeStmt":62,"SwitchStmt":63,"SWITCH":64,"SwitchStmt_option0":65,"CaseBlock":66,"CaseStmtList":67,"CaseStmt":68,"CASE":69,"ExprList":70,"DEFAULT":71,"SelectStmt":72,"SELECT":73,"SelectCaseBlock":74,"SelectCaseStmtList":75,"SelectCaseStmt":76,"CatchStmt":77,"CATCH":78,"ReturnStmt":79,"RETURN":80,"ReturnStmt_option0":81,"ReturnStmtNotSemicolon":82,"BreakStmt":83,"BREAK":84,"BreakStmtNotSemicolon":85,"ContinueStmt":86,"CONTINUE":87,"ContinueStmtNotSemicolon":88,"LeftHandExpr":89,"IndexExpr":90,"SelectorExpr":91,"PrimaryExpr":92,"ME":93,"BOOLEAN":94,"NUMBER":95,"NIL":96,"SliceExpr":97,"CallExpr":98,"TypeAssertExpr":99,"ObjectConstructor":100,"ArrayConstructor":101,"TemplateLiteral":102,"GoExpr":103,"UnaryExpr":104,"+":105,"-":106,"!":107,"~":108,"?":109,"OperationExprNotAdditive":110,"*":111,"/":112,"%":113,"SHIFTOP":114,"COMPARISONOP":115,"BINARYOP":116,"&":117,"ASYNCOP":118,"AssignmentExpr":119,"ASSIGNMENTOP":120,"CoalesceExpr":121,"COALESCEOP":122,"[":123,"SliceExpr_option0":124,"SliceExpr_option1":125,"]":126,"SliceExpr_option2":127,"SliceExpr_option3":128,"CallExpr_option0":129,"CallExpr_option1":130,".":131,"Property":132,"GO":133,"TypeAssertExpr_option0":134,"TPL_BEGIN":135,"TemplateLiteralBody":136,"TPL_END":137,"TPL_SIMPLE":138,"TPL_CONTINUATION":139,"TemplateLiteralBody_option0":140,"ReceiveExpr":141,"KeyValueElementList":142,"ObjectConstructorArgs":143,"SimpleElementList":144,"KeyedElement":145,"KeyValueElementList_option0":146,"SimpleElementList_option0":147,"ArrayItems":148,"ArrayConstructor_option0":149,"ValueList":150,"ValueList_option0":151,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",9:"CLASS",10:"IDENT",14:":",16:"{",18:"}",22:";",24:"=",26:"FUNC",28:"(",30:")",33:",",37:"USE",38:"STRING",49:"INCDECOP",51:"IF",54:"ELSE",56:"FOR",61:"IN",64:"SWITCH",69:"CASE",71:"DEFAULT",73:"SELECT",78:"CATCH",80:"RETURN",84:"BREAK",87:"CONTINUE",93:"ME",94:"BOOLEAN",95:"NUMBER",96:"NIL",105:"+",106:"-",107:"!",108:"~",109:"?",111:"*",112:"/",113:"%",114:"SHIFTOP",115:"COMPARISONOP",116:"BINARYOP",117:"&",118:"ASYNCOP",120:"ASSIGNMENTOP",122:"COALESCEOP",123:"[",126:"]",131:".",133:"GO",135:"TPL_BEGIN",137:"TPL_END",138:"TPL_SIMPLE",139:"TPL_CONTINUATION"},
productions_: [0,[3,2],[4,2],[4,1],[4,0],[8,4],[13,2],[12,3],[17,2],[17,1],[17,0],[19,2],[19,2],[19,1],[20,1],[20,1],[21,3],[21,1],[23,6],[32,1],[32,3],[34,3],[36,3],[40,3],[6,1],[6,1],[6,2],[6,2],[6,1],[7,1],[7,1],[35,2],[35,1],[35,0],[43,1],[43,2],[44,2],[44,2],[44,1],[47,1],[47,1],[46,2],[50,4],[53,2],[53,2],[55,7],[55,3],[55,2],[60,5],[60,7],[62,7],[62,6],[62,6],[62,5],[63,3],[66,3],[67,1],[67,2],[68,4],[68,3],[72,2],[74,3],[75,1],[75,2],[76,4],[76,3],[77,3],[79,3],[82,2],[82,1],[83,2],[85,1],[86,2],[88,1],[41,1],[41,1],[41,1],[41,1],[41,1],[41,1],[41,1],[41,1],[41,1],[41,1],[41,1],[41,2],[42,1],[42,1],[42,1],[42,1],[42,1],[89,1],[89,1],[89,1],[92,1],[92,1],[92,1],[92,1],[92,1],[92,1],[92,3],[92,1],[92,1],[92,1],[92,1],[92,1],[92,1],[92,1],[104,1],[104,2],[104,2],[104,2],[104,2],[104,2],[110,1],[110,3],[110,3],[110,3],[110,3],[110,3],[110,3],[110,3],[48,1],[48,3],[48,3],[48,3],[119,3],[119,3],[121,3],[70,1],[70,3],[97,6],[97,7],[98,4],[98,5],[91,3],[91,4],[132,1],[132,1],[132,1],[132,1],[132,1],[132,1],[132,1],[132,1],[132,1],[132,1],[132,1],[132,1],[132,1],[132,1],[132,1],[132,1],[132,1],[132,1],[132,1],[132,1],[90,4],[90,5],[99,5],[102,3],[102,1],[136,1],[136,3],[103,2],[141,2],[45,1],[45,1],[45,1],[45,1],[100,3],[100,3],[100,3],[100,2],[143,2],[143,3],[143,3],[15,1],[15,3],[142,1],[142,3],[145,3],[145,3],[144,1],[144,3],[101,3],[101,4],[148,2],[148,3],[25,1],[25,1],[150,1],[150,3],[11,0],[11,1],[27,0],[27,1],[29,0],[29,1],[31,1],[31,1],[39,0],[39,1],[52,0],[52,1],[57,0],[57,1],[58,0],[58,1],[59,0],[59,1],[65,0],[65,1],[81,0],[81,1],[124,0],[124,1],[125,0],[125,1],[127,0],[127,1],[128,0],[128,1],[129,0],[129,1],[130,0],[130,1],[134,0],[134,1],[140,0],[140,1],[146,0],[146,1],[147,0],[147,1],[149,0],[149,1],[151,0],[151,1]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
 return new yy.ModuleNode($$[$0-1]) 
break;
case 2: case 31:

            if ($$[$0] instanceof yy.List)   {
                $$[$0].addFront($$[$0-1])
                this.$= $$[$0]
            }
            else if ($$[$0]){
                this.$= new yy.List($$[$0-1], $$[$0])
            }
            else {
                this.$= new yy.List($$[$0-1])
            }
        
break;
case 3:

            if (this.$ instanceof yy.List) {
                this.$.add($$[$0])
            }
            else {
                this.$ = new yy.List($$[$0])
            }
        
break;
case 4:
 this.$= new yy.List() 
break;
case 5:

            this.$= new yy.ClassNode(
                new yy.Lit($$[$0-3], _$[$0-3]),
                new yy.Lit($$[$0-2], _$[$0-2]),
                $$[$0-1], $$[$0]
            )
        
break;
case 6: case 43: case 44: case 68:
 this.$= new yy.Node(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 7: case 55: case 61:
 this.$= new yy.Node(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 8:

            if ($$[$0] instanceof yy.List) {
                $$[$0].addFront($$[$0-1])
                this.$= $$[$0]
            }
            else if ($$[$0]) {
                this.$= new yy.List($$[$0-1], $$[$0])
            }
            else {
                this.$= new yy.List($$[$0-1])
            }
        
break;
case 9: case 34: case 129: case 162: case 179: case 183:
 this.$= new yy.List($$[$0]) 
break;
case 11:
 $$[$0-1].children.push(new yy.Lit(';', _$[$0])); this.$=$$[$0-1] 
break;
case 12:
 this.$= new yy.MethodNode($$[$0-1], new yy.Lit(';', _$[$0])) 
break;
case 13:
 this.$= new yy.Lit(';', _$[$0])
break;
case 15:
 this.$= new yy.MethodNode($$[$0]) 
break;
case 16:
 this.$= new yy.PropertyNode(new yy.Lit($$[$0-2], _$[$0-2]), new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 17:
 this.$= new yy.PropertyNode(new yy.Lit($$[$0], _$[$0])) 
break;
case 18:

            this.$= new yy.FunctionNode(
                new yy.Lit($$[$0-5], _$[$0-5]),
                new yy.Lit($$[$0-4], _$[$0-4]),
                new yy.Lit($$[$0-3], _$[$0-3]),
                $$[$0-2],
                new yy.Lit($$[$0-1], _$[$0-1]),
                $$[$0]
            )
        
break;
case 19: case 177:
 this.$= new yy.List(new yy.Lit($$[$0], _$[$0])) 
break;
case 20: case 178:
 $$[$0-2].add(new yy.Lit($$[$0-1], _$[$0-1]), new yy.Lit($$[$0], _$[$0])) 
break;
case 21:

            this.$= new yy.BlockNode(
                new yy.Lit($$[$0-2], _$[$0-2]),
                $$[$0-1],
                new yy.Lit($$[$0], _$[$0])
            )
        
break;
case 22:
 this.$= new yy.UseNode(new yy.Str($$[$0-2], _$[$0-2]), new yy.Lit($$[$0-1], _$[$0-1]), $$[$0] ? new yy.Lit($$[$0], _$[$0]) : null) 
break;
case 23: case 126: case 127:
 this.$= new yy.AssignmentNode($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 26: case 27:
 $$[$0-1].children.push(new yy.Lit(';', _$[$0])); this.$ = $$[$0-1] 
break;
case 28: case 38:
 this.$= new yy.Lit(';', _$[$0]) 
break;
case 35: case 57: case 63:
 $$[$0-1].add($$[$0]) 
break;
case 36: case 37:
 this.$= new yy.SimpleStmtNode($$[$0-1], new yy.Lit(';', _$[$0])) 
break;
case 39: case 40:
 this.$= new yy.SimpleStmtNode($$[$0]) 
break;
case 41:
 this.$= new yy.Node($$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 42:
 this.$= new yy.IfNode(new yy.Lit($$[$0-3], _$[$0-3]), $$[$0-2], $$[$0-1], $$[$0])
break;
case 45:

            this.$= new yy.ForNode(
                new yy.Lit($$[$0-6], _$[$0-6]), $$[$0-5],
                new yy.Lit($$[$0-4], _$[$0-4]), $$[$0-3],
                new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], $$[$0]
            )
        
break;
case 46:
 this.$= new yy.ForNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], $$[$0]) 
break;
case 47:
 this.$= new yy.ForNode(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 48:

            this.$= new yy.ForInNode(
                new yy.Lit($$[$0-4], _$[$0-4]),
                new yy.VarNode(new yy.Lit($$[$0-3], _$[$0-3])),
                new yy.Lit($$[$0-2], _$[$0-2]),
                $$[$0-1], $$[$0]
            )
        
break;
case 49:

            this.$= new yy.ForInNode(
                new yy.Lit($$[$0-6], _$[$0-6]),
                new yy.VarNode(new yy.Lit($$[$0-5], _$[$0-5])),
                new yy.Lit($$[$0-4], _$[$0-4]),
                new yy.VarNode(new yy.Lit($$[$0-3], _$[$0-3])),
                new yy.Lit($$[$0-2], _$[$0-2]),
                $$[$0-1], $$[$0]
            )
        
break;
case 50:

            this.$= new yy.ForInRangeNode(
                new yy.Lit($$[$0-6], _$[$0-6]),
                new yy.VarNode(new yy.Lit($$[$0-5], _$[$0-5])),
                new yy.Lit($$[$0-4], _$[$0-4]),
                $$[$0-3],
                new yy.Lit($$[$0-2], _$[$0-2]),
                $$[$0-1], $$[$0]
            )
        
break;
case 51:

            this.$= new yy.ForInRangeNode(
                new yy.Lit($$[$0-5], _$[$0-5]),
                new yy.VarNode(new yy.Lit($$[$0-4], _$[$0-4])),
                new yy.Lit($$[$0-3], _$[$0-3]),
                $$[$0-2],
                new yy.Lit($$[$0-1], _$[$0-1]),
                null, $$[$0]
            )
        
break;
case 52:

            this.$= new yy.ForInRangeNode(
                new yy.Lit($$[$0-5], _$[$0-5]),
                new yy.VarNode(new yy.Lit($$[$0-4], _$[$0-4])),
                new yy.Lit($$[$0-3], _$[$0-3]),
                null,
                new yy.Lit($$[$0-2], _$[$0-2]),
                $$[$0-1], $$[$0]
            )
        
break;
case 53:

            this.$= new yy.ForInRangeNode(
                new yy.Lit($$[$0-4], _$[$0-4]),
                new yy.VarNode(new yy.Lit($$[$0-3], _$[$0-3])),
                new yy.Lit($$[$0-2], _$[$0-2]),
                null,
                new yy.Lit($$[$0-1], _$[$0-1]),
                null, $$[$0]
            )
        
break;
case 54:
 this.$= new yy.SwitchNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], $$[$0]) 
break;
case 56: case 62:
 this.$ = new yy.List($$[$0]) 
break;
case 58:
 this.$= new yy.CaseNode(new yy.Lit($$[$0-3], _$[$0-3]), $$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 59:
 this.$= new yy.CaseNode(new yy.Lit($$[$0-2], _$[$0-2]), new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 60:
 this.$= new yy.SelectNode(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 64:
 this.$= new yy.SelectCaseNode(new yy.Lit($$[$0-3], _$[$0-3]), $$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 65:


                this.$= new yy.SelectCaseNode(
                    new yy.Lit('case', _$[$0-2]),
                    new yy.CallNode(
                        new yy.VarNode(new yy.Lit('timeout', _$[$0-2])),
                        new yy.Lit('(', _$[$0-2]),
                        new yy.List(new yy.Lit('0', _$[$0-2])),
                        new yy.Lit(')', _$[$0-2])
                    ),
                    new yy.Lit($$[$0-1], _$[$0-1]),
                    $$[$0]
                )

        
break;
case 66:
 this.$= new yy.CatchNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], $$[$0]) 
break;
case 67:
 this.$= new yy.Node(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit(';', _$[$0])) 
break;
case 69: case 97: case 98: case 99:
 this.$= new yy.Lit($$[$0], _$[$0]) 
break;
case 70: case 72:
 this.$= new yy.Node(new yy.Lit($$[$0-1], _$[$0-1]), new yy.Lit(';', _$[$0])) 
break;
case 71: case 73:
 this.$= new yy.Node(new yy.Lit($$[$0], _$[$0])) 
break;
case 91:
 this.$= new yy.VarNode(new yy.Lit($$[$0], _$[$0])) 
break;
case 95:
 this.$= new yy.MeNode($$[$0], _$[$0]) 
break;
case 96:
 this.$= new yy.Str($$[$0], _$[$0]) 
break;
case 100:
 this.$= new yy.AssociationNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 109: case 110: case 111: case 112:
 this.$= new yy.UnaryExprNode(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 113:
 this.$= new yy.UnaryExistenceNode($$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 115: case 116: case 117: case 118: case 119: case 120: case 121: case 123: case 124:
 this.$= new yy.Node($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 125:
 this.$= new yy.SendAsyncNode($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 128:
 this.$= new yy.CoalesceNode($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 130: case 192:
 $$[$0-2].add(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 131:

            this.$= new yy.SliceNode(
                $$[$0-5],
                new yy.Lit($$[$0-4], _$[$0-4]),
                $$[$0-3],
                new yy.Lit($$[$0-2], _$[$0-2]),
                $$[$0-1],
                new yy.Lit($$[$0], _$[$0])
            )
        
break;
case 132:

            this.$= new yy.ExistenceNode(
                new yy.SliceNode(
                    $$[$0-6],                    
                    new yy.Lit($$[$0-4], _$[$0-4]),
                    $$[$0-3],
                    new yy.Lit($$[$0-2], _$[$0-2]),
                    $$[$0-1],
                    new yy.Lit($$[$0], _$[$0])
                )
            )
        
break;
case 133:
 this.$= new yy.CallNode($$[$0-3], new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 134:
 this.$= new yy.ExistenceNode(new yy.CallNode($$[$0-4], new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0]))) 
break;
case 135:
 this.$= new yy.Node($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), new yy.ObjectPropertyNode($$[$0], _$[$0])) 
break;
case 136:
 this.$= new yy.ExistenceNode(new yy.Node($$[$0-3], new yy.Lit($$[$0-1], _$[$0-1]), new yy.ObjectPropertyNode($$[$0], _$[$0]))) 
break;
case 157:
 this.$= new yy.Node($$[$0-3], new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 158:
 this.$= new yy.ExistenceNode(new yy.Node($$[$0-4], new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0]))) 
break;
case 159:

            this.$= new yy.TypeAssertNode(
                $$[$0-4],
                new yy.Lit($$[$0-3], _$[$0-3]),
                new yy.Lit($$[$0-2], _$[$0-2]),
                $$[$0-1],
                new yy.Lit($$[$0], _$[$0])
            )
        
break;
case 160:
 this.$= new yy.TemplateLiteralNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 161:
 this.$= new yy.TemplateLiteralNode(new yy.Lit($$[$0], _$[$0])) 
break;
case 163: case 180:

            if ($$[$0] instanceof yy.List)   {
                $$[$0].addFront($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]))
                this.$= $$[$0]
            }
            else if ($$[$0]){
                this.$= new yy.List($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0])
            }
        
break;
case 164:
 this.$= new yy.GoExprNode(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 165:
 this.$= new yy.ReceiveAsyncNode(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 170:

            this.$= new yy.ObjectConstructorNode(
                new yy.Lit('&', _$[$0-2]),
                null,
                new yy.ObjectConstructorArgsNode(
                    new yy.Lit($$[$0-2], _$[$0-2]),
                    null,
                    new yy.Lit($$[$0], _$[$0])
                )
            )
        
break;
case 171:

            this.$= new yy.ObjectConstructorNode(
                new yy.Lit('&', _$[$0-2]),
                null,
                new yy.ObjectConstructorArgsNode(
                    new yy.Lit($$[$0-2], _$[$0-2]),
                    $$[$0-1],
                    new yy.Lit($$[$0], _$[$0]),
                    true
                )
            )
        
break;
case 172:
 this.$= new yy.ObjectConstructorNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], $$[$0]) 
break;
case 173:
 this.$= new yy.ObjectConstructorNode(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 174:
 this.$= new yy.ObjectConstructorArgsNode(new yy.Lit($$[$0-1], _$[$0-1]), null, new yy.Lit($$[$0], _$[$0])) 
break;
case 175:
 this.$= new yy.ObjectConstructorArgsNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 176:
 this.$= new yy.ObjectConstructorArgsNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0]), true) 
break;
case 181:
 this.$= new yy.Node(new yy.Lit($$[$0-2], _$[$0-2]), new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 182:
 this.$= new yy.Node(new yy.Str($$[$0-2], _$[$0-2]), new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 184:

            if ($$[$0] instanceof yy.List) {
                $$[$0].addFront($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]))
                this.$= $$[$0]
            }
            else if ($$[$0]){
                this.$= new yy.List($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0])
            }
        
break;
case 185:

            this.$= new yy.ArrayConstructorNode(
                new yy.Lit('[', _$[$0-2]),
                null,
                new yy.Lit(']', _$[$0])
            )
        
break;
case 186:

            if ($$[$0-1]) $$[$0-2].add($$[$0-1]);
            this.$= new yy.ArrayConstructorNode(
                new yy.Lit('[', _$[$0-3]),
                $$[$0-2],
                new yy.Lit(']', _$[$0])
            )
        
break;
case 187:
 this.$= new yy.List($$[$0-1]); this.$.add(new yy.Lit($$[$0], _$[$0])) 
break;
case 188:

            if ($$[$0-2] instanceof yy.List) {
                $$[$0-2].add($$[$0-1], new yy.Lit($$[$0], _$[$0]))
                this.$= $$[$0-2]
            }
        
break;
case 191:
 this.$= new yy.ValueList($$[$0]) 
break;
}
},
table: [{3:1,4:2,5:$V0,6:3,7:4,8:6,9:$V1,10:$V2,15:13,22:$V3,23:5,26:$V4,36:7,37:$V5,40:8},{1:[3]},{5:[1,15]},{4:16,5:$V0,6:3,7:4,8:6,9:$V1,10:$V2,15:13,22:$V3,23:5,26:$V4,36:7,37:$V5,40:8},{5:[2,3]},o($V6,[2,24]),o($V6,[2,25]),{5:[2,29],22:[1,17]},{5:[2,30],22:[1,18]},o($V6,[2,28]),{10:[1,20],27:19,28:[2,195]},{10:[1,21]},{38:[1,22]},{24:[1,23],131:$V7},o($V8,[2,177]),{1:[2,1]},{5:[2,2]},o($V6,[2,26]),o($V6,[2,27]),{28:[1,25]},{28:[2,196]},{11:26,13:27,14:[1,28],16:[2,193]},o($V9,[2,201],{39:29,10:[1,30]}),{10:$Va,23:33,25:31,26:$V4,28:$Vb,38:$Vc,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},{10:[1,67]},{10:[1,70],29:68,30:[2,197],32:69},{12:71,16:[1,72]},{16:[2,194]},{10:$V2,15:73},o($V9,[2,22]),o($V9,[2,202]),o($V9,[2,23]),o($Vq,[2,189]),o($Vq,[2,190]),o($Vq,$Vr,{105:$Vs,106:$Vt,118:$Vu,122:$Vv}),o($Vq,[2,167]),o($Vq,[2,168]),o($Vq,[2,169]),o($Vw,[2,122],{111:$Vx,112:$Vy,113:$Vz,114:$VA,115:$VB,116:$VC,117:$VD}),o([5,9,10,14,16,18,22,26,28,30,33,37,49,105,106,109,111,112,113,114,115,116,117,118,122,123,131,137,139],$VE,{24:[1,86],120:[1,85]}),{10:$Va,23:33,25:87,26:$V4,28:$Vb,38:$Vc,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},o($VF,[2,114]),o($VG,$VH),o($VG,[2,92]),o($VG,[2,93]),o($VF,$VI,{28:$VJ,109:$VK,123:$VL,131:$VM}),{10:$Va,28:$Vb,38:$Vc,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:92,105:$Vh,106:$Vi,107:$Vj,108:$Vk,117:$Vl,133:$Vn,135:$Vo,138:$Vp},{10:$Va,28:$Vb,38:$Vc,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:94,105:$Vh,106:$Vi,107:$Vj,108:$Vk,117:$Vl,133:$Vn,135:$Vo,138:$Vp},{10:$Va,28:$Vb,38:$Vc,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:95,105:$Vh,106:$Vi,107:$Vj,108:$Vk,117:$Vl,133:$Vn,135:$Vo,138:$Vp},{10:$Va,28:$Vb,38:$Vc,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:96,105:$Vh,106:$Vi,107:$Vj,108:$Vk,117:$Vl,133:$Vn,135:$Vo,138:$Vp},o($VN,[2,95]),o($VN,$VO),o($VN,[2,97]),o($VN,[2,98]),o($VN,[2,99]),{10:$VP,14:[1,98],23:33,25:97,26:$V4,28:$Vb,33:[1,100],38:$VQ,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37,142:99,145:102,148:101},o($VN,[2,101]),o($VN,[2,102]),o($VN,[2,103]),o($VN,[2,104]),o($VN,[2,105]),o($VN,[2,106]),o($VN,[2,107]),{10:$V2,15:105},{10:$Va,28:$Vb,38:$Vc,45:107,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,136:106,138:$Vp,141:37},o($VN,[2,161]),{16:$VR,34:108},o($V8,[2,178]),{30:[1,110]},{30:[2,198],33:[1,111]},o($VS,[2,19]),o($V6,[2,5]),{10:$VT,17:112,18:$VU,19:113,20:114,21:115,22:$VV,23:116,26:$V4},{16:[2,6],131:$V7},{10:$Va,28:$Vb,38:$Vc,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:119,117:$Vl,133:$Vn,135:$Vo,138:$Vp},{10:$Va,28:$Vb,38:$Vc,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:120,117:$Vl,133:$Vn,135:$Vo,138:$Vp},{10:$Va,28:$Vb,38:$Vc,48:121,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,133:$Vn,135:$Vo,138:$Vp},{10:$Va,23:33,25:122,26:$V4,28:$Vb,38:$Vc,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},{10:$Va,28:$Vb,38:$Vc,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:123,105:$Vh,106:$Vi,107:$Vj,108:$Vk,117:$Vl,133:$Vn,135:$Vo,138:$Vp},{10:$Va,28:$Vb,38:$Vc,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:124,105:$Vh,106:$Vi,107:$Vj,108:$Vk,117:$Vl,133:$Vn,135:$Vo,138:$Vp},{10:$Va,28:$Vb,38:$Vc,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:125,105:$Vh,106:$Vi,107:$Vj,108:$Vk,117:$Vl,133:$Vn,135:$Vo,138:$Vp},{10:$Va,28:$Vb,38:$Vc,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:126,105:$Vh,106:$Vi,107:$Vj,108:$Vk,117:$Vl,133:$Vn,135:$Vo,138:$Vp},{10:$Va,28:$Vb,38:$Vc,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:127,105:$Vh,106:$Vi,107:$Vj,108:$Vk,117:$Vl,133:$Vn,135:$Vo,138:$Vp},{10:$Va,28:$Vb,38:$Vc,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:128,105:$Vh,106:$Vi,107:$Vj,108:$Vk,117:$Vl,133:$Vn,135:$Vo,138:$Vp},{10:$Va,28:$Vb,38:$Vc,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:129,105:$Vh,106:$Vi,107:$Vj,108:$Vk,117:$Vl,133:$Vn,135:$Vo,138:$Vp},{10:$Va,23:33,25:130,26:$V4,28:$Vb,38:$Vc,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},{10:$Va,23:33,25:131,26:$V4,28:$Vb,38:$Vc,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},o($Vq,[2,165]),o($VF,[2,113],{28:$VW,123:$VX,131:$VY}),{10:$Va,14:[2,215],28:$Vb,38:$Vc,48:137,89:93,90:43,91:44,92:135,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,124:136,133:$Vn,135:$Vo,138:$Vp},{9:$VZ,10:$V_,26:$V$,28:[1,139],37:$V01,51:$V11,54:$V21,56:$V31,61:$V41,64:$V51,69:$V61,71:$V71,73:$V81,78:$V91,80:$Va1,84:$Vb1,87:$Vc1,93:$Vd1,94:$Ve1,96:$Vf1,132:138,133:$Vg1},{10:$Va,23:33,25:162,26:$V4,28:$Vb,30:[2,223],38:$Vc,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,129:160,133:$Vn,135:$Vo,138:$Vp,141:37,150:161},o($VF,[2,109]),o($VN,$VE),o($VF,[2,110]),o($VF,[2,111]),o($VF,[2,112]),{30:[1,163],33:[1,164]},{30:[1,165]},{30:[1,166]},{30:[1,167]},{10:$Va,23:33,25:169,26:$V4,28:$Vb,30:[2,235],38:$Vc,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37,149:168},{30:[2,179],33:[1,170]},o([24,28,30,33,105,106,109,111,112,113,114,115,116,117,118,120,122,123,131],$VH,{14:$Vh1}),o([28,30,33,105,106,109,111,112,113,114,115,116,117,118,122,123,131],$VO,{14:$Vi1}),o([5,9,10,14,16,18,22,26,30,33,37,49,105,106,109,111,112,113,114,115,116,117,118,122,123,126,137,139],[2,173],{143:173,28:[1,174],131:$V7}),{137:[1,175]},{137:[2,162],139:[1,176]},o($VN,[2,164]),{10:$Va,18:$Vj1,22:$Vk1,23:191,26:$V4,28:$Vb,35:177,38:$Vc,41:178,42:179,44:180,45:196,46:197,47:192,48:207,50:181,51:$Vl1,55:182,56:$Vm1,60:183,62:184,63:185,64:$Vn1,72:186,73:$Vo1,77:190,78:$Vp1,79:187,80:$Vq1,82:193,83:188,84:$Vr1,85:194,86:189,87:$Vs1,88:195,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},{10:$Va,16:$VR,23:33,25:210,26:$V4,28:$Vb,31:208,34:209,38:$Vc,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},{10:[1,211]},{18:[1,212]},{10:$VT,17:213,18:$VU,19:113,20:114,21:115,22:$VV,23:116,26:$V4},{18:[2,9]},{18:[2,14],22:[1,214]},{18:[2,15],22:[1,215]},o($Vt1,[2,13]),o($Vu1,[2,17],{24:[1,216]}),o($Vw,[2,123],{111:$Vx,112:$Vy,113:$Vz,114:$VA,115:$VB,116:$VC,117:$VD}),o($Vw,[2,124],{111:$Vx,112:$Vy,113:$Vz,114:$VA,115:$VB,116:$VC,117:$VD}),o([5,9,10,14,16,18,22,26,30,33,37,49,118,122,126,137,139],[2,125],{105:$Vs,106:$Vt}),o($Vq,[2,128]),o($VF,[2,115]),o($VF,[2,116]),o($VF,[2,117]),o($VF,[2,118]),o($VF,[2,119]),o($VF,[2,120]),o($VF,[2,121]),o($Vq,[2,126]),o($Vq,[2,127]),{10:$Va,14:[2,219],28:$Vb,38:$Vc,48:219,89:93,90:43,91:44,92:217,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,127:218,133:$Vn,135:$Vo,138:$Vp},{9:$VZ,10:$V_,26:$V$,37:$V01,51:$V11,54:$V21,56:$V31,61:$V41,64:$V51,69:$V61,71:$V71,73:$V81,78:$V91,80:$Va1,84:$Vb1,87:$Vc1,93:$Vd1,94:$Ve1,96:$Vf1,132:220,133:$Vg1},{10:$Va,23:33,25:162,26:$V4,28:$Vb,30:[2,225],38:$Vc,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,130:221,133:$Vn,135:$Vo,138:$Vp,141:37,150:222},o($Vv1,$VI,{28:$VJ,109:$VK,123:$VL,126:[1,223],131:$VM}),{14:[1,224]},{14:[2,216],105:$Vs,106:$Vt,118:$Vu},o($VG,[2,135]),{10:$Va,28:$Vb,30:[2,227],38:$Vc,89:93,90:43,91:44,92:226,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,117:$Vl,133:$Vn,134:225,135:$Vo,138:$Vp},o($VG,[2,137]),o($VG,[2,138]),o($VG,[2,139]),o($VG,[2,140]),o($VG,[2,141]),o($VG,[2,142]),o($VG,[2,143]),o($VG,[2,144]),o($VG,[2,145]),o($VG,[2,146]),o($VG,[2,147]),o($VG,[2,148]),o($VG,[2,149]),o($VG,[2,150]),o($VG,[2,151]),o($VG,[2,152]),o($VG,[2,153]),o($VG,[2,154]),o($VG,[2,155]),o($VG,[2,156]),{30:[1,227]},{30:[2,224],33:$Vw1},o($VS,[2,191]),o($VN,[2,100]),o($Vx1,[2,187]),o($VN,[2,170]),o($VN,[2,171]),o($VN,[2,185]),{30:[1,229]},{30:[2,236],33:[1,230]},{10:[1,233],30:[2,231],38:[1,234],142:232,145:102,146:231},{10:$Va,23:33,25:235,26:$V4,28:$Vb,38:$Vc,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},{10:$Va,23:33,25:236,26:$V4,28:$Vb,38:$Vc,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},o($VN,[2,172]),{10:$VP,23:33,25:240,26:$V4,28:$Vb,30:[1,237],38:$VQ,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37,142:239,144:238,145:102},o($VN,[2,160]),{10:$Va,28:$Vb,38:$Vc,45:107,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,136:242,137:[2,229],138:$Vp,140:241,141:37},{18:[1,243]},{10:$Va,18:$Vj1,22:$Vk1,23:191,26:$V4,28:$Vb,35:244,38:$Vc,41:178,42:179,44:180,45:196,46:197,47:192,48:207,50:181,51:$Vl1,55:182,56:$Vm1,60:183,62:184,63:185,64:$Vn1,72:186,73:$Vo1,77:190,78:$Vp1,79:187,80:$Vq1,82:193,83:188,84:$Vr1,85:194,86:189,87:$Vs1,88:195,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},{18:[2,32]},o($Vy1,[2,74]),o($Vy1,[2,75]),o($Vy1,[2,76]),o($Vy1,[2,77]),o($Vy1,[2,78]),o($Vy1,[2,79]),o($Vy1,[2,80]),o($Vy1,[2,81]),o($Vy1,[2,82]),o($Vy1,[2,83]),o($Vy1,[2,84]),{18:[2,90],22:$Vz1},{18:[2,86]},{18:[2,87]},{18:[2,88]},{18:[2,89]},{18:$VA1,22:$VB1},{18:$VC1,22:$VD1},o($Vy1,[2,38]),{10:$Va,28:$Vb,38:$Vc,48:248,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,133:$Vn,135:$Vo,138:$Vp},{10:[1,252],16:$VR,22:[2,205],28:$Vb,34:251,38:$Vc,45:250,48:34,57:249,70:253,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},{10:$Va,16:[2,211],28:$Vb,38:$Vc,48:255,65:254,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,133:$Vn,135:$Vo,138:$Vp},{16:[1,257],74:256},{10:$Va,18:[2,69],22:$VE1,23:33,25:259,26:$V4,28:$Vb,38:$Vc,45:32,48:34,81:258,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},{18:[2,71],22:$VF1},{18:[2,73],22:$VG1},{10:$Va,28:$Vb,38:$Vc,45:262,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},o($VH1,$Vr,{49:[1,263],105:$Vs,106:$Vt,118:$Vu,122:$Vv}),o($Vq,[2,18]),o($Vq,[2,199]),o($Vq,[2,200]),o($VS,[2,20]),o($V6,[2,7]),{18:[2,8]},o($Vt1,[2,11]),o($Vt1,[2,12]),{10:$Va,23:33,25:264,26:$V4,28:$Vb,38:$Vc,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},o($Vv1,$VI,{28:$VJ,109:$VK,123:$VL,126:[1,265],131:$VM}),{14:[1,266]},{14:[2,220],105:$Vs,106:$Vt,118:$Vu},o($VG,[2,136]),{30:[1,267]},{30:[2,226],33:$Vw1},o($VG,[2,157]),{10:$Va,28:$Vb,38:$Vc,48:269,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,125:268,126:[2,217],133:$Vn,135:$Vo,138:$Vp},{30:[1,270]},{28:$VJ,30:[2,228],109:[1,271],123:$VL,131:$VM},o($VN,[2,133]),o($VS,[2,237],{45:32,23:33,48:34,119:35,121:36,141:37,110:38,89:39,104:41,90:43,91:44,92:45,97:56,98:57,99:58,100:59,101:60,102:61,103:62,151:272,25:273,10:$Va,26:$V4,28:$Vb,38:$Vc,93:$Vd,94:$Ve,95:$Vf,96:$Vg,105:$Vh,106:$Vi,107:$Vj,108:$Vk,117:$Vl,118:$Vm,133:$Vn,135:$Vo,138:$Vp}),o($VN,[2,186]),o($Vx1,[2,188]),{30:[2,180]},{30:[2,232]},{14:$Vh1},{14:$Vi1},o($VS,[2,181]),o($VS,[2,182]),o($VN,[2,174]),{30:[1,274]},{30:[1,275]},{30:[2,183],33:[1,276]},{137:[2,163]},{137:[2,230]},o([5,9,10,14,16,18,22,26,28,30,33,37,38,49,51,54,56,64,69,71,73,78,80,84,87,93,94,95,96,105,106,107,108,109,111,112,113,114,115,116,117,118,122,123,126,131,133,135,137,138,139],[2,21]),{18:[2,31]},o($Vy1,[2,85]),o($Vy1,[2,36]),o($Vy1,[2,37]),{16:$VR,34:277,105:$Vs,106:$Vt,118:$Vu},{22:[1,278]},o([22,33],$VI1,{34:279,16:$VR}),o($Vy1,[2,47]),o([16,22,24,28,105,106,109,111,112,113,114,115,116,117,118,120,122,123,131],$VH,{33:[1,281],61:[1,280]}),{22:[2,206],33:$VJ1},{16:[1,284],66:283},{16:[2,212],105:$Vs,106:$Vt,118:$Vu},o($Vy1,[2,60]),{69:$VK1,71:$VL1,75:285,76:286},{22:[1,289]},{18:[2,68],22:$VM1},o($Vy1,[2,70]),o($Vy1,[2,72]),{16:$VR,34:290},o($VH1,[2,41]),o($Vu1,[2,16]),o($VG,[2,158]),{10:$Va,28:$Vb,38:$Vc,48:292,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,126:[2,221],128:291,133:$Vn,135:$Vo,138:$Vp},o($VN,[2,134]),{126:[1,293]},{105:$Vs,106:$Vt,118:$Vu,126:[2,218]},o($VN,[2,159]),{28:$VW,123:$VX,131:$VY},o($VS,[2,192]),o($VS,[2,238]),o($VN,[2,175]),o($VN,[2,176]),{10:$Va,23:33,25:240,26:$V4,28:$Vb,30:[2,233],38:$Vc,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37,144:295,147:294},o($Vy1,[2,203],{52:296,53:297,54:[1,298]}),{10:$Va,22:[2,207],28:$Vb,38:$Vc,48:300,58:299,89:93,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,133:$Vn,135:$Vo,138:$Vp},o($Vy1,[2,46]),{10:$Va,14:[1,302],23:33,25:301,26:$V4,28:$Vb,38:$Vc,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},{10:[1,303]},{10:$Va,28:$Vb,38:$Vc,45:304,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},o($Vy1,[2,54]),{67:305,68:306,69:$VN1,71:$VO1},{18:[1,309],69:$VK1,71:$VL1,76:310},o($VP1,[2,62]),{10:$Va,28:$Vb,38:$Vc,45:311,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},{14:[1,312]},o($Vy1,[2,67]),o($Vy1,[2,66]),{126:[1,313]},{105:$Vs,106:$Vt,118:$Vu,126:[2,222]},o($VN,[2,131]),{30:[2,184]},{30:[2,234]},o($Vy1,[2,42]),o($Vy1,[2,204]),{16:$VR,34:314,50:315,51:$Vl1},{22:[1,316]},{22:[2,208],105:$Vs,106:$Vt,118:$Vu},{14:[1,318],16:$VR,34:317},{10:$Va,16:$VR,23:33,25:319,26:$V4,28:$Vb,34:320,38:$Vc,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},{61:[1,321]},o([14,22,33],[2,130]),{18:[1,322],68:323,69:$VN1,71:$VO1},o($VP1,[2,56]),{10:$Va,28:$Vb,38:$Vc,45:325,48:34,70:324,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},{14:[1,326]},o($Vy1,[2,61]),o($VP1,[2,63]),{14:[1,327]},{10:$Va,22:$Vk1,23:330,26:$V4,28:$Vb,38:$Vc,41:329,43:328,44:180,45:331,46:332,48:207,50:181,51:$Vl1,55:182,56:$Vm1,60:183,62:184,63:185,64:$Vn1,72:186,73:$Vo1,77:190,78:$Vp1,79:187,80:$VQ1,83:188,84:$VR1,86:189,87:$VS1,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},o($VN,[2,132]),o($Vy1,[2,43]),o($Vy1,[2,44]),{10:$Va,16:[2,209],28:$Vb,38:$Vc,45:338,46:339,47:337,48:207,59:336,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},o($Vy1,[2,48]),{10:$Va,16:$VR,23:33,25:340,26:$V4,28:$Vb,34:341,38:$Vc,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},{16:$VR,34:342},o($Vy1,[2,53]),{10:$Va,23:33,25:343,26:$V4,28:$Vb,38:$Vc,45:32,48:34,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},o($Vy1,[2,55]),o($VP1,[2,57]),{14:[1,344],33:$VJ1},o([14,33],$VI1),{10:$Va,22:$Vk1,23:330,26:$V4,28:$Vb,38:$Vc,41:329,43:345,44:180,45:331,46:332,48:207,50:181,51:$Vl1,55:182,56:$Vm1,60:183,62:184,63:185,64:$Vn1,72:186,73:$Vo1,77:190,78:$Vp1,79:187,80:$VQ1,83:188,84:$VR1,86:189,87:$VS1,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},{10:$Va,22:$Vk1,23:330,26:$V4,28:$Vb,38:$Vc,41:329,43:346,44:180,45:331,46:332,48:207,50:181,51:$Vl1,55:182,56:$Vm1,60:183,62:184,63:185,64:$Vn1,72:186,73:$Vo1,77:190,78:$Vp1,79:187,80:$VQ1,83:188,84:$VR1,86:189,87:$VS1,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},o($VP1,[2,65],{119:35,121:36,141:37,110:38,89:39,104:41,90:43,91:44,92:45,97:56,98:57,99:58,100:59,101:60,102:61,103:62,44:180,50:181,55:182,60:183,62:184,63:185,72:186,79:187,83:188,86:189,77:190,48:207,23:330,45:331,46:332,41:347,10:$Va,22:$Vk1,26:$V4,28:$Vb,38:$Vc,51:$Vl1,56:$Vm1,64:$Vn1,73:$Vo1,78:$Vp1,80:$VQ1,84:$VR1,87:$VS1,93:$Vd,94:$Ve,95:$Vf,96:$Vg,105:$Vh,106:$Vi,107:$Vj,108:$Vk,117:$Vl,118:$Vm,133:$Vn,135:$Vo,138:$Vp}),o($Vy1,[2,34]),{22:$Vz1},{22:$VB1},{22:$VD1},{10:$Va,22:$VE1,23:33,25:348,26:$V4,28:$Vb,38:$Vc,45:32,48:34,81:258,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},{22:$VF1},{22:$VG1},{16:$VR,34:349},{16:[2,210]},{16:$VA1},{16:$VC1},{16:$VR,34:350},o($Vy1,[2,51]),o($Vy1,[2,52]),{16:$VR,34:351},{10:$Va,22:$Vk1,23:330,26:$V4,28:$Vb,38:$Vc,41:329,43:352,44:180,45:331,46:332,48:207,50:181,51:$Vl1,55:182,56:$Vm1,60:183,62:184,63:185,64:$Vn1,72:186,73:$Vo1,77:190,78:$Vp1,79:187,80:$VQ1,83:188,84:$VR1,86:189,87:$VS1,89:39,90:43,91:44,92:45,93:$Vd,94:$Ve,95:$Vf,96:$Vg,97:56,98:57,99:58,100:59,101:60,102:61,103:62,104:41,105:$Vh,106:$Vi,107:$Vj,108:$Vk,110:38,117:$Vl,118:$Vm,119:35,121:36,133:$Vn,135:$Vo,138:$Vp,141:37},o($VP1,[2,59],{119:35,121:36,141:37,110:38,89:39,104:41,90:43,91:44,92:45,97:56,98:57,99:58,100:59,101:60,102:61,103:62,44:180,50:181,55:182,60:183,62:184,63:185,72:186,79:187,83:188,86:189,77:190,48:207,23:330,45:331,46:332,41:347,10:$Va,22:$Vk1,26:$V4,28:$Vb,38:$Vc,51:$Vl1,56:$Vm1,64:$Vn1,73:$Vo1,78:$Vp1,80:$VQ1,84:$VR1,87:$VS1,93:$Vd,94:$Ve,95:$Vf,96:$Vg,105:$Vh,106:$Vi,107:$Vj,108:$Vk,117:$Vl,118:$Vm,133:$Vn,135:$Vo,138:$Vp}),o($VP1,[2,64],{119:35,121:36,141:37,110:38,89:39,104:41,90:43,91:44,92:45,97:56,98:57,99:58,100:59,101:60,102:61,103:62,44:180,50:181,55:182,60:183,62:184,63:185,72:186,79:187,83:188,86:189,77:190,48:207,23:330,45:331,46:332,41:347,10:$Va,22:$Vk1,26:$V4,28:$Vb,38:$Vc,51:$Vl1,56:$Vm1,64:$Vn1,73:$Vo1,78:$Vp1,80:$VQ1,84:$VR1,87:$VS1,93:$Vd,94:$Ve,95:$Vf,96:$Vg,105:$Vh,106:$Vi,107:$Vj,108:$Vk,117:$Vl,118:$Vm,133:$Vn,135:$Vo,138:$Vp}),o($Vy1,[2,35]),{22:$VM1},o($Vy1,[2,45]),o($Vy1,[2,50]),o($Vy1,[2,49]),o($VP1,[2,58],{119:35,121:36,141:37,110:38,89:39,104:41,90:43,91:44,92:45,97:56,98:57,99:58,100:59,101:60,102:61,103:62,44:180,50:181,55:182,60:183,62:184,63:185,72:186,79:187,83:188,86:189,77:190,48:207,23:330,45:331,46:332,41:347,10:$Va,22:$Vk1,26:$V4,28:$Vb,38:$Vc,51:$Vl1,56:$Vm1,64:$Vn1,73:$Vo1,78:$Vp1,80:$VQ1,84:$VR1,87:$VS1,93:$Vd,94:$Ve,95:$Vf,96:$Vg,105:$Vh,106:$Vi,107:$Vj,108:$Vk,117:$Vl,118:$Vm,133:$Vn,135:$Vo,138:$Vp})],
defaultActions: {4:[2,3],15:[2,1],16:[2,2],20:[2,196],27:[2,194],114:[2,9],179:[2,32],192:[2,86],193:[2,87],194:[2,88],195:[2,89],213:[2,8],231:[2,180],232:[2,232],241:[2,163],242:[2,230],244:[2,31],294:[2,184],295:[2,234],337:[2,210],338:[2,39],339:[2,40],348:[2,214]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        throw new Error(str);
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        function lex() {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        }
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};
/* generated by jison-lex 0.3.4 */
var lexer = (function(){
var lexer = ({

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function (match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex() {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState() {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules() {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState(n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState(condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {
    yy.env.loc = yy_.yylloc;

var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:/* skip whitespace */
break;
case 1:
                                yy.env.addSingleLineComment(
                                    new yy.SingleLineCommentNode(yy_.yytext, yy_.yylloc)
                                );
                            
break;
case 2:
                                var
                                strBefore, strAfter,
                                rBegin = /(\r\n|\n|^)\s*$/,
                                rEnd   = /^\s*(\r\n|\n|$)/;

                                strBefore = this.matched.substring(0, this.matched.length - yy_.yyleng);
                                strAfter  = this._input;
                                
                                if (! rBegin.test(strBefore)) {
                                    throw yy.parseError('comments must begin with a new line', {loc: {first_line: yy_.yylloc.first_line }}, true);
                                }

                                if (! rEnd.test(strAfter)) {
                                    throw yy.parseError('comments must end with a new line', {loc: {first_line: yy_.yylloc.last_line }}, true);
                                }

                                yy.env.addMultipleLineComment(
                                    new yy.MultiLineCommentNode(yy_.yytext, yy_.yylloc)
                                );
                            
break;
case 3:
                                // track template state
                                if (this.tplState) {
                                    throw yy.parseError('unexpected ' + yy_.yytext, {loc: {first_line: yy_.yylloc.first_line }}, true);
                                }

                                this.tplState = true;
                                return 135
                            
break;
case 4:
                                if (this.tplState) {
                                    return 139
                                }
                                else {
                                    // return just a `}` char
                                    this.unput(this.match.substr(1))
                                    return 18
                                }
                            
break;
case 5:
                                if (this.tplState) {
                                    this.tplState = false;
                                    return 137
                                }
                                else {
                                    // return just a `}` char
                                    this.unput(this.match.substr(1))
                                    return 18
                                }
                            
break;
case 6:return 138
break;
case 7:return 38
break;
case 8:return 'EOL'
break;
case 9:return 37
break;
case 10: yy.env.newContext(); return 9 
break;
case 11: yy.env.newContext(); return 26 
break;
case 12:return 93
break;
case 13:return 96
break;
case 14:return 80
break;
case 15:return 51
break;
case 16:return 54
break;
case 17:return 56
break;
case 18:return 61
break;
case 19:return 64
break;
case 20:return 73
break;
case 21:return 69
break;
case 22:return 71
break;
case 23:return 87
break;
case 24:return 84
break;
case 25:return 94
break;
case 26:return 78
break;
case 27:return 133
break;
case 28:return 95
break;
case 29:return 10
break;
case 30:return 16
break;
case 31:return 18
break;
case 32:return 28
break;
case 33:return 30
break;
case 34:return 123
break;
case 35:return 126
break;
case 36:return 122
break;
case 37:return 120
break;
case 38:return 118
break;
case 39:return 114
break;
case 40:return 115
break;
case 41:return 116
break;
case 42:return 49
break;
case 43:return 117
break;
case 44:return 24
break;
case 45:return 14
break;
case 46:return 33
break;
case 47:return 131
break;
case 48:return 22
break;
case 49:return 107
break;
case 50:return 108
break;
case 51:return 105
break;
case 52:return 106
break;
case 53:return 111
break;
case 54:return 112
break;
case 55:return 113
break;
case 56:return 109
break;
case 57: yy.parseError('character ' + yy_.yytext + ' with code: ' + yy_.yytext.charCodeAt(0), {loc: yy_.yylloc}); 
break;
case 58:return 5
break;
}
},
rules: [/^(?:[ \f\t\u00A0\u2028\u2029\uFEFF]+)/,/^(?:\/\/.*)/,/^(?:---([\s\S]*?)---)/,/^(?:\$'([^\\']|\\[\s\S])*?\{)/,/^(?:\}([^\\']|\\[\s\S])*?\{)/,/^(?:\}([^\\']|\\[\s\S])*?')/,/^(?:\$'([^\\']|\\[\s\S])*')/,/^(?:'([^\\']|\\[\s\S])*')/,/^(?:(\r\n|\n))/,/^(?:use\b)/,/^(?:class\b)/,/^(?:func\b)/,/^(?:me\b)/,/^(?:nil\b)/,/^(?:return\b)/,/^(?:if\b)/,/^(?:else\b)/,/^(?:for\b)/,/^(?:in\b)/,/^(?:switch\b)/,/^(?:select\b)/,/^(?:case\b)/,/^(?:default\b)/,/^(?:continue\b)/,/^(?:break\b)/,/^(?:true\b|false\b)/,/^(?:catch\b)/,/^(?:go\b)/,/^(?:0x[\da-fA-F]+|^\d*\.?\d+(?:[eE][+-]?\d+)?\b)/,/^(?:[\$_a-zA-Z\x7f-\uffff]+[\$\w\x7f-\uffff]*)/,/^(?:\{)/,/^(?:\})/,/^(?:\()/,/^(?:\))/,/^(?:\[)/,/^(?:\])/,/^(?:\?\?)/,/^(?:\*=|\/=|%=|\+=|-=|<<=|>>=|>>>=|&=|\^=|\|=)/,/^(?:<-)/,/^(?:<<|>>|>>>)/,/^(?:<=|>=|==|!=|<|>)/,/^(?:&&|\|\||\^|\|)/,/^(?:\+\+|--)/,/^(?:&)/,/^(?:=)/,/^(?::)/,/^(?:,)/,/^(?:\.)/,/^(?:;)/,/^(?:!)/,/^(?:~)/,/^(?:\+)/,/^(?:-)/,/^(?:\*)/,/^(?:\/)/,/^(?:%)/,/^(?:\?)/,/^(?:.)/,/^(?:$)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58],"inclusive":true}}
});
// lexer customization
var
terminals     = parser.terminals_,
yy            = parser.yy,
SEMICOLON     = parseInt(findTerminal(';')),
reactiveTerms = {
    'TPL_END'    : true,
    'TPL_SIMPLE' : true,

    'INCDECOP': true,
    'NUMBER'  : true,
    'STRING'  : true,
    'IDENT'   : true,
    'BOOLEAN' : true,

    'USE'     : true,
    'CLASS'   : true,
    'FUNC'    : true,
    'ME'      : true,
    'NIL'     : true,
    'RETURN'  : true,
    'IF'      : true,
    'ELSE'    : true,
    'FOR'     : true,
    'IN'      : true,
    'SWITCH'  : true,
    'SELECT'  : true,
    'CASE'    : true,
    'DEFAULT' : true,
    'CONTINUE': true,
    'BREAK'   : true,
    'TRY'     : true,
    'CATCH'   : true,
    'FINALLY' : true,
    'THROW'   : true,

    '&'       : true,
    ']'       : true,
    '}'       : true,
    ')'       : true,
    '?'       : true,
};

lexer.dlex = lexer.lex;

lexer.lex = function lex() {
    var t = this.dlex();
    if (t === 'EOL') {
        //console.log('EOL');
        t = isLastTermReactive() ? SEMICOLON : this.lex();
    }
    yy.lastTerm = terminals[t] || t;
    //console.log(yy.lastTerm);
    return t;
}

function isLastTermReactive() {
    return !!reactiveTerms[yy.lastTerm];
}

function findTerminal(id) {
    var t;
    for (t in terminals) {
        if (t > 2 && terminals[t] === id) {
            return t;
        }
    }
};
return lexer;
})();
parser.lexer = lexer;
function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();
cor.Parser = CorParser.Parser; delete CorParser;
(function(cor){

var
Class   = cor.Class,
yy      = {},
hasProp = Object.prototype.hasOwnProperty;

function copyObj(from, to) {
    var name;
    to = to || {};

    for (name in from) {
        if (hasProp.call(from, name)) {
            to[name] = from[name];
        }
    }
    return to;
}

yy.Context = Class({

    depth: null,

    ownerNode: null,

    ignoredVars: null,

    usedVars: null,

    localVars: null,

    isCompiled: false,

    parent: null,

    init: function() {
        this.usedVars    = {};
        this.ignoredVars = {'super': true};
        this.localVars   = {};
    },

    addUsedVar: function(name, value) {
        //console.log('var - ' + name);
        if (!hasProp.call(this.usedVars, name)) {
            this.usedVars[name] = (typeof value === 'string' ? value : true);
        }
    },

    addLocalVar: function(name, value) {
        //console.log('var - ' + name);
        this.localVars[name] = (typeof value === 'string' ? value : true);
        this.addUsedVar(name, value);
    },

    ignoreVar: function(name) {
        this.ignoredVars[name] = true;
    },

    isDeclaredLocal: function(name) {
        var r = false;
        if (hasProp.call(this.localVars, name)) {
            r = true;
        }
        else if (this.parent){
            r = this.parent.isDeclaredLocal(name);
        }
        else {
            r = false;
        }

        return r;
    },

    compileVars: function() {
        var
        name,
        stack       = [],
        usedVars    = this.usedVars,
        localVars   = this.localVars,
        ignoredVars = this.ignoredVars;

        for (name in usedVars) {
            if (! hasProp.call(usedVars, name)) {
                continue;
            }
            if (! this.isDeclaredLocal(name)) {
                this.addLocalVar(name, usedVars[name]);
            }
            if (hasProp.call(localVars, name) && ! hasProp.call(ignoredVars, name)) {
                if (typeof localVars[name] === 'string') {
                    name +=  (' = ' + localVars[name]);
                }
                stack.push(name);
            }
        }

        this.isCompiled = true;
        return (stack.length > 0) ? 'var ' + stack.join(', ') + '; ': '';
    },
    
    generateVar: function(str, seed) {
        seed = seed || 1;
        var v = (str || 'var') + (seed++);
        if (hasProp.call(this.usedVars, v)) {
            return this.generateVar(str, seed);
        }
        this.addUsedVar(v);
        return v;
    },
});

yy.Environment = Class({

    usesRuntime: false,

    contexts: null,

    errors: null,

    exported: null,

    classNodes: null,

    currentCompilingClass: null,

    currentCompilingMethod: null,

    comments: null,

    filename: '',

    init: function(filename) {
        this.filename   = filename;
        this.contexts   = [];
        this.errors     = [];
        this.exported   = {};
        this.classNodes = [];
        this.singleLineComments = [];
        this.multipleLineComments = [];

        // initialize the first context (module)
        this.newContext();
    },

    addSingleLineComment: function(node) {
        this.singleLineComments.push(node);
    },

    addMultipleLineComment: function(node) {
        this.multipleLineComments.push(node);
    },

    addExported: function(k, v) {
        this.exported[k] = v || k;
    },

    getExported: function() {
        return this.exported;
    },

    isExported: function(name) {
        return this.exported && hasProp.call(this.exported, name);
    },

    registerClass: function(cls) {
        this.classNodes.push(cls);
    },

    newContext: function(c) {
        var pc = null;

        if (!c) {
            c = new yy.Context();
            pc = this.context();
            if (pc) {
                c.parent = pc;
            }
        }
        this.contexts.push(c);
        c.depth = this.contexts.length - 1;
        return c;
    },

    popContext: function() {
        return this.contexts.pop();
    },

    context: function(n) {
        if (isNaN(n) || n === null) {
            n = this.contexts.length - 1;
        }
        else if (n <= 0) {
            n = this.contexts.length + (n - 1);
        }
        return this.contexts[n];
    },

    error: function(e) {
        this.errors.push(e);
        throw e;
    }
});

cor.yy = yy;

})(typeof cor === 'undefined' ? {} : cor);

(function(cor){

var EcmaReservedKeywords = [
    // Ecma-262 Keyword
    'break', 'do', 'instanceof', 'typeof',
    'case', 'else', 'new', 'var',
    'catch', 'finally', 'return', 'void',
    'continue', 'for', 'switch', 'while',
    'debugger', 'function', 'with',
    'default', 'if', 'throw',
    'delete', 'in', 'try', 'null',

    // Ecma-262 FutureReservedWord
    'class', 'enum', 'extends',
    'const', 'export', 'import',

    // Ecma-262 FutureReservedWord (in strict mode)
    'implements', 'let', 'private', 'public', 'yield',
    'interface', 'package', 'protected', 'static'
];

var EcmaNativeClasses = [
    // Ecma-262
    'Arguments', 'Array', 'Boolean', 'Date',
    'Error', 'Function', 'JSON', 'Math',
    'Number', 'Object', 'RegExp', 'String'
];


var
Class   = cor.Class,
yy      = cor.yy,
hasProp = Object.prototype.hasOwnProperty,
slice   = Array.prototype.slice,
translationTable = {
    'nil': 'null',
    'func': 'function ',
    'if': 'if ',
    'else': ' else ',
    'for': 'for ',
    'in': ' in ',
    'switch': 'switch ',
    'case': 'case ',
    'return': 'return ',
    'break': 'break;',
    'continue': 'continue;',
    'try': 'try ',
    'catch': ' catch ',
    'finally': ' finally ',
    'throw': 'throw ',
    '=': ' = ',
    ',': ', ',
    ':': ': ',
    '+': ' + ',
    '-': ' - ',
    '*': ' * ',
    '/': ' / ',
    '%': ' % ',
    '<': ' < ',
    '>': ' > ',
    '<<': ' << ',
    '>>': ' >> ',
    '>>>': ' >>> ',
    '==': ' === ',
    '!=': ' !== ',
    '+=': ' += ',
    '-=': ' -= ',
    '*=': ' *= ',
    '/=': ' *= ',
    '%=': ' %= ',
    '~=': ' ~= ',
    '>=': ' >= ',
    '<=': ' <= ',
    '<<=': ' <<= ',
    '>>=': ' >>= ',
    '>>>=': ' >>>= ',
    '&&': ' && ',
    '||': ' || ',
    '|': ' | ',
    '&': ' & ',
    '^': ' ^ '
};

var builtinFn = [
    'error',
    'super',
    'regex',
    'chan',
    'timeout',
    'copy'
];

function isBuiltinFn(name) {
    return builtinFn.indexOf(name) !== -1;
}


function isEcmaReservedKeyWord(name) {
    return EcmaReservedKeywords.indexOf(name) !== -1;
}

function isUsedAsStatement(node) {
    return node.parent instanceof yy.SimpleStmtNode;
}

yy.parseError = function parseError (msg, hash, replaceMsg) {
    var filename = yy.env.filename;
    //is non recoverable parser error?
    if (hash && hasProp.call(hash, 'loc') && hash.expected) {
        switch (hash.text) {
            case '\n': hash.text = 'end of line';  break;
            case ''  : hash.text = 'end of input'; break;
        }
        msg = replaceMsg ? msg : 'unexpected ' + hash.text;
    }
    else {
        msg = replaceMsg ? msg : 'unexpected ' + msg;
    }

    msg += ' at ' + filename + ':' + hash.loc.first_line;

    throw msg;
}


/*
There is two types of routes:

- Delegate : ends with file extensions, example `filename.js`
- Public   : is tested against `^[a-z_-]+$` regex

Routes are tested in the same order as types above, if the route does not match to
any of before types then it will be proccessed by `packagize` function which transform
routes according to Cor package convention.
*/
yy.generateRoute = function(route) {
    var
    parsed,
    rFileNameExt = /([\s\S]+)*(^|\/)([\w\-]+)*(\.[\w\-]+)*$/,
    rPublic      = /^[a-z_-]+$/;
    
    // replace \ by /
    function normalize(route) {
        return route.replace(/\\/g, '/').replace(/\/+/g, '/');
    }

    // Public modules
    if (rPublic.test(route)) {
        return normalize(route);
    }
    
    // Delegate, is a route that has explicit file extension
    // example: jquery.js, mylib.cor
    // parsed[4] is the file extension
    // so if parsed[4]? then is delegate route
    parsed = rFileNameExt.exec(route);
    if (parsed && parsed[4]) {
        return normalize(route);
    }


    // resturn route as is
    return route;
}

// iterate recursevely in preorder starting from the node passed
// as first parameter, it executes the function passed as second parameter
// in each visited node, iteration ends if the function returns false
function preorder(node, fn) {
    if (!(node instanceof yy.Node)) {
        return;
    }

    var i,
    ch  = node.children,
    len = ch.length;

    for (i = 0; i < len; i++) {
        if (!ch[i]) {
            continue;
        }

        if (fn(ch[i]) === false) {
            return;
        }
        preorder(ch[i], fn);
    }
}

function flattenToLine(node, lineno) {
    node.lineno = lineno;
    preorder(node, function(node) {
        node.lineno = lineno;
    })
}


function moveToLine(node, offset) {
    preorder(node, function(node) {
        node.lineno += offset;
    })
}


function stringifyNode(node) {
    var
    i,
    ret = '',
    ch  = node.children,
    len = ch.length;

    if (ch instanceof Array) {
        for (i = 0; i < len; i++) {
            ret += stringifyNode(ch[i]);
        }
    }
    else {
        ret = ch;
    }

    return ret;
}

function getLesserLineNumber(node){
    var
    i = 0, len,
    lineno, selLine, ch;

    if (node) {
        selLine = node.lineno;
        ch  = node.children;
    }
    if (!ch) {
        return lineno;
    }

    len = ch.length;
    for (i = 0; i < len; i++) {
        lineno = getLesserLineNumber(ch[i]);
        if (lineno < selLine) {
            selLine = lineno;
        }
    }

    return selLine;
};

// the base class for all AST nodes
yy.Node = Class({

    type: 'Node',

    _runtimePrefix: 'CRL.',

    scope: null,

    types: null,

    init: function init(children) {
        this.children = [];
        this.lineno   = yy.env.loc.first_line;
        this.loc      = Object.create(yy.env.loc);

        this.yy       = yy;

        // setup parent node for later referencing
        this.adopt(slice.call(arguments));

        this.initNode();
    },

    // adopt an array of nodes
    adopt: function(children) {
        var
        i = 0, len;
        for (len = children.length; i < len; i++) {
            if (children[i]) {
                this.children[i] = children[i];
                this.children[i].parent = this;
            }
        }
    },

    initNode: function() {
        // virtual
    },

    runtimeFn: function(name) {
        return this.runtimePrefix(name + '(');
    },

    runtimePrefix: function(txt) {
        this.yy.env.usesRuntime = true;
        return this._runtimePrefix + txt;
    },

    error: function(txt, lineno) {
        throw 'Error: ' + txt + ' at ' + yy.env.filename + ':' + lineno;
    },

    compile: function() {
        // virtual
    }
});

// List of nodes
yy.List = Class(yy.Node, {

    type: 'List',

    children: null,

    init: function() {
        this.children = [];
        this.adopt(slice.call(arguments));
    },

    add: function() {
        this.children = this.children.concat(slice.call(arguments));
        this.adopt(this.children);
    },

    addFront: function() {
        this.children = slice.call(arguments).concat(this.children);
        this.adopt(this.children);
    },

    last: function() {
        return this.children[this.children.length - 1];
    }

});


// Literals are the smallest units to be compiled
// its children is a string which must be returned
// to write as compiled code
// most of the nodes compiles by constructing yy.Lit-s
// and adopting as children to be later readed by the compiler
yy.Lit = yy.LiteralNode = Class(yy.Node, {

    type: 'Lit, LiteralNode',

    init: function(ch, yloc) {
        this.children = ch;
        this.lineno   = isNaN(yloc) ? yloc.first_line : yloc;
        this.loc      = yloc;
        this.yy       = yy;

        this.initNode();
    },

    compile: function() {
        var
        txt = this.children, t;

        if (hasProp.call(translationTable, txt)) {
            txt = translationTable[txt];
        }

        return txt;
    }
});

yy.ObjectPropertyNode = Class(yy.Lit, {

    type: 'ObjectPropertyNode',

    compile: function() {
        return this.children;
    }

})


// Single line comment
// is a comment starting by `//` and ends in the next EOL
yy.SingleLineCommentNode = Class(yy.Lit, {

    type: 'SingleLineCommentNode',

    compile: function() {
        this.children = [
            new yy.Lit(this.children, this.lineno)
        ];
    }

});

// A comment beginning and ending with `---`
// this kind of comments must have a new line before and after
yy.MultiLineCommentNode = Class(yy.Lit, {

    type: 'MultiLineCommentNode',

    compile: function() {
        this.children = this.children
            .replace(/^(\s*)---/, '$1/*')
            .replace(/---(\s*)$/, '*/$1');

        var i, str,
        lineno   = this.lineno,
        splitted = this.children.split(/\r\n|\n/),
        len      = splitted.length;

        for (i = 0; i < len; i++) {
            str = splitted[i].replace(/^\s+/, '');
            splitted[i] = new yy.Lit(str, lineno + i);
        }

        this.children = splitted;
    }

});


// A value is anithing that can be assigned,
// an object literal, a string, boolean ...
yy.ValueList = Class(yy.List, {

    type: 'ValueList',

    compile: function() {
        var ch, i = this.children.length;
        while (--i) {
            ch = this.children[i];
            if (!ch || ch.children === ',') {
                this.children.pop();
            }
            else {
                break;
            }
        }
    }

});

// Node to wrap a single line expression or Inc-Dec statement
yy.SimpleStmtNode = Class(yy.Node, {

    type: 'SimpleStmtNode',

    initNode: function() {
        this.base('initNode', arguments);
        var
        i = 0,
        len = this.children.length,
        item;

        for (; i < len; i++) {
            item = this.children[i];
            if (item instanceof yy.VarNode) {
                item.markAsLocalVar();
                item.children = '';
                if (this.children[i + 1]) {
                    this.children[i + 1].children = '';
                    i++;
                }
            }
        }
    }
});

// Cor nodes such as modules, functions and clases knows
// has their own context to know about variable scoping.
// This is the base class
yy.ContextAwareNode = Class(yy.Node, {

    type: 'ContextAwareNode',

    context: null,

    initNode: function() {
        this.base('initNode', arguments);
        this.context = this.yy.env.popContext();
        this.context.ownerNode = this;
    },

    compile: function() {
        this.yy.env.newContext(this.context);
    }
});

// A module is a root node of the AST
yy.ModuleNode = Class(yy.ContextAwareNode, {

    type: 'ModuleNode',

    initializerName: 'init',

    compile: function() {
        this.base('compile', arguments);
        var i, item, name,
        nameLineno,
        isQualified,
        initialize = '',
        footer     = '',
        names      = {},
        ls         = this.children[0],
        len        = ls.children.length;

        for (i = 0; i < len; i++) {
            item = ls.children[i];
            if (item instanceof yy.FunctionNode) {
                if (typeof item.name === 'undefined') {
                    this.error('nameless function', getLesserLineNumber(item));
                }
                name       = item.name;
                nameLineno = item.nameLineno;
                if (name === this.initializerName) {
                    initialize = this.initializerName + '.call(this);';
                }
                this.context.ignoreVar(name);
            } else if (item instanceof yy.AssignmentNode) {
                item = item.children[0];
                if (item.children.length > 1) {
                    isQualified = true;
                    continue;
                }
                else {
                    item       = item.children[0];
                    name       = item.children;
                    nameLineno = item.lineno;
                }
            } else if (item instanceof yy.ClassNode) {
                name       = item.className;
                nameLineno = item.children[1].lineno;
            }

            if (name) {
                if (hasProp.call(names, name)) {
                    this.error("Can not redeclare '" + name + "'", nameLineno);
                }
                names[name] = true;
                this.yy.env.addExported(name);
                this.context.addLocalVar(name);
            }
            name = null;
        }

        if (ls) {
            initialize += this.getExport();
            footer      = initialize !== '' ? ';' + initialize : '';
            ls.children.unshift(new yy.Lit(this.context.compileVars(), 1));
            ls.children.push(new yy.Lit(footer, this.lineno));
        }
    },

    getExport: function() {
        var
        name,
        ret      = '',
        basen    = basename(this.yy.env.filename),
        exported = this.yy.env.getExported();

        function basename(filename) {
            var parsed = /([a-zA-Z-0-9_\-]*)([a-zA-A-0-9_\-\.]*)$/.exec(filename);
            return parsed ? parsed[1] : '';
        }

        function isCapitalized(txt) {
            return /^[A-Z]/.test(txt);
        }

        if (isCapitalized(basen)) {
            if (exported.hasOwnProperty(basen)) {
                return 'module.exports = ' + basen + ';';
            }
            else {
                this.error('undeclared default exported value', 1);
            }
        }

        for (name in exported) {
            if (name !== this.initializerName) {
                ret += 'exports.' + name + ' = ' + exported[name] + '; ';
            }
        }
        return ret;
    }
});

// Node for function and class blocks
yy.BlockNode = Class(yy.Node, {
    type: 'BlockNode',

    init: function() {
        this.base('init', arguments);

        var node, i, ch, len;

        if (this.children[1] instanceof yy.List) {
            ch = this.children[1].children;
            len = ch.length;

            for (i = 0; i < len; i++) {
                node = ch[i];
                if (node instanceof yy.FunctionNode && typeof node.name === 'undefined') {
                    this.error('nameless function', getLesserLineNumber(node));
                }
            }    
        }
    }
});

// Node for dot-expression syntax: `a.b.c`
yy.SelectorExprNode = Class(yy.Node, {
    type: 'SelectorExprNode'
});

// Expression such as !x, -x...
yy.UnaryExprNode = Class(yy.Node, {
    type: 'UnaryExprNode'
});

// Expression wrapped by `(` and `)`
yy.AssociationNode = Class(yy.Node, {
    type: 'AssociationNode'
});


// The Cor functions definition
// it initializes variables used in its context
yy.FunctionNode = Class(yy.ContextAwareNode, {

    type: 'FunctionNode',

    name: null,

    nameLineno: null,

    initNode: function() {
        this.base('initNode', arguments);
        var
        ch = this.children;
        if (ch[1]) {
            this.name = ch[1].children;
            this.nameLineno = ch[1].lineno;
        }
        if (!(this.children[5] instanceof yy.BlockNode)) {
            this.children[5] = new yy.BlockNode(
                new yy.Lit('{', ch[4].lineno),
                new yy.Lit('return', getLesserLineNumber(ch[5])),
                new yy.List(ch[5]),
                new yy.Lit('}', ch[5].lineno)
            );
        }

        this.block = this.children[5];
    },

    compile: function() {
        // declare scoped vars
        this.block.children[0].children = ' {' + this.context.compileVars();
        this.base('compile', arguments);
    }
});

yy.SliceNode = Class(yy.Node, {

    type: 'SliceNode',

    initNode: function() {
        this.base('initNode', arguments);

        this.start = this.children[2];
        this.len   = this.children[4];
    },
    
    compile: function() {
        var
        lit,
        start = this.start,
        len   = this.len,
        ch    = this.children;

        if (start === undefined) {
            start = new yy.Lit('0', ch[1].lineno);
        }

        this.children = [
            ch[0],
            new yy.Lit('.slice(', ch[1].lineno),
            start
        ];

        if (len !== undefined) {
            if (len instanceof yy.UnaryExprNode && typeof len.children[1].children === 'string') {
                lit     = new yy.Lit(stringifyNode(len), len.lineno);
                lit.loc = len.children[1].loc;
                len     = lit;
            }

            this.children.push(
                new yy.Lit(', ', ch[3].lineno),
                len
            );
        }

        this.children.push(new yy.Lit(')', ch[5].lineno));
    }

});

yy.ObjectConstructorNode = Class(yy.Node, {

    type: 'ObjectConstructorNode',

    isLiteral: false,

    initNode: function() {
        this.base('initNode', arguments);
        this.className       = this.children[1] ? this.children[1].children : null;
        this.constructorArgs = this.children[2];
    },

    compile: function() {
        
        var qn,
        ch         = this.children,
        prefix     = 'new ',
        constrArgs = this.constructorArgs,
        className  = this.className;

        if (constrArgs) {
            if (constrArgs.keyValue) {
                if (className) {
                    ch.splice(2, 0, new yy.Lit('(', ch[2].children[0].lineno));
                    ch.push(3, 0,   new yy.Lit(')', ch[3].children[2].lineno));
                }
                else {
                    prefix = '';
                    this.isLiteral = true;
                }
            }
            else {
                if (!className) {
                    ch[1] = new yy.Lit('Object', ch[0].lineno);
                }
            }
        }
        else {
            qn = ch[1];
            ch.push(new yy.Lit('()', qn.children[qn.children.length - 1].lineno));
        }

        ch[0] = new yy.Lit(prefix, ch[0].lineno);
    }

});

yy.ObjectConstructorArgsNode = Class(yy.Node, {

    type: 'ObjectConstructorArgsNode',

    initNode: function() {
        var ch = this.children;

        if (!ch[1]) {
            this.keyValue = true;
        }
        if (ch[3]) { // key-value
            this.keyValue = true;
            this.checkKeyNames(ch[1]);
        }
    },

    checkKeyNames: function(list) {
        var
        elements = list.children,
        names = {}, i, name, element,
        len = elements.length;

        for (i = 0; i < len; i++) {
            element = elements[i];

            if (!(element instanceof yy.Lit || element.children[0] instanceof yy.Str)){
                name = element.children[0].children;
                if (hasProp.call(names, name)) {
                    this.error('Can not repeat object key "' + name + '"', element.children[0].lineno);
                }
                names[name] = true;
            }
        }
    },

    compile: function() {
        if (this.keyValue) {
            this.children[0].children = '{';
            this.children[2].children = '}';
            if (!this.parent.isLiteral) {
                this.children.splice(2, 0, new yy.Lit(', _conf: true', this.children[2].lineno))
            }
        }
        else {
            this.children[0].children = '(';
            this.children[2].children = ')';
        }
    }
});

yy.ArrayConstructorNode = Class(yy.Node, {

    type: 'ArrayConstructorNode',

    compile: function() {
        var ch = this.children[1];
        if (ch && (ch.children.length % 2) === 0) {
            ch.children.pop();
        }
    }

})

yy.TypeAssertNode = Class(yy.Node, {

    type: 'TypeAssertNode',

    initNode: function() {
        this.base('initNode', arguments);
        this.typeParam = this.children[3];
    },

    compile: function() {
        var
        ch  = this.children;

        this.children = [
            new yy.Lit(this.runtimeFn('assertType'), ch[0].lineno),
            ch[0]
        ];

        if (this.typeParam) {
            this.children.push(new yy.Lit(', ', ch[1].lineno));
            this.children.push(this.typeParam);
        }

        this.children.push(new yy.Lit(')', ch[4].lineno));
    }
});

yy.AssignmentNode = Class(yy.Node, {

    type: 'AssignmentNode',

    rUpper: /^[A-Z]+$/,

    initNode: function() {
        this.base('initNode', arguments);
        var
        ch = this.children;

        if (ch[0] instanceof yy.VarNode) {
            ch[0].markAsUsedVar();
        }
    }
});

yy.VarNode = Class(yy.Node, {

    type: 'VarNode',

    name: null,

    initNode: function() {
        this.base('initNode', arguments);
        this.context = this.yy.env.context();
        this.name = this.children[0].children;

        if (isEcmaReservedKeyWord(this.name)) {
            this.children[0].children = this.name += '_';
        }
    },

    markAsUsedVar: function() {
        this.context.addUsedVar(this.name);
    },

    markAsLocalVar: function() {
        this.context.addLocalVar(this.name);
    }

});

yy.Str = yy.StringNode = Class(yy.Lit, {

    type: 'Str, StringNode',

    compile: function() {        
        var i, str,
        newNode,
        lineno   = this.lineno,
        splitted = this.children.split(/\r\n|\n/),
        len      = splitted.length;

        for (i = 0; i < len; i++) {
            str = splitted[i].replace(/^\s+/, '');
            if (i < len - 1) {
                str += '\\';
            }
            newNode = new yy.Lit(str, lineno + i);
            
            newNode.loc = {
                first_line: lineno + i,
                first_column: this.loc.first_column
            };

            splitted[i] = newNode;
        }

        this.children = splitted;
    }
});

yy.UseNode = Class(yy.Node, {

    type: 'UseNode',

    rAlias: /([\w\-]+)*(?:\.[\w\-]+)*$/,

    rClearName: /[^\w]/,

    extractedAlias: '',

    initNode: function() {
        this.base('initNode', arguments);

        var parsed;

        this.aliasNode  = this.children[2];
        this.targetNode = this.children[1];
        this.route      = this.yy.generateRoute(this.targetNode.children.substring(1, this.targetNode.children.length - 1)); // trim quotes
        this.alias      = this.aliasNode ? this.aliasNode.children : '';

        if (!this.route) {
            this.error('invalid route format', this.targetNode.lineno);
        }

        parsed = this.rAlias.exec(this.route);
        if (parsed) {
            this.extractedAlias = (parsed[1] || '').replace(this.rClearName, '_');    
        }

        this.yy.env.context().addLocalVar(this.alias || this.extractedAlias);
    },

    compile: function() {
        var
        ch     = this.children,
        route  = this.route,
        alias  = this.alias || this.extractedAlias;

        ch[0].children = 'require(';

        if (alias) {
            if (! this.aliasNode) {
                this.aliasNode = new yy.Lit(alias, ch[0].lineno);
                this.aliasNode.loc = ch[0].loc;
            }
            this.aliasNode.children += ' = ';
        }

        this.targetNode.children = "'" + route + "'";
        this.children = [
            this.aliasNode,
            ch[0],
            this.targetNode,
            new yy.Lit(');', ch[1].lineno)
        ];
    }
   
});

yy.MeNode = Class(yy.Lit, {

    type: 'MeNode',

    compile: function() {
        if (! this.insideClassContext()) {
            this.error("Using 'me' identifier outside a class context", this.lineno);
        }
        return this.base('compile', arguments);
    },

    insideClassContext: function(){
        var ctx = this.yy.env.context();

        while (true) {
            if (ctx.ownerNode instanceof yy.ClassNode) {
                return true;
            }
            else if (ctx.parent){
                ctx = ctx.parent;
            }
            else {
                return false;
            }
        }

    }
});

yy.ClassNode = Class(yy.ContextAwareNode, {

    type: 'ClassNode',

    className: null,

    superClassName: null,

    initializerNode: null,

    initializerName: 'init',

    initNode: function() {
        this.base('initNode', arguments);
        var
        ch    = this.children,
        cname = ch[1].children;

        this.className       = cname;
        this.superClassName  = this.getSuperClassName();
        this.block           = ch[3];
        this.propertiesNames = [];

        this.propertySet = new yy.PropertySetNode();
        this.propertySet.parent = this;
        
        this.methodSet = new yy.MethodSetNode();
        this.methodSet.parent = this;

        this.setupSets(this.block);

        if (this.propertiesNames.length > 0) {
            this.hasProperties = true;
        }

        this.yy.env.registerClass(this);

        this.yy.env.context().addLocalVar(this.className);
    },

    getSuperClassName: function() {
        if (! this.children[2]) {
            return null;
        }
        return stringifyNode(this.children[2].children[1]);
    },

    setupSets: function(block) {
        var i, member, pos = -1,
        members     = block.children[1] ? block.children[1].children : [],
        methods     = [],
        properties  = [],
        names       = {},
        methodFound = false;

        for (i = 0; i < members.length; i++) {
            pos++;
            member = members[i];
            if (hasProp.call(names, member.name)) {
                this.error('Redeclaring "' + member.name + '" in a class body', member.nameLineno);
            }
            if (member instanceof yy.MethodNode) {
                if (member.name === this.initializerName) {
                    if (pos !== 0) {
                        this.error('"' + this.initializerName + '" must the first method in a class body', member.lineno);
                    }
                    this.initializerNode = member;
                }
                methods.push(members.splice(i, 1)[0]);
                methodFound = true;
                i--;
            }
            else if (methodFound === true) {
                this.error('Declareing property "' + member.name + '" after method declaration', member.nameLineno);
            }
            else {
                properties.push(members.splice(i, 1)[0]);
                this.propertiesNames.push(member.name);
                this.context.ignoreVar(member.name);
                i--;
            }

            if (member.name === this.className) {
                this.error('The member "' + member.name + '" is named equal to the owner class', member.nameLineno);
            }
            names[member.name] = true;
        }

        this.propertySet.adopt(properties);
        if (properties.length) {
            this.propertySet.lineno = properties[properties.length - 1].lineno;
        }
        else {
            this.propertySet.lineno = block.children[0].lineno;
        }

        this.methodSet.adopt(methods);
        if (methods.length) {
            this.methodSet.lineno = methods[methods.length - 1].lineno;
        }
    },

    compileWithInit: function() {
        var i, len, newNode,
        extendsStr   = '',
        ch           = this.children;

        if (this.superClassName) {
            extendsStr = ', ' + this.superClassName;
        }

        newNode = new yy.Lit(this.className + ' = function ' + this.className, ch[0].lineno);
        newNode.loc = ch[1].loc;
        this.children = [
            newNode,
            this.methodSet
        ];

        if (this.superClassName) {
            this.methodSet.children[0].children[1].children += this.runtimeFn('subclass') + this.className + extendsStr +');';
        }
    },

    compileWithoutInit: function() {
        var i, len, newNode,
        ch = this.children,
        superInitStr   = '',
        extendsStr     = '',
        prepareInitStr = '',
        argsStr        = this.propertiesNames.join(', ');


        if (this.hasProperties) {
            prepareInitStr = 'var _conf;_conf=((_conf=arguments[0])&&_conf._conf)?_conf:null; '
        }        

        if (this.superClassName) {
            extendsStr   = ', ' + this.superClassName;            
            if (this.hasProperties) {
                superInitStr = this.superClassName + '.prototype.constructor.call(this, _conf);';
            }
            else {
                superInitStr = this.superClassName + '.prototype.constructor.apply(this, arguments);';
            }
        }

        this.children = [];

        newNode = new yy.Lit(this.className + ' = function ' + this.className, ch[0].lineno);
        newNode.loc = ch[1].loc;
        this.children.push(newNode);

        newNode = new yy.Lit('('+ argsStr +'){' + prepareInitStr + superInitStr, ch[1].lineno);
        newNode.loc = ch[1].loc;
        this.children.push(newNode);

        this.children.push(this.propertySet);
        this.children.push(new yy.Lit('};', this.propertySet.lineno));

        if (this.superClassName) {
            newNode = new yy.Lit(this.runtimeFn('subclass') + this.className + extendsStr +');', this.propertySet.lineno);
            newNode.loc = ch[2].loc;
            this.children.push(newNode);
        }

        this.children.push(this.methodSet);
    },

    compile: function() {
        this.base('compile', arguments);
        if (this.initializerNode) {
            this.compileWithInit();
        }
        else {
            this.compileWithoutInit();
        }
    }        

});


yy.PropertySetNode = Class(yy.Node, {

    type: 'PropertySetNode'

});


yy.PropertyNode = Class(yy.Node, {

    type: 'PropertyNode',

    name: null,

    nameLineno: null,

    hasDefaultValue: false,

    initNode: function() {
        this.base('initNode', arguments);
        this.name = this.children[0].children;
        this.nameLineno = this.children[0].lineno;
        if (this.children.length > 1) {
            this.hasDefaultValue = true;
        }
    },

    compile: function() {
        var
        str = '',
        ch  = this.children;

        ch[0].children = 'this.' + this.name;

        str = '=(_conf&&_conf.hasOwnProperty(\'' + this.name + '\'))?_conf.' + this.name + ':' + this.name;
        
        if (this.hasDefaultValue) {
            str += '==void 0?';
            ch.splice(3, 0, new yy.Lit(':' + this.name, ch[2].lineno));
        }

        ch[1].children = str;
    }
});

yy.MethodSetNode = Class(yy.Node,{
    type: 'MethodSetNode'    
});

yy.MethodNode = Class(yy.Node, {

    type: 'MethodNode',

    name: null,

    nameLineno: null,

    isInitializer: null,

    initNode: function() {
        this.base('initNode', arguments);

        this.name = this.children[0].name;
        this.nameLineno = this.children[0].children[1].lineno;
    },

    compileInit: function() {
        var
        callSuper      = false,
        superInitStr   = '',
        superClassName = this.parent.parent.superClassName;

        if (superClassName) {
            
            preorder(this, function(node) {
                if (node instanceof yy.CallNode && node.name == 'super') {
                    callSuper = true;
                    return false;
                }
            })

            if (!callSuper) {
                superInitStr = superClassName + '.prototype.constructor.apply(this, arguments);';
                this.children[0].block.children.splice(1, 0, new yy.Lit(superInitStr, this.children[0].block.children[0].lineno));
            }
        }

        this.isInitializer = true;
        this.children[0].children.splice(0, 2);        
        this.children[0].context.addLocalVar('me', 'this');
    },

    compile: function() {
        if (this === this.parent.parent.initializerNode) {
            this.compileInit();
        }
        else {
            var className = this.parent.parent.className;
            this.children[0].children[0].children = className + '.prototype.' + this.name + ' = function ';
            this.children[0].context.addLocalVar('me', 'this');    
        }
    }
});

yy.CallNode = Class(yy.Node, {

    type: 'CallNode',

    name: null,

    forSelect: false,

    initNode: function() {
        this.base('initNode', arguments);
        this.context = this.yy.env.context();

        if (this.children[0] instanceof yy.VarNode) {
            this.name = this.children[0].name;
        }
    },

    compile: function() {
        var
        ch = this.children, last, builtin;

        builtin = this[this.name + 'Builtin'];
        if (this.name && isBuiltinFn(this.name) && builtin) {
            builtin.call(this);
        }

        this.base('compile', arguments);
    },

    superBuiltin: function() {
        var
        methodName, cls,
        newNode,
        ch   = this.children,
        stub = '',        
        ctx  = this.yy.env.context();

        if (!(ctx.ownerNode.parent instanceof yy.MethodNode)) {
            this.error("can not call 'super' builtin function outside of method scope", ch[3].lineno);
        }

        cls = ctx.ownerNode.parent.parent.parent;
        
        if (!cls.superClassName) {
            this.error("callign 'super' inside a class which does not inherit", ch[3].lineno);
        }

        if (ctx.ownerNode.parent.isInitializer) {
            methodName = 'constructor';    
        }
        else {
            methodName = ctx.ownerNode.parent.name;
        }

        if (ch[2]) {
            stub += cls.superClassName + '.prototype.' + methodName + '.call';
            this.children[1].children = '(me, ';
            newNode = new yy.Lit(stub, ch[0].lineno);
            newNode.loc = ch[0].loc;
            this.children.splice(0, 1, newNode);
        }
        else {
            stub += cls.superClassName + '.prototype.' + methodName + '.apply';
            this.children[1].children = '(me, arguments';
            newNode = new yy.Lit(stub, ch[0].lineno);
            newNode.loc = ch[0].loc;
            this.children.splice(0, 1, newNode);
        }
    },
    
    errorBuiltin: function() {
        var ch = this.children;
        if (this.parent instanceof yy.SimpleStmtNode) {
            // no arguments
            if (!ch[2]) {
                ch[2] = new yy.Lit('_error', ch[0].lineno);
            }
            
            ch[0].children[0].children = 'throw';            
            ch.splice(1, 1);
            ch.splice(2, 1);
        }
        else {
            this.children = [
                new yy.Lit('_error', ch[0].lineno)
            ]
        }
    },


    regexBuiltin: function() {

        if (!this.children[2]) {
            this.error('invalid regular expression pattern', this.children[0].lineno);
        }

        var
        flags,
        ch      = this.children,
        params  = ch[2],
        patternNode = params.children[0],
        flagsNode   = params.children[2],
        regStart  = /^\'/,
        regEnd    = /\'$/,
        regDelim  = /\//g,
        strDelim  = "\\'",
        newLine   = /\n(\s+)?/g,
        rFlags    = /[gimy]+/,
        rEscape   = /\\(?=[bBdDsSwW])/g;

        function cleanPattern(p) {
            return p.replace(newLine, '').replace(regDelim, '\\/');
        }

        if (patternNode instanceof yy.StringNode && (flagsNode instanceof yy.StringNode || flagsNode == void 0)) {

            patternNode.children = cleanPattern(patternNode.children).replace(regStart, '\/')
                .replace(regEnd, '\/')
                .replace(newLine, '\\n')
                .replace(strDelim, "'");

            if (patternNode.children === '//') {
                this.error('invalid regular expression pattern', patternNode.lineno);
            }

            if (flagsNode) {
                flags = flagsNode.children.replace(regStart, '').replace(regEnd, '');

                if (flags !== '' && !rFlags.test(flags)) {
                    this.error('invalid regular expression flags', flagsNode.lineno);
                }

                patternNode.children += flags;
            }

            this.children = [
                patternNode
            ];

            return;
        } else {
            ch[0].children[0].children = this.runtimePrefix('regex');
        }

        if (patternNode instanceof yy.StringNode) {
            // special symbols
            // bBdDsSwW
            patternNode.children = cleanPattern(patternNode.children).replace(rEscape, '\\\\');
        }

    },

    chanBuiltin: function() {
        var ch = this.children;
        ch[0].children[0].children = this.runtimePrefix('chan');
    },

    timeoutBuiltin: function() {
        if (! isInGoExpr(this)) {
            this.error('unexpected timeout operation', this.lineno);
        }

        var ch = this.children;
        ch[0].children[0].children = this.runtimePrefix('timeout');
        ch.unshift(new yy.Lit((this.forSelect ? '' : 'yield '), getLesserLineNumber(ch[0])))
    },

    copyBuiltin: function() {
        var ch = this.children;
        ch[0].children[0].children = this.runtimePrefix('copy');
    }
});

yy.IfNode = Class(yy.Node, {

    type: 'IfNode',

    compile: function() {
        var
        ch = this.children;

        ch.splice(1, 0, new yy.Lit('(', ch[0].lineno));
        ch.splice(3, 0, new yy.Lit(') ', ch[2].lineno));
    }

});

yy.ElseNode = Class(yy.Node, {

    type: 'ElseNode',

    compile: function() {
        var
        ch = this.children;

        // else if
        if (ch.length === 2) {
            ch.splice(1, 0, new yy.Lit(' ', ch[0].lineno));
        }

    }

});


yy.SwitchNode = Class(yy.Node, {
    
    type: 'SwitchNode',

    compile: function() {
        this.base('initNode', arguments);
        var
        ch = this.children;
        // no expresion
        if (ch[1] === undefined) {
            ch[1] = new yy.Lit('true', ch[0].lineno);
        }
        ch.splice(1, 0, new yy.Lit('(', ch[0].lineno));
        ch.splice(3, 0, new yy.Lit(') ', ch[2].lineno));
    }

});

yy.CaseNode = Class(yy.Node, {

    type: 'CaseNode',

    compile: function() {
        this.base('compile', arguments);
        var
        ch = this.children, ls;

        this.handleFallThrough(ch[1]);

        //if is not "default"
        if (ch[3]) {
            ls = ch[3];
            ls.children.push(new yy.Lit(' break; ', ls.last().lineno - 1));
        }

    },

    handleFallThrough: function(exprList) {
        var i,
        ls = exprList.children,
        len = ls.length;

        for (i = 0; i < len; i++) {
            if (ls[i].children === ',') {
                ls[i].children = ': case ';
            }
        }
    }

});

yy.ForNode = Class(yy.Node, {

    type: 'ForNode',

    compile: function() {
        var ch = this.children, operation, chanName, block;

        if (ch.length <= 3) {
            ch[0].children = 'while ';
        }

        // channel receiving
        if (ch.length === 3 && ch[1] instanceof yy.AssignmentNode && ch[1].children[2] instanceof yy.ReceiveAsyncNode) {
            operation = ch[1];
            chanName  = operation.children[2].channelVarName;
            block     = ch[2];

            ch.splice(1, 1);

            block.children.splice(1, 0,
                new yy.Lit(
                    '; if (' + this.runtimePrefix('isChannel(') + chanName + ') && ' + chanName + '.closed) break;',
                    block.children[0].lineno
                )
            );

            block.children.splice(1, 0, operation);
        }

        if (ch.length === 2) {
            ch.splice(1, 0, new yy.Lit('true', ch[0].lineno));
        }

        ch.splice(1, 0, new yy.Lit('(', ch[0].lineno));
        ch.splice(ch.length - 1, 0, new yy.Lit(') ', getLesserLineNumber(ch[ch.length - 1])));
    }

});


// God save me.
yy.ForInNode = Class(yy.Node, {

    type: 'ForInNode',

    compile: function() {
        var
        ctx = yy.env.context(),
        ch = this.children,
        k, v, str1, str2, str3,
        $i, $len, $coll, $keys;

        if (ch.length === 5) {
            /*
            for v in coll { }
            for (var $coll = coll, $keys = CRL_keys($coll), $i = 0, $len = $keys.length, v; $i < $len; $i++) {v = $coll[$keys[$i]];}
            */
            v     = ch[1].children[0].children;
            $i    = ctx.generateVar('i');
            $len  = ctx.generateVar('len');
            $coll = ctx.generateVar('coll');
            $keys = ctx.generateVar('keys');

            str1 = '(var ' + $coll + ' = ';
            str2 = ', ' +
                   $keys + ' = ' + this.runtimeFn('keys') + $coll + '), ' +
                   $i + ' = 0, ' +
                   $len + ' = ' + $keys + '.length, ' +
                   v + '; ' +
                   $i + ' < ' + $len + '; ' +
                   $i + '++) ';
            str3 = v + ' = ' + $coll + '[' + $keys + '[' + $i + ']];';

            ch[1].markAsLocalVar();
            ch.splice(1, 2, new yy.Lit(str1, ch[2].lineno));
            ch.splice(3, 0, new yy.Lit(str2, ch[2].lineno));
            ch[4].children.splice(1, 0, new yy.Lit(str3, ch[4].children[0].lineno));

        }
        else {
            /*
            for k, v in coll { }
            for (var $coll = coll, $keys = CRL_keys($coll), $i = 0, $len = $keys.length, k, v; $i < $len; $i++) {k = $keys[$i]; v = $coll[k]; }
            */
            k     = ch[1].children[0].children;
            v     = ch[3].children[0].children;
            $i    = ctx.generateVar('i');
            $len  = ctx.generateVar('len');
            $coll = ctx.generateVar('coll');
            $keys = ctx.generateVar('keys');

            str1 = '(var ' + $coll + ' = ';
            str2 = ', ' +
                   $keys + ' = ' + this.runtimeFn('keys') + $coll + '), ' +
                   $i + ' = 0, ' +
                   $len + ' = ' + $keys + '.length, ' +
                   k + ', ' + v + '; ' +
                   $i + ' < ' + $len + '; ' +
                   $i + '++) ';
            str3 = k + ' = ' + $keys + '[' + $i + ']; ' +
                   v + ' = ' + $coll + '[' + k + '];';

            ch[1].markAsLocalVar();
            ch[3].markAsLocalVar();
            ch.splice(1, 4, new yy.Lit(str1, ch[4].lineno));
            ch.splice(3, 0, new yy.Lit(str2, ch[2].lineno));
            ch[4].children.splice(1, 0, new yy.Lit(str3, ch[4].children[0].lineno));
        }

    }

});

yy.ForInRangeNode = Class(yy.Node, {

    type: 'ForInRangeNode',

    compile: function() {
        var
        ctx = yy.env.context(),
        ch = this.children, i, from, to;

        i = ch[1].children[0].children;
        from = ch[3] || new yy.Lit('0', ch[0].lineno);
        to   = ch[5] || new yy.Lit('Infinity', ch[0].lineno);

        /*
        for i in n:m { }
        for (var i = n; i < m; i++) { }
        */
        this.children = [
            new yy.Lit('for (var ' + i + ' = ', ch[0].lineno),
            from,
            new yy.Lit('; ' + i + ' < ', from.lineno),
            to,
            new yy.Lit('; ' + i + '++) ', to.lineno),
            ch[6],
        ];
    }

});


yy.CatchNode = Class(yy.Node, {

    type: 'CatchNode',

    compile: function() {
        var
        ch = this.children;
        
        ch[0].children = 'try { ';
        ch.splice(2, 0, new yy.Lit('; } catch (_error) ', ch[1].lineno));
    }

});


yy.CoalesceNode = Class(yy.Node, {
    
    type: 'CoalesceNode',
    
    ref: null,
    
    initNode: function() {        
        if (this.children[0] instanceof yy.VarNode) {            
            this.ref = this.children[0].name;
        }
        else {             
            this.ref = yy.env.context().generateVar('ref');
            this.yy.env.context().addLocalVar(this.ref);
        }
    },
    
    compile: function() {
        var
        ref = this.ref,
        ch = this.children;
        
        // optimize resulting code ovoiding ref generation
        if (ch[0] instanceof yy.VarNode) {
            this.children = [
                ch[0],                
                new yy.Lit(' != null && '+ ref + ' != void 0 ? ' + ref + ' : ', ch[0].lineno),
                ch[2]
            ];
        }
        else {
            this.children = [
                new yy.Lit('(' + ref + ' = ', ch[0].lineno),
                ch[0],                
                new yy.Lit(', ' + ref + ' != null && '+ ref + ' != void 0 ? ' + ref + ' : ', ch[0].lineno),
                ch[2],
                new yy.Lit(')', ch[2].lineno),
            ];    
        }
    }
});


yy.ExistenceNode = Class(yy.Node, {

    type: 'ExistenceNode',
    
    ref: null,
    
    subject: null,
    
    init: function(sub) {
        this.subject = sub;
        if (sub instanceof yy.Lit) {
            this.error('Invalid operation with ' + sub.children, sub.lineno);
        }
        this.base('init', sub.children);
    },
    
    initNode: function() {
        if (this.children[0] instanceof yy.VarNode ) {
            this.ref = this.children[0].name;
        }
        else {             
            this.ref = yy.env.context().generateVar('ref');
            this.yy.env.context().addLocalVar(this.ref);
        }
    },
    
    compile: function() {
        var
        oldNode, newNode,
        condition,
        ref = this.ref,
        ch  = this.children;
        
        if (this.subject instanceof yy.VarNode) {
            ref = this.ref = this.subject.name = this.subject.name;
        }
        
        // if call node
        if (this.subject instanceof yy.CallNode) {
            condition = ' !== \'function\' ? ';
        }        
        // otherwise
        else {
            condition = ' === \'undefined\' || '+ ref + ' === null ? ';
        }
        
        // replace the first node of the
        // subject by new ref VarNode
        oldNode = this.subject.children[0];
        newNode = new yy.VarNode(oldNode.children);
        newNode.loc    = oldNode.loc;
        newNode.lineno = oldNode.lineno;
        newNode.name   = oldNode.name;

        this.subject.children[0] = newNode;
        
        // optimize resulting code avoiding ref generation
        if (ch[0] instanceof yy.VarNode) {
            this.children = [
                new yy.Lit('typeof ' + ref + condition, ch[0].lineno),
                new yy.Lit('void 0 : ' + ref, this.subject.lineno),
                this.subject,
            ];
        }
        else if (ch[0] instanceof yy.Lit) {
            this.children = [
                new yy.Lit('typeof ' + ref + condition, ch[0].lineno),
                new yy.Lit('void 0 : ' + ref, this.subject.lineno),
                this.subject,
            ];
        }
        else {
            this.children = [
                new yy.Lit('typeof (' + ref + ' = ', ch[0].lineno),
                ch[0],
                new yy.Lit(')' + condition, ch[0].lineno),
                new yy.Lit('void 0 : ' + ref, ch[ch.length - 1].lineno),
                this.subject,
            ];    
        }

        // re-adopt
        this.adopt(this.children);
    }
});


yy.UnaryExistenceNode = Class(yy.ExistenceNode, {

    type: 'UnaryExistenceNode',

    initNode: function() {
        var ch = this.children;

        if (ch.length == 1 && (this.subject instanceof yy.VarNode)) {
            this.ref = this.subject.name;
            this.usingVar = true;
        } else {
            this.ref = yy.env.context().generateVar('ref');
            this.yy.env.context().addLocalVar(this.ref);
        }
    },

    compile: function() {
        var
        ch        = this.children,
        ref       = this.ref,
        condition = '!(typeof ' + ref + ' === \'undefined\' || ' + ref + ' === null)';

        if (this.usingVar) {
            ch.splice(0, 1);
        } else {
            ch.splice(0, 0, new yy.Lit('((' + ref + ' = ', getLesserLineNumber(ch[0])));
            ch.push(new yy.Lit('), ', this.lineno));
            condition += ')';
        }

        ch.push(new yy.Lit(condition, this.lineno));
    }

})


// check if a node is inside a `go` expression
function isInGoExpr(node) {
    var goExprFound = false;

    while(node.parent) {
        node = node.parent;

        if (node instanceof yy.ContextAwareNode && !goExprFound) {
            return false;
        }

        if (node instanceof yy.GoExprNode) {
            goExprFound = true;
        }
    }

    return goExprFound;
}

yy.GoExprNode = Class(yy.Node, {

    type: 'GoExprNode',

    compile: function() {
        var
        ch     = this.children,
        fnNode = ch[1];
        ch[0].children = this.runtimePrefix('go(function* go()');

        fnNode.children[fnNode.children.length - 1].children += ', this)';
    }
})

yy.SendAsyncNode = Class(yy.Node, {

    type: 'SendAsyncNode',

    initNode: function() {
        this.base('initNode', arguments);
        var ctx;

        if (this.children[0] instanceof yy.VarNode) {
            this.channelVarName = this.children[0].name;
        } else {
            ctx = this.yy.env.context();
            this.channelVarName = ctx.generateVar('ch');
            ctx.addLocalVar(this.channelVarName);    
        }
    },

    compile: function() {
        if (! isInGoExpr(this)) {
            this.error('unexpected async operation', this.lineno);
        }

        var
        newChildren,
        ch    = this.children,
        isVar = ch[0] instanceof yy.VarNode;

        if (isVar) {
            newChildren = [];
        } else {
            newChildren = [
                new yy.Lit('(', ch[0].lineno),
                new yy.Lit(this.channelVarName + ' = ', ch[0].lineno),
                ch[0],
                new yy.Lit(',', ch[0].lineno),
            ];
        }

        this.children = newChildren.concat([
            this.compileRequest(),
            new yy.Lit('&&', ch[0].lineno)
        ].concat(this.compilePerform()));

        if (isUsedAsStatement(this)) {
            this.children.unshift(new yy.Lit(';', ch[0].lineno));
        }

        if (!isVar) {
            this.children.push(new yy.Lit(')', ch[ch.length - 1].lineno));
        }
    },

    compileRequest: function() {
        var
        ch = this.children;

        return new yy.Lit('(yield ' + this.runtimeFn('requestSend') + this.channelVarName + '))', ch[0].lineno);
    },

    compilePerform: function() {
        var
        ch = this.children;
        return [
            new yy.Lit('(yield ' + this.runtimeFn('performSend') + this.channelVarName + ', ', ch[2].lineno),
            ch[2],
            new yy.Lit('))', ch[2].lineno)
        ]
    }
})

yy.ReceiveAsyncNode = Class(yy.Node, {

    type: 'ReceiveAsyncNode',

    forSelect: false,

    initNode: function() {
        this.base('initNode', arguments);
        var ctx;

        if (this.children[1] instanceof yy.VarNode) {
            this.channelVarName = this.children[1].name;
        } else {
            ctx = this.yy.env.context();
            this.channelVarName = ctx.generateVar('ch');
            ctx.addLocalVar(this.channelVarName);    
        }
    },

    compile: function() {
        if (! isInGoExpr(this)) {
            this.error('unexpected async operation', this.lineno);
        }

        var
        newChildren,
        ch    = this.children,
        isVar = ch[1] instanceof yy.VarNode;

        if (isVar) {
            newChildren = [];
        } else {
            newChildren = [
                new yy.Lit('(', ch[0].lineno),
                new yy.Lit(this.channelVarName + ' = ', ch[0].lineno),
                ch[1],
                new yy.Lit(',', ch[1].lineno),
            ];
        }

        if (this.forSelect) {
            this.children = newChildren.concat([
                this.compileRequest()
            ]);
        } else {
            this.children = newChildren.concat([
                this.compileRequest(),
                new yy.Lit('? ', ch[1].lineno),
                new yy.Lit('(', ch[1].lineno),
                this.compilePerform(),
                new yy.Lit(')', ch[1].lineno),
                new yy.Lit(': void 0', ch[1].lineno)
            ]);
        }

        if (isUsedAsStatement(this)) {
            this.children.unshift(new yy.Lit(';', ch[0].lineno));
        }

        if (!isVar) {
            this.children.push(new yy.Lit(')', ch[ch.length - 1].lineno));
        }
    },

    compileRequest: function(lineno) {
        var
        ch = this.children,
        fnName = this.forSelect ? 'requestRecvForSelect': 'requestRecv';

        lineno = lineno || ch[1].lineno;

        return new yy.Lit(
            (this.forSelect ? '' : '(yield ') +
            this.runtimeFn(fnName) +
            this.channelVarName +
            (this.forSelect ? ')' : '))'),
        lineno);
    },

    compilePerform: function(lineno) {
        var
        ch = this.children;

        lineno = lineno || ch[1].lineno;

        return new yy.Lit('yield ' + this.runtimeFn('performRecv')  + this.channelVarName + ')' + (this.forSelect ? ';' : ''), lineno)
    }
})


yy.TemplateLiteralNode = Class(yy.Node, {

    type: 'TemplateLiteralNode',

    compile: function() {
        var str, list, i, len, item,
        ch = this.children;

        if (ch.length === 1) {
            // simple template
            ch[0] = new yy.StringNode(ch[0].children.substr(1), ch[0].loc);
        } else {
            // interpolation
            str = ch[0].children;
            ch[0] = new yy.StringNode(str.substring(1, str.length-1) + "' + ", ch[0].loc);

            str = ch[2].children;
            ch[2] = new yy.StringNode(" + '" + str.substring(1), ch[2].loc);

            list = ch[1];

            for (i = -1, len = list.children.length-2; i < len;) {
                i+=2;
                item = list.children[i];
                str  = item.children;
                list.children[i] = new yy.StringNode(" + '" + str.substring(1, str.length-1) + "' + ", item.loc);
            }
        }
    }
})

yy.SelectNode = Class(yy.Node, {

    type: 'SelectNode',

    processOperations: function() {
        var
        i, len, singleCase, cases,
        leftHand, operator, body,
        lineno = getLesserLineNumber(this),
        count = 0, ch  = this.children,
        collectedCases = [],
        caseStmtList   = ch[0].children[1].children;

        for (i = 0, len = caseStmtList.length; i < len; i++) {

            singleCase = caseStmtList[i].children[1];

            if (
                singleCase instanceof yy.ReceiveAsyncNode ||
                (singleCase instanceof yy.CallNode && singleCase.name == 'timeout') ||
                singleCase instanceof yy.AssignmentNode
            ) {
                // process asignement node
                if (singleCase instanceof yy.AssignmentNode) {
                    if (singleCase.children[2] instanceof yy.ReceiveAsyncNode) {
                        leftHand = singleCase.children.shift();
                        operator = singleCase.children.shift();

                        singleCase = singleCase.children[0];
                        singleCase.forSelect = true;

                        body = caseStmtList[i].children[3];
                        body.addFront(leftHand, operator, singleCase.compilePerform(operator.lineno));
                    } else {
                        this.error('unexpected ' + singleCase.type, singleCase.lineno);
                    }
                }

                singleCase.forSelect = true;
                collectedCases.push(singleCase);

                // setup case numbers
                caseStmtList[i].children[1] = new yy.Lit(String(count++), getLesserLineNumber(singleCase));
            } else {
                this.error('unexpected ' + singleCase.type, singleCase.lineno);
            }
        }

        // flatten
        for (i = 0, len = collectedCases.length; i < len; i++) {
            flattenToLine(collectedCases[i], lineno);
        }

        // insert commas
        for (i = 1; i < collectedCases.length; i+=2) {
            collectedCases.splice(i, 0, new yy.Lit(',', lineno));
        }

        this.children = collectedCases.concat(ch)
    },

    compile: function() {
        var
        ch    = this.children,
        first = ch[0];

        // remove first child
        ch.shift();

        // proc
        this.processOperations();

        ch = this.children;
        ch.splice(0, 0, new yy.Lit('(yield ' + this.runtimeFn('select') + '[', getLesserLineNumber(this)));

        first.children = 'switch';
        ch.unshift(first);

        ch.splice(ch.length-1, 0, new yy.Lit('])) ', ch[ch.length-2].lineno))
    }

})

yy.SelectCaseNode = Class(yy.Node, {

    type: 'SelectCaseNode',

    compile: function() {
        var ls = this.children[3];
        ls.children.push(new yy.Lit(' break; ', ls.last().lineno - 1));
    }

})

})(typeof cor === 'undefined' ? {} : cor);

(function(cor){

var yy = cor.yy;


var Compiler = cor.Class({

    generateSourceMap: true,

    program: null,

    columnsTrace: null,

    sourceMap: null,

    parser: null,

    src: null,

    lineOffset: null,

    rIndent: /^\s+/,

    env: null,

    init: function(src, filename, generateSourceMap, lineOffset) {
        this.filename     = filename || '<vm>';
        this.lineOffset   = (lineOffset || 0);
        this.src          = src;
        this.columnsTrace = [];
        this.program      = [];
        this.parser       = new cor.Parser();
        this.parser.yy    = yy;

        if (generateSourceMap) {
            this.sourceMap = new cor.SourceMap();
        }

        this.env = yy.env = new cor.yy.Environment(this.filename);

        this.setup();
    },

    setup: function(){
        var match, piece,
        lineContent, line,
        src   = this.src.split('\n'),
        count = src.length;

        for (line = 1; line <= count; line++) {
            lineContent = src[line - 1];
            match       = this.rIndent.exec(lineContent);
            piece       = match ? match[0].replace(/\t/, '    '): '';
            this.program[line] = piece;
            this.traceColumn(line, piece.length);
        }
    },

    traceColumn: function(line, value) {
        return this.columnsTrace[line] = (this.columnsTrace[line] || 0) + value;
    },

    parse: function() {
        return this.parser.parse(this.src);
    },

    generateCode: function() {
        this.program.shift();
        return this.program.join('\n');
    },

    pushCode: function(compiled, lineno) {
        this.program[lineno] += compiled;
    },

    compile: function(ast) {
        var i,
        slComments = this.env.singleLineComments,
        mlComments = this.env.multipleLineComments,
        slen       = slComments.length,
        mlen       = mlComments.length;

        // write multiple line comments first
        for (i = 0; i < mlen; i++) {
            this.visitNode(mlComments[i]);
        }

        // write
        this.visitNode(ast);

        // write single line comments
        for (i = 0; i < slen; i++) {
            this.visitNode(slComments[i]);
        }

        return this.generateCode();
    },

    afterCompile: function(node, compiled, lineno) {
        var column;
        if (this.sourceMap) {
            if (node instanceof yy.Lit && node.loc && !isNaN(node.loc.first_line)) {
                column = this.columnsTrace[lineno];
                this.sourceMap.add(
                    node.loc.first_line - 1,
                    node.loc.first_column,
                    lineno + (this.lineOffset - 1),
                    column
                );
            }
            this.traceColumn(lineno, compiled.length);
        }
    },

    visitNode: function(node) {
        var i, ch, lineno, compiled;

        if (!node) {
            return;
        }

        if (node instanceof yy.Node) {
            compiled = node.compile();
            lineno   = node.lineno;
            ch       = node.children;

            if (typeof compiled === 'string' && typeof lineno !== 'undefined') {
                this.pushCode(compiled, lineno);
                this.afterCompile(node, compiled, lineno);
            }
        }

        // visit children recursively
        if (ch instanceof Array) {
            for (i = 0; i < ch.length; i++) {
                this.visitNode(ch[i]);
            }
        }

        if (node instanceof yy.ContextAwareNode) {
            yy.env.popContext();
        }

    }

});

cor.Compiler = Compiler;

})(typeof cor === 'undefined' ? {} : cor);

(function(cor){

// This is a version,
// the original code can be found at
// https://github.com/jashkenas/coffeescript/tree/master/src/sourcemap.litcoffee

var
Class                = cor.Class,
VLQ_SHIFT            = 5,
VLQ_CONTINUATION_BIT = 1 << VLQ_SHIFT,
VLQ_VALUE_MASK       = VLQ_CONTINUATION_BIT - 1,
BASE64_CHARS         = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toVlq(value) {
    var nextChunk,
    vlq           = '',
    signBit       = value < 0 ? 1 : 0,
    valueToEncode = (Math.abs(value) << 1) + signBit;

    while (valueToEncode || !vlq) {
        nextChunk     = valueToEncode & VLQ_VALUE_MASK;
        valueToEncode = valueToEncode >> VLQ_SHIFT;

        if (valueToEncode) {
            nextChunk |= VLQ_CONTINUATION_BIT;
        }

        vlq += toBase64(nextChunk);
    }
    return vlq;
};

function toBase64(value) {
    var
    b64 = BASE64_CHARS[value];

    if (! b64) {
        throw 'Can not encode ' + value + ' to base-64';
    }
    return b64;
}

var
LineMap = Class({

    line    : null,
    segments: null,

    init: function(l) {
        this.line    = l;
        this.segments = [];
    },

    add: function(generatedColumn, sourceLine, sourceColumn) {
        this.segments[generatedColumn] = {
            line        : this.line,
            column      : generatedColumn,
            sourceLine  : sourceLine,
            sourceColumn: sourceColumn
        };

        return this.segments;
    }
});

var
SourceMap = Class({

    lines: null,

    names: null,

    init: function() {
        this.lines  = [];
        //this.names  = [];
    },

    add: function(sourceLine, sourceColumn, generatedLine, generatedColumn) {
        var
        line = this.lines[generatedLine];

        if (! line) {
            line = this.lines[generatedLine] = new LineMap(generatedLine);
        }

        line.add(generatedColumn, sourceLine, sourceColumn);
    },

    generate: function(config) {
        config = config || {};

        var i, j, line, sm,
        segment, segmentsLen,
        currentLine      = 0,
        lastSourceLine   = 0,
        lastSourceColumn = 0,
        lastColumn       = 0,
        linesLen         = this.lines.length,
        mapping          = '',
        segmentSep       = '';

        for (i = 0; i < linesLen; i++) {
            line = this.lines[i];

            if (! line) { continue }

            segmentsLen = line.segments.length;

            for (j = 0; j < segmentsLen; j++) {
                segment = line.segments[j];

                if (! segment) { continue }

                while (currentLine < segment.line) {
                    segmentSep = '',
                    lastColumn = 0;
                    mapping    += ';';
                    currentLine++;
                }

                mapping += segmentSep;
                mapping += toVlq(segment.column - lastColumn);
                mapping += toVlq(0);
                mapping += toVlq(segment.sourceLine - lastSourceLine);
                mapping += toVlq(segment.sourceColumn - lastSourceColumn);

                lastColumn       = segment.column;
                lastSourceLine   = segment.sourceLine;
                lastSourceColumn = segment.sourceColumn;

                segmentSep = ',';
            }
        }

        sm = {
            version       : 3,
            file          : '',
            sourceRoot    : '',
            sources       : [''],
            sourcesContent: [null],
            names         : [],
            mappings      : mapping
        };

        if (config.file) {
            sm.file = config.file;
        }

        if (config.sourceRoot){
            sm.sourceRoot = config.sourceRoot;
        }

        if (config.source) {
            sm.sources = [config.source];
        }

        if (config.sourceContent) {
            sm.sourcesContent = [config.sourceContent];
        }

        return JSON.stringify(sm);
    }
});

cor.SourceMap = SourceMap;

})(typeof cor === 'undefined' ? {} : cor);

(function(cor){

var path = {
    fileExts: [
        '.php',
        '.html',
        '.htm',
        '.jsp',
        '.jspx',
        '.asp',
        '.aspx',
        '.json'
    ],

    pathSep: '/',

    // normalizePath('a/b/../../file.cor'.split('/'))
    // taking an array as input
    // will output file.cor
    normalize: function(path, allowUpperRoot) {
        var i,
        up = 0;

        for (i = path.length - 1; i >= 0; i--) {
            switch (path[i]) {
                case '.' :
                    path.splice(i, 1);
                    break;
                case '..' :
                    path.splice(i, 1);
                    up++;
                    break;
                default :
                    if (up) {
                        path.splice(i, 1);
                        up--;
                    }
            }
        }

        if (allowUpperRoot) {
            while (up--) {
                path.unshift('..');
            }
        }

        return path;
    },

    cwd: function() {
        var cwd;

        if (cor.isBrowser) {
            cwd = '/' + window.location.pathname;
        }
        else if (cor.isNode) {
            cwd = require('path').resolve(process.cwd());
        }

        return this.sanitize(cwd);
    },

    sanitize: function(path) {
        return path.replace(/\\/g, this.pathSep).replace(/\/+/g, this.pathSep);
    },

    isRelative: function(path) {
        return /^(\.\.|\.)\//.test(path);
    },

    isAbsolute: function(path) {
        return /^(\/|[a-zA-Z]+\:)/.test(path);
    },

    isFile: function(path) {
        return this.fileExts.indexOf(this.ext(path)) !== -1;
    },

    parse: function(path) {
        var
        rParse  = /^(\/|[a-zA-Z]+\:)?([\s\S]+\/(?!$)|\/)?((?:\.{1,2}$|[\s\S]+?)?(\.[^.\/]*)?)$/,
        parsed = rParse.exec(path);

        //console.log(parsed);
        return {
            root     : parsed[1] || '',
            dir      : parsed[2] || '',
            basename : parsed[3] || '',
            ext      : parsed[4] || ''
        };
    },

    ext: function(path) {
        return this.parse(path).ext;
    },

    basename: function(path, ext) {
        var
        parsed, ret,
        rBasename = /([\s\S]+)*(\.[^.\/]*)/,
        basename  = this.parse(path).basename;

        if (ext && basename.substr(-1 * ext.length) === ext) {
            ret = basename.substr(0, basename.length - ext.length);
        }
        else {
            parsed = rBasename.exec(basename);
            if (parsed && parsed[1]) {
                ret =  parsed[1];
            }
            else {
                ret = '';
            }
        }

        return ret;
    },

    dir: function(path) {
        return this.parse(path).dir;
    },

    resolve: function(path1, path2, noCheckFile) {
        var arr;

        if (!noCheckFile && this.isFile(path1)) {
            parsed = this.parse(path1);
            path1  = parsed.root + parsed.dir;
        }

        arr = this.sanitize(path1 + this.pathSep + path2).split(this.pathSep);
        return this.normalize(arr).join(this.pathSep);
    },

    absolute: function(path) {
        if (! this.isAbsolute(path)) {
            path = this.resolve(this.cwd(), path);
        }
        return path;
    },

    split: function(path) {
        return path.split(this.pathSep);
    },

    join: function() {
        var i, len, stack = [];
        for (i = 0, len = arguments.length; i < len; i++) {
            stack.push(arguments[i]);
        }
        return this.sanitize(stack.join(this.pathSep));
    }

};


cor.path = path;

})(typeof cor === 'undefined' ? {} : cor);
(function(cor){

var
parseJson = typeof JSON !== 'undefined' ? JSON.parse : function parseJson(str) {
    if(! /^([\s\[\{]*(?:"(?:\\.|[^"])+"|-?\d[\d\.]*(?:[Ee][+-]?\d+)?|null|true|false|)[\s\]\}]*(?:,|:|$))+$/.test(str)) {
        throw 'Invalid characters in JSON';
    }
    return eval('(' + str + ')');
};

var fakeProgram = {
    getExports: function() {

    },
    toJs: function() {
        return {src: ''};
    }
};

var
hasProp = Object.prototype.hasOwnProperty,
Class   = cor.Class,
path    = cor.path;

/*
## cor.Loader

This class is responsible for load modules required anywhere
in the source code. It resolve module dependencies

*/
var Loader = Class({
    // the path of the .json file containig the environment variables
    confPath               : null,
    // the modules are astored here once compiled
    moduleCache            : {},
    // path ignored by the loader
    ignoredPaths           : {},
    // a has map of paths to redirect the loader
    // required/path => path/to/redirect
    // the wilcard * redirect the rest of the paths
    pathMap                : {'*': ''},
    // number of loaded modules
    numModules             : 0,
    // number of rquired modules
    numRequiredModules     : 0,
    // the path of the entry module
    entryModulePath        : null,

    // plugins to extend the loader funcionality
    plugins : {},

    isReady: false,

    init: function() {
        var
        me = this,
        originalOnReadFileSuccess = this.onReadFileSuccess,
        originalOnReadFileFailure = this.onReadFileFailure;

        this.onReadFileSuccess = function onReadFileSuccess() {
            originalOnReadFileSuccess.apply(me, arguments);
        };

        this.onReadFileFailure = function onReadFileFailure() {
            originalOnReadFileFailure.apply(me, arguments);
        };
    },

    error: function error(msg, from) {
        return new Error((from ? from : '') + ': ' + msg);
    },

    /*
    plugin parameter must be an Object
    with the following format:
    {
        ext: 'file_extension',

        // this function will find the required modules inside the source code
        // the parameters passed are the source code and the route of the file
        // returns an array
        findRequired: function(src, from){

        },

        // this function should compile the source code to javascript
        // the parammeters are source code and the route of the loaded file
        // should return an object whith the following format:
        // {
        //     prefix: '',
        //     src: '',
        //     suffix: ''
        // }
        toJs: function(src, from){

        }
    }
    */
    addPlugin: function(plugin) {
        if (plugin) {
            if (typeof plugin.ext !== 'string') {
                throw this.error("'ext' property must be string");
            }
            if (typeof plugin.findRequired !== 'function') {
                throw this.error("'findRequired' function is not implemented in " + plugin.ext + "' plugin");
            }
            if (typeof plugin.toJs !== 'function') {
                throw this.error("'toJs' function is not implemented in '" + plugin.ext + "' plugin");
            }
            this.plugins[plugin.ext] = plugin;
            path.fileExts.push(plugin.ext);
        }
        else {
            throw this.error("Invalid object for plugin" + ext + "'");
        }
    },

    /*
    readFile will read files using XHTTPRequest
    */
    readFile: function(path, from, onLoad, onError) {
        var
        e, xhr,
        sync = !onLoad;

        xhr = (typeof ActiveXObject === 'function')
            ? new ActiveXObject('Microsoft.XMLHTTP')
            : new XMLHttpRequest();

        function everyThingOk() {
            return (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304 || xhr.status === 1223);
        }

        try {
            xhr.open('GET', path, !sync);
            if (sync) {
                xhr.send(null);
                if (everyThingOk()) {
                    return xhr.responseText;
                }
                else {
                    this.error('There is not file at ' + path, from);
                }
            }
            else {
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4 ) {
                        if (everyThingOk()) {
                            onLoad(path, from, xhr.responseText);
                        }
                        else {
                            if (typeof onError === 'function') {
                                onError(path, from);
                            }
                        }
                    }
                }
                xhr.send(null);
            }
        }
        catch (e) {
            throw this.error('Could not use XMLHttpRequest for ' + path + '(' + e.toString() + ')', from);
        }
    },

    // add paths to be ignored by the loader
    // `path` parameter is an array
    ignorePath: function(path) {
        var i, len;
        if (path instanceof Array) {
            for (i = 0, len = path.length; i < len; i++) {
                this.ignoredPaths[path[i]] = true;
            }    
        }
        else {
            this.ignoredPaths[path] = true;
        }
    },

    resolveMappedPath: function(srcPath) {
        var
        name, candidate, ret = '';

        for (name in this.pathMap) {
            if (hasProp.call(this.pathMap, name) && srcPath.indexOf(name) === 0) {
                candidate = this.pathMap[name] + srcPath.substr(name.length);
            }
        }

        if (candidate) {
            ret = path.sanitize(candidate);
        }

        return ret;
    },

    registerModule: function(path, src, deps) {
        var
        p = new Program(path, src, deps, this);
        this.moduleCache[path] = p;
        this.numModules++;
    },

    onReadFileSuccess: function onReadFileSuccess(srcPath, from, txt) {
        var
        i, len, absolutePath,
        requiredPath, required,
        ext         = path.ext(srcPath),
        plugin      = this.plugins[ext],
        dependences = {};

        if (plugin) {
            required = plugin.findRequired(txt, from);
        }
        else {
            throw this.error("Extension '" + ext + "' is not supported");
        }

        for (i = 0, len = required.length; i < len; i++) {
            requiredPath = required[i];

            if (this.ignoredPaths[requiredPath]) {
                continue;
            }
            
            if (path.isAbsolute(requiredPath)) {
                absolutePath = path.sanitize(requiredPath);
            }
            else {
                absolutePath = this.resolveMappedPath(requiredPath);
                if (! absolutePath) {
                   absolutePath = path.resolve(srcPath, requiredPath);
                }
            }

            dependences[requiredPath] = absolutePath;
            this.requireModule(absolutePath, srcPath);
        }

        this.registerModule(srcPath, txt, dependences);

        if (this.numModules === this.numRequiredModules) {
            this.onLoaderReady();
        }
    },

    onReadFileFailure: function onReadFileFailure(srcPath, from) {
        console.error('Unable to read ', srcPath, ' requested from ', from);
    },

    onLoaderReady: function() {
        var module;
        if (this.isReady) { return }

        module = this.moduleCache[this.entryModulePath];
        if (module) {
            this.isReady = true;
            return module.getExports();
        }
        else {
            this.error('Entry module not found');
        }
    },

    setPath: function(srcPaths, confPath) {
        var name;
        for (name in srcPaths) {
            this.pathMap[name] = path.resolve(confPath, srcPaths[name]);
        }
    },

    requireModule: function(srcPath, from) {
        if (! (this.ignoredPaths[srcPath] || this.moduleCache[srcPath])) {
            this.ignorePath(srcPath);

            var ext = path.ext(srcPath);
            if (ext === '') {
                srcPath += path.ext(from);
            }

            if (! this.entryModulePath) {
                this.entryModulePath = srcPath;
            }
            this.numRequiredModules++;
            this.readFile(srcPath, from, this.onReadFileSuccess, this.onReadFileFailure);
        }
    },

    setEntry: function(entryPath, confPath) {
        var
        me  = this,
        cwd = path.cwd();

        if (entryPath) {
            if (path.ext(confPath) === '.json') {
                me.readFile(confPath, cwd, function onConfReady(confPath, from, txt) {
                    var
                    conf = parseJson(txt);
                    me.confPath = path.resolve(cwd, confPath);
                    if (conf) {
                        if (conf.ignore) {
                            me.ignorePath(conf.ignore);
                        }
                        if (conf.paths) {
                            me.setPath(conf.paths, me.confPath);
                        }
                        me.boot(entryPath);
                    }
                },
                me.onReadFileFailure);
            }
            else {
                me.boot(entryPath);
            }
        }
    },

    boot: function(srcPath) {
        var
        resolved = path.resolve(path.cwd(), srcPath);
        this.requireModule(resolved, path.cwd());
    }

});

// Program Class
var Program = Class({

    filename    : null,
    exports     : null,
    dependences : null,
    src         : '',
    environment : null,
    loader      : null,
    usesRuntime : false,


    init: function(path, src, deps, loader) {
        this.src         = src;
        this.filename    = path;
        this.dependences = deps;
        this.loader      = loader;
    },

    getExports: function() {
        var path, prog, js;

        if (this.environment === null) {

            js = this.toJs();

            prog = (new Function('return function(require,module,exports){' +
                  (js.prefix  || '') +
                  (js.src     || '') + '\n}' +
                  (js.suffix  || '')
            ))();

            if (typeof prog === 'function') {
                this.environment = this.newModule();
                prog(this.environment.require, this.environment, this.environment.exports);
            }
            else {
                this.loader.error('Error while attemp to execute ' + path);
            }
        }

        return this.environment.exports;
    },

    newModule: function() {
        var
        me     = this,
        newMod = {
            exports: {},

            require: function require(srcPath) {
                var
                cache   = me.loader.moduleCache,
                depPath = me.dependences[srcPath],
                module;

                if (path.ext(depPath) === '') {
                    module = cache[depPath + path.ext(me.filename)];
                }
                else {
                    module = cache[depPath];
                }

                if (module) {
                    return module.getExports();
                }
                else if (! me.loader.ignoredPaths[srcPath]) {
                    throw me.loader.error("Can not find module '" + srcPath + "'", me.filename);
                }
            }
        };

        return newMod;
    },

    toJs: function() {
        var
        js,
        ext    = path.ext(this.filename),
        plugin = this.loader.plugins[ext];

        if (plugin) {            
            js = plugin.toJs(this.src, this.filename)
            if (typeof js === 'string') {
                js = {src: js};
            }
            this.usesRuntime = js.usesRuntime;
            return js;
        }
        else {
            throw this.error('Can not translate to javascript files \'.' + ext + "'", this.filename);
        }
    }
});

// public to cor namespace
cor.Loader  = Loader;
cor.Program = Program;

})(typeof cor === 'undefined' ? {} : cor);
(function(cor){

var
loader   = cor.loader = new cor.Loader(),
path     = cor.path;
isBooted = false;

function bootApp() {
    if (isBooted) {
        return;
    }
    
    isBooted = true;

    var
    entry, conf,
    scripts = document.getElementsByTagName('script'),
    len     = scripts.length,
    i       = -1;

    while (++i < len) {
        entry = entry || scripts[i].getAttribute('data-entry');
        conf  = conf  || scripts[i].getAttribute('data-conf');
    }

    loader.setEntry(path.sanitize(entry || ''), path.sanitize(conf || ''));

}

if (cor.isBrowser) {
    if (document.readyState === 'complete') {
        bootApp();
    }
    else {
        if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', bootApp, false);
            window.addEventListener('load', bootApp, false);
        }
        else {
            document.attachEvent('onreadystatechange', bootApp);
            window.attachEvent('onload', bootApp);
        }
    }    
}

})(typeof cor === 'undefined' ? {} : cor);

(function(cor){

var
loader = cor.loader,
path   = cor.path;

//Custom plugin for .js files
loader.addPlugin({

    ext       : '.js',
    rComments : /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
    rRequire  : /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
    rootPath  : null,

    getRootPath: function() {
        if (cor.isBrowser) {
            if (!this.rootPath) {
                this.rootPath = window.location.protocol + '//' + window.location.host;
            }
            return this.rootPath;
        }
        else {
            return '';
        }
    },

    findRequired: function(str) {
        var
        matches = [];

        str.
        replace(this.rComments, '').
        replace(this.rRequire, function collectRequired(s, m){
            matches.push(m);
        });

        return matches;
    },

    toJs: function(txt, from) {
        return {
            src  : txt,
            suffix: '//# sourceURL=' + this.getRootPath() + from
        };
    }
});


var
Compiler = cor.Compiler;

//Custom plugin for .cor files
loader.addPlugin({

    ext       : '.cor',
    rComments : /\/\/([\s\S]*?)\n|---([\s\S]*?)---/g,
    rRequire  : /(?:^|\s)use\s*['"]([\w-\.\/]*?)['"]/g,

    findRequired: function(str, from) {
        var parsed,
        matches = [],
        me      = this;

        str.
        replace(this.rComments, '').
        replace(this.rRequire, function collectRequired(s, m) {
            var srcPath, mappedPath;

            if (path.ext(m) === '.cor') {
                throw loader.error("Can not require directly require '.cor' modules", from);
            }

            srcPath = cor.yy.generateRoute(m);

            matches.push(srcPath);
        });

        return matches;
    },

    toJs: function(src, from) {
        var
        ast, js, smap,
        suffix = '',
        comp   = new Compiler(src, from, cor.isBrowser, 1);

        ast    = comp.parse();
        js     = comp.compile(ast);
        smap   = comp.sourceMap;

        if (smap
            && typeof btoa !== 'undefined'
            && typeof unescape !== 'undefined'
            && typeof encodeURIComponent !== 'undefined') {

            smap = smap.generate({
                source       : from.split('/').pop(),
                sourceContent: src
            });

            //console.log(smap);
            //console.log(new Function(js));
            suffix = '//# sourceMappingURL=data:application/json;base64,' + (btoa(unescape(encodeURIComponent(smap))));
            suffix += '\n//# sourceURL=' + from;
        }

        //console.log(src);
        return {
            src   : js,
            suffix: suffix,
            usesRuntime: comp.env.usesRuntime,
        };
    }

});

})(typeof cor === 'undefined' ? {} : cor);
