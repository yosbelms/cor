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

CRL.copyObj = function(from, to, strict) {
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

CRL.create = function(Class) {
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
};

CRL.applyConf = function(obj, conf) {
    if (conf instanceof this.Conf) {
        this.copyObj(conf.data, obj, true);
        return true;
    }
    return false;
};

CRL.defClass = function(Class, supers) {
    var
    len, i, _super,
    superIds,
    newProto = {};

    if (supers) {
        superIds = {};
        len      = supers.length;

        for (i = 0; i < len; i++) {
            _super = supers[i];
            if (!_super.$classId) {
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
};


CRL.keys = function(obj) {
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

CRL.assertType = function(obj, Class) {
    var
    classId,
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
                superIds = objectClass.$superIds || {};
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
};


CRL.Conf = function(obj) {
    this.data = obj || {};
};

})();

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


    cor.version = '0.1.0';

    cor.compile = function(src, filename) {
        var
        comp = new cor.Compiler(src),
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
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[2,4],$V1=[1,11],$V2=[1,14],$V3=[1,9],$V4=[1,10],$V5=[1,12],$V6=[5,9,10,22,26,35],$V7=[1,23],$V8=[5,14,16,18,22,24,29,32,116,119,121],$V9=[5,22],$Va=[1,44],$Vb=[1,42],$Vc=[1,57],$Vd=[1,53],$Ve=[1,52],$Vf=[1,54],$Vg=[1,55],$Vh=[1,56],$Vi=[1,48],$Vj=[1,49],$Vk=[1,50],$Vl=[1,51],$Vm=[1,41],$Vn=[1,40],$Vo=[1,64],$Vp=[5,14,16,18,22,29,32,119],$Vq=[2,125],$Vr=[1,69],$Vs=[1,70],$Vt=[5,14,16,18,22,29,32,48,103,104,119],$Vu=[1,71],$Vv=[1,72],$Vw=[1,73],$Vx=[1,74],$Vy=[1,75],$Vz=[1,76],$VA=[5,14,16,18,22,27,29,32,48,103,104,108,109,110,111,112,113,116,119,121],$VB=[2,90],$VC=[5,14,16,18,22,29,32,48,103,104,108,109,110,111,112,113,119],$VD=[5,14,16,18,22,24,27,29,32,48,103,104,108,109,110,111,112,113,115,116,119,121],$VE=[2,87],$VF=[2,100],$VG=[1,87],$VH=[1,85],$VI=[1,86],$VJ=[2,92],$VK=[1,95],$VL=[29,32],$VM=[1,102],$VN=[2,10],$VO=[1,101],$VP=[16,32],$VQ=[32,119],$VR=[1,131],$VS=[10,18,22,26],$VT=[18,22],$VU=[2,33],$VV=[1,175],$VW=[1,176],$VX=[1,177],$VY=[1,178],$VZ=[1,182],$V_=[1,183],$V$=[1,179],$V01=[1,180],$V11=[1,181],$V21=[1,190],$V31=[1,191],$V41=[10,18,22,27,36,50,55,62,67,69,71,78,82,86,89,95,96,97,98,103,104,105,106],$V51=[2,39],$V61=[1,199],$V71=[2,40],$V81=[1,200],$V91=[2,173],$Va1=[1,211],$Vb1=[1,212],$Vc1=[2,171],$Vd1=[16,18,22],$Ve1=[2,117],$Vf1=[1,231],$Vg1=[2,174],$Vh1=[1,238],$Vi1=[2,172],$Vj1=[1,250],$Vk1=[1,251],$Vl1=[18,67,69],$Vm1=[1,280],$Vn1=[1,277],$Vo1=[1,278],$Vp1=[1,279];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"Module":3,"Source":4,"EOF":5,"GlobalStmt":6,"GlobalStmtNoSemicolon":7,"ClassStmt":8,"CLASS":9,"IDENT":10,"ClassStmt_option0":11,"ClassBlock":12,"CombineStmt":13,":":14,"QualifiedIdentList":15,"{":16,"MemberList":17,"}":18,"Member":19,"MemberNotSemicolon":20,"PropertyDecl":21,";":22,"FunctionStmt":23,"=":24,"Value":25,"FUNC":26,"(":27,"FunctionStmt_option0":28,")":29,"Block":30,"FunctionArgs":31,",":32,"StmtList":33,"UseStmt":34,"USE":35,"STRING":36,"UseStmt_option0":37,"GlobalDeclarationStmt":38,"QualifiedIdent":39,"Stmt":40,"StmtNotSemicolon":41,"StrictStmtList":42,"SimpleStmt":43,"Expr":44,"IncDecStmt":45,"SimpleStmtNotSemicolon":46,"OperationExpr":47,"INCDECOP":48,"IfStmt":49,"IF":50,"IfStmt_option0":51,"ElseStmt":52,"ELSE":53,"ForStmt":54,"FOR":55,"ForStmt_option0":56,"ForStmt_option1":57,"ForStmt_option2":58,"ForInStmt":59,"IN":60,"SwitchStmt":61,"SWITCH":62,"SwitchStmt_option0":63,"CaseBlock":64,"CaseStmtList":65,"CaseStmt":66,"CASE":67,"ExprList":68,"DEFAULT":69,"TryCatchFinallyStmt":70,"TRY":71,"CatchStmt":72,"FinallyStmt":73,"CATCH":74,"CatchStmt_option0":75,"FINALLY":76,"ThrowStmt":77,"THROW":78,"ThrowStmt_option0":79,"ThrowStmtNotSemicolon":80,"ReturnStmt":81,"RETURN":82,"ReturnStmt_option0":83,"ReturnStmtNotSemicolon":84,"BreakStmt":85,"BREAK":86,"BreakStmtNotSemicolon":87,"ContinueStmt":88,"CONTINUE":89,"ContinueStmtNotSemicolon":90,"LeftHandExpr":91,"IndexExpr":92,"SelectorExpr":93,"PrimaryExpr":94,"ME":95,"BOOLEAN":96,"NUMBER":97,"NIL":98,"SliceExpr":99,"CallExpr":100,"TypeAssertExpr":101,"UnaryExpr":102,"+":103,"-":104,"!":105,"~":106,"OperationExprNotAdditive":107,"*":108,"/":109,"%":110,"SHIFTOP":111,"COMPARISONOP":112,"BINARYOP":113,"AssignmentExpr":114,"ASSIGNMENTOP":115,"[":116,"SliceExpr_option0":117,"SliceExpr_option1":118,"]":119,"CallExpr_option0":120,".":121,"TypeAssertExpr_option0":122,"ObjectConstructor":123,"@":124,"ObjectConstructor_option0":125,"ObjectConstructorArgs":126,"SimpleElementList":127,"KeyedElementList":128,"KeyedElement":129,"KeyedElementList_option0":130,"SimpleElementList_option0":131,"ArrayConstructor":132,"ArrayConstructor_option0":133,"ArrayItems":134,"ArrayItems_option0":135,"LambdaConstructor":136,"LambdaConstructor_option0":137,"Constructor":138,"ValueList":139,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",9:"CLASS",10:"IDENT",14:":",16:"{",18:"}",22:";",24:"=",26:"FUNC",27:"(",29:")",32:",",35:"USE",36:"STRING",48:"INCDECOP",50:"IF",53:"ELSE",55:"FOR",60:"IN",62:"SWITCH",67:"CASE",69:"DEFAULT",71:"TRY",74:"CATCH",76:"FINALLY",78:"THROW",82:"RETURN",86:"BREAK",89:"CONTINUE",95:"ME",96:"BOOLEAN",97:"NUMBER",98:"NIL",103:"+",104:"-",105:"!",106:"~",108:"*",109:"/",110:"%",111:"SHIFTOP",112:"COMPARISONOP",113:"BINARYOP",115:"ASSIGNMENTOP",116:"[",119:"]",121:".",124:"@"},
productions_: [0,[3,2],[4,2],[4,1],[4,0],[8,4],[13,2],[12,3],[17,2],[17,1],[17,0],[19,2],[19,2],[19,1],[20,1],[20,1],[21,3],[21,1],[23,6],[31,1],[31,3],[30,3],[34,3],[38,3],[6,1],[6,1],[6,2],[6,2],[6,1],[7,1],[7,1],[33,2],[33,1],[33,0],[42,1],[42,2],[43,2],[43,2],[43,1],[46,1],[46,1],[45,2],[49,4],[52,2],[52,2],[54,7],[54,3],[54,2],[59,5],[59,7],[61,3],[64,3],[65,1],[65,2],[66,4],[66,3],[70,2],[70,3],[70,3],[70,4],[72,3],[73,2],[77,3],[80,2],[80,1],[81,3],[84,2],[84,1],[85,2],[87,1],[88,2],[90,1],[40,1],[40,1],[40,1],[40,1],[40,1],[40,1],[40,1],[40,1],[40,1],[40,1],[41,1],[41,1],[41,1],[41,1],[41,1],[91,1],[91,1],[91,1],[94,1],[94,1],[94,1],[94,1],[94,1],[94,1],[94,3],[94,1],[94,1],[94,1],[102,1],[102,2],[102,2],[102,2],[102,2],[107,1],[107,3],[107,3],[107,3],[107,3],[107,3],[107,3],[47,1],[47,3],[47,3],[114,3],[114,3],[68,1],[68,3],[99,6],[100,4],[93,3],[92,3],[92,4],[101,5],[44,1],[44,1],[123,3],[123,2],[126,2],[126,3],[126,3],[15,1],[15,3],[39,1],[39,3],[128,1],[128,3],[129,3],[129,3],[127,1],[127,3],[132,3],[134,1],[134,3],[136,5],[138,1],[138,1],[138,1],[25,1],[25,1],[139,1],[139,3],[11,0],[11,1],[28,0],[28,1],[37,0],[37,1],[51,0],[51,1],[56,0],[56,1],[57,0],[57,1],[58,0],[58,1],[63,0],[63,1],[75,0],[75,1],[79,0],[79,1],[83,0],[83,1],[117,0],[117,1],[118,0],[118,1],[120,0],[120,1],[122,0],[122,1],[125,0],[125,1],[130,0],[130,1],[131,0],[131,1],[133,0],[133,1],[135,0],[135,1],[137,0],[137,1]],
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
case 6: case 43: case 44: case 61: case 63: case 66:
 this.$= new yy.Node(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 7: case 51: case 142:
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
case 9: case 34: case 117: case 132: case 136: case 140: case 143: case 151:
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
case 19: case 134:
 this.$= new yy.List(new yy.Lit($$[$0], _$[$0])) 
break;
case 20: case 135:
 $$[$0-2].add(new yy.Lit($$[$0-1], _$[$0-1]), new yy.Lit($$[$0], _$[$0])) 
break;
case 21:

            this.$= new yy.Node(
                new yy.Lit($$[$0-2], _$[$0-2]),
                $$[$0-1],
                new yy.Lit($$[$0], _$[$0])
            )
        
break;
case 22:
 this.$= new yy.UseNode(new yy.Str($$[$0-2], _$[$0-2]), new yy.Lit($$[$0-1], _$[$0-1]), $$[$0] ? new yy.Lit($$[$0], _$[$0]) : null) 
break;
case 23: case 115: case 116:
 this.$= new yy.AssignmentNode($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 26: case 27:
 $$[$0-1].children.push(new yy.Lit(';', _$[$0])); this.$ = $$[$0-1] 
break;
case 28: case 38:
 this.$= new yy.Lit(';', _$[$0]) 
break;
case 35: case 53:
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
 this.$= new yy.SwitchNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], $$[$0]) 
break;
case 52:
 this.$ = new yy.List($$[$0]) 
break;
case 54:
 this.$= new yy.CaseNode(new yy.Lit($$[$0-3], _$[$0-3]), $$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 55:
 this.$= new yy.CaseNode(new yy.Lit($$[$0-2], _$[$0-2]), new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 56:
 this.$= new yy.TryNode(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 57: case 58:
 this.$= new yy.TryNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], $$[$0]) 
break;
case 59:
 this.$= new yy.TryNode(new yy.Lit($$[$0-3], _$[$0-3]), $$[$0-2], $$[$0-1], $$[$0]) 
break;
case 60:
 this.$= new yy.CatchNode(new yy.Lit($$[$0-2], _$[$0-2]), new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 62: case 65:
 this.$= new yy.Node(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit(';', _$[$0])) 
break;
case 64: case 67: case 93: case 94: case 95:
 this.$= new yy.Lit($$[$0], _$[$0]) 
break;
case 68: case 70:
 this.$= new yy.Node(new yy.Lit($$[$0-1], _$[$0-1]), new yy.Lit(';', _$[$0])) 
break;
case 69: case 71:
 this.$= new yy.Node(new yy.Lit($$[$0], _$[$0])) 
break;
case 87:
 this.$= new yy.VarNode(new yy.Lit($$[$0], _$[$0])) 
break;
case 91:
 this.$= new yy.MeNode($$[$0], _$[$0]) 
break;
case 92:
 this.$= new yy.Str($$[$0], _$[$0]) 
break;
case 96:
 this.$= new yy.AssociationNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 101: case 102: case 103: case 104:
 this.$= new yy.UnaryExprNode(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 106: case 107: case 108: case 109: case 110: case 111: case 113: case 114:
 this.$= new yy.Node($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 118: case 133: case 152:
 $$[$0-2].add(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 119:

            this.$= new yy.SliceNode(
                $$[$0-5],
                new yy.Lit($$[$0-4], _$[$0-4]),
                $$[$0-3],
                new yy.Lit($$[$0-2], _$[$0-2]),
                $$[$0-1],
                new yy.Lit($$[$0], _$[$0])
            )
        
break;
case 120:
 this.$= new yy.CallNode($$[$0-3], new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 121: case 122:
 this.$= new yy.Node($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), new yy.Lit($$[$0], _$[$0])) 
break;
case 123:
 this.$= new yy.Node($$[$0-3], new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 124:

            this.$= new yy.TypeAssertNode(
                $$[$0-4],
                new yy.Lit($$[$0-3], _$[$0-3]),
                new yy.Lit($$[$0-2], _$[$0-2]),
                $$[$0-1],
                new yy.Lit($$[$0], _$[$0])
            )
        
break;
case 127:
 this.$= new yy.ObjectConstructorNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], $$[$0]) 
break;
case 128:
 this.$= new yy.ObjectConstructorNode(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 129:
 this.$= new yy.ObjectConstructorArgsNode(new yy.Lit($$[$0-1], _$[$0-1]), null, new yy.Lit($$[$0], _$[$0])) 
break;
case 130:
 this.$= new yy.ObjectConstructorArgsNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 131:
 this.$= new yy.ObjectConstructorArgsNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0]), true) 
break;
case 137:

            if ($$[$0] instanceof yy.List)   {
                $$[$0].addFront($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]))
                this.$= $$[$0]
            }
            else if ($$[$0]){
                this.$= new yy.List($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0])
            }
        
break;
case 138:
 this.$= new yy.Node(new yy.Lit($$[$0-2], _$[$0-2]), new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 139:
 this.$= new yy.Node(new yy.Str($$[$0-2], _$[$0-2]), new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 141:

            if ($$[$0] instanceof yy.List) {
                $$[$0].addFront($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]))
                this.$= $$[$0]
            }
            else if ($$[$0]){
                this.$= new yy.List($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0])
            }
        
break;
case 144:

            if ($$[$0] instanceof yy.List) {
                $$[$0].addFront($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]))
                this.$= $$[$0]
            }
            else if ($$[$0]) {
                this.$= new yy.List($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0])
            }

        
break;
case 145:

            this.$= new yy.FunctionNode(
                new yy.Lit($$[$0-4], _$[$0-4]),
                null,
                new yy.Lit($$[$0-3], _$[$0-3]),
                $$[$0-2],
                new yy.Lit($$[$0-1], _$[$0-1]),
                $$[$0]
            )
        
break;
}
},
table: [{3:1,4:2,5:$V0,6:3,7:4,8:6,9:$V1,10:$V2,22:$V3,23:5,26:$V4,34:7,35:$V5,38:8,39:13},{1:[3]},{5:[1,15]},{4:16,5:$V0,6:3,7:4,8:6,9:$V1,10:$V2,22:$V3,23:5,26:$V4,34:7,35:$V5,38:8,39:13},{5:[2,3]},o($V6,[2,24]),o($V6,[2,25]),{5:[2,29],22:[1,17]},{5:[2,30],22:[1,18]},o($V6,[2,28]),{10:[1,19]},{10:[1,20]},{36:[1,21]},{24:[1,22],121:$V7},o($V8,[2,134]),{1:[2,1]},{5:[2,2]},o($V6,[2,26]),o($V6,[2,27]),{27:[1,24]},{11:25,13:26,14:[1,27],16:[2,153]},o($V9,[2,157],{37:28,10:[1,29]}),{10:$Va,25:30,26:$Vb,27:$Vc,36:$Vd,44:31,47:33,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34,116:$Vm,123:35,124:$Vn,132:36,136:37,138:32},{10:[1,61]},{10:$Vo,28:62,29:[2,155],31:63},{12:65,16:[1,66]},{16:[2,154]},{10:$V2,15:67,39:68},o($V9,[2,22]),o($V9,[2,158]),o($V9,[2,23]),o($Vp,[2,149]),o($Vp,[2,150]),o($Vp,$Vq,{103:$Vr,104:$Vs}),o($Vp,[2,126]),o($Vp,[2,146]),o($Vp,[2,147]),o($Vp,[2,148]),o($Vt,[2,112],{108:$Vu,109:$Vv,110:$Vw,111:$Vx,112:$Vy,113:$Vz}),o($VA,$VB,{24:[1,78],115:[1,77]}),{10:$V2,39:80,116:[2,183],125:79},{10:$Va,25:83,26:$Vb,27:$Vc,36:$Vd,44:31,47:33,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34,116:$Vm,119:[2,189],123:35,124:$Vn,132:36,133:81,134:82,136:37,138:32},{27:[1,84]},o($VC,[2,105]),o($VD,$VE),o($VD,[2,88]),o($VD,[2,89]),o($VC,$VF,{27:$VG,116:$VH,121:$VI}),{10:$Va,27:$Vc,36:$Vd,91:89,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:88,103:$Vi,104:$Vj,105:$Vk,106:$Vl},{10:$Va,27:$Vc,36:$Vd,91:89,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:90,103:$Vi,104:$Vj,105:$Vk,106:$Vl},{10:$Va,27:$Vc,36:$Vd,91:89,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:91,103:$Vi,104:$Vj,105:$Vk,106:$Vl},{10:$Va,27:$Vc,36:$Vd,91:89,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:92,103:$Vi,104:$Vj,105:$Vk,106:$Vl},o($VA,[2,91]),o($VA,$VJ),o($VA,[2,93]),o($VA,[2,94]),o($VA,[2,95]),{10:$Va,27:$Vc,36:$Vd,47:93,91:89,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38},o($VA,[2,97]),o($VA,[2,98]),o($VA,[2,99]),o($V8,[2,135]),{29:[1,94]},{29:[2,156],32:$VK},o($VL,[2,19]),o($V6,[2,5]),{10:$VM,17:96,18:$VN,19:97,20:98,21:99,22:$VO,23:100,26:$V4},{16:[2,6],32:[1,103]},o($VP,[2,132],{121:$V7}),{10:$Va,27:$Vc,36:$Vd,91:89,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:104},{10:$Va,27:$Vc,36:$Vd,91:89,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:105},{10:$Va,27:$Vc,36:$Vd,91:89,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:106,103:$Vi,104:$Vj,105:$Vk,106:$Vl},{10:$Va,27:$Vc,36:$Vd,91:89,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:107,103:$Vi,104:$Vj,105:$Vk,106:$Vl},{10:$Va,27:$Vc,36:$Vd,91:89,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:108,103:$Vi,104:$Vj,105:$Vk,106:$Vl},{10:$Va,27:$Vc,36:$Vd,91:89,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:109,103:$Vi,104:$Vj,105:$Vk,106:$Vl},{10:$Va,27:$Vc,36:$Vd,91:89,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:110,103:$Vi,104:$Vj,105:$Vk,106:$Vl},{10:$Va,27:$Vc,36:$Vd,91:89,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:111,103:$Vi,104:$Vj,105:$Vk,106:$Vl},{10:$Va,25:112,26:$Vb,27:$Vc,36:$Vd,44:31,47:33,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34,116:$Vm,123:35,124:$Vn,132:36,136:37,138:32},{10:$Va,25:113,26:$Vb,27:$Vc,36:$Vd,44:31,47:33,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34,116:$Vm,123:35,124:$Vn,132:36,136:37,138:32},{116:[1,115],126:114},o($Vp,[2,128],{116:[2,184],121:$V7}),{119:[1,116]},{32:[1,117],119:[2,190]},o($VQ,[2,143]),{10:$Vo,29:[2,193],31:119,137:118},{10:$Va,14:[2,175],27:$Vc,36:$Vd,47:123,91:89,92:45,93:46,94:121,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,117:122,119:[1,120]},{10:[1,124],27:[1,125]},{10:$Va,25:128,26:$Vb,27:$Vc,29:[2,179],36:$Vd,44:31,47:33,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34,116:$Vm,120:126,123:35,124:$Vn,132:36,136:37,138:32,139:127},o($VC,[2,101]),o($VA,$VB),o($VC,[2,102]),o($VC,[2,103]),o($VC,[2,104]),{29:[1,129],103:$Vr,104:$Vs},{16:$VR,30:130},{10:[1,132]},{18:[1,133]},{10:$VM,17:134,18:$VN,19:97,20:98,21:99,22:$VO,23:100,26:$V4},{18:[2,9]},{18:[2,14],22:[1,135]},{18:[2,15],22:[1,136]},o($VS,[2,13]),o($VT,[2,17],{24:[1,137]}),{10:$V2,39:138},o($Vt,[2,113],{108:$Vu,109:$Vv,110:$Vw,111:$Vx,112:$Vy,113:$Vz}),o($Vt,[2,114],{108:$Vu,109:$Vv,110:$Vw,111:$Vx,112:$Vy,113:$Vz}),o($VC,[2,106]),o($VC,[2,107]),o($VC,[2,108]),o($VC,[2,109]),o($VC,[2,110]),o($VC,[2,111]),o($Vp,[2,115]),o($Vp,[2,116]),o($Vp,[2,127]),{10:[1,144],25:142,26:$Vb,27:$Vc,36:[1,145],44:31,47:33,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34,116:$Vm,119:[1,139],123:35,124:$Vn,127:140,128:141,129:143,132:36,136:37,138:32},o($Vp,[2,142]),o($VQ,[2,191],{44:31,138:32,47:33,114:34,123:35,132:36,136:37,107:38,91:39,102:43,92:45,93:46,94:47,99:58,100:59,101:60,135:146,25:147,10:$Va,26:$Vb,27:$Vc,36:$Vd,95:$Ve,96:$Vf,97:$Vg,98:$Vh,103:$Vi,104:$Vj,105:$Vk,106:$Vl,116:$Vm,124:$Vn}),{29:[1,148]},{29:[2,194],32:$VK},o($VD,[2,122]),o([14,103,104,108,109,110,111,112,113],$VF,{27:$VG,116:$VH,119:[1,149],121:$VI}),{14:[1,150]},{14:[2,176],103:$Vr,104:$Vs},o($VD,[2,121]),{10:$Va,27:$Vc,29:[2,181],36:$Vd,91:89,92:45,93:46,94:152,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,122:151},{29:[1,153]},{29:[2,180],32:[1,154]},o($VL,[2,151]),o($VA,[2,96]),o([5,9,10,18,22,26,35],[2,18]),{10:$Va,18:$VU,22:$VV,27:$Vc,33:155,36:$Vd,40:156,41:157,43:158,44:173,45:174,46:168,47:184,49:159,50:$VW,54:160,55:$VX,59:161,61:162,62:$VY,70:166,71:$VZ,77:167,78:$V_,80:170,81:163,82:$V$,84:169,85:164,86:$V01,87:171,88:165,89:$V11,90:172,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34},o($VL,[2,20]),o($V6,[2,7]),{18:[2,8]},o($VS,[2,11]),o($VS,[2,12]),{10:$Va,25:185,26:$Vb,27:$Vc,36:$Vd,44:31,47:33,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34,116:$Vm,123:35,124:$Vn,132:36,136:37,138:32},o($VP,[2,133],{121:$V7}),o($Vp,[2,129]),{119:[1,186]},{119:[1,187]},{32:[1,188],119:[2,140]},{32:[1,189],119:[2,136]},o([24,27,32,103,104,108,109,110,111,112,113,115,116,119,121],$VE,{14:$V21}),o([27,32,103,104,108,109,110,111,112,113,116,119,121],$VJ,{14:$V31}),o($VQ,[2,144]),o($VQ,[2,192]),{16:$VR,30:192},o($VD,[2,123]),{10:$Va,27:$Vc,36:$Vd,47:194,91:89,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,118:193,119:[2,177]},{29:[1,195]},{27:$VG,29:[2,182],116:$VH,121:$VI},o($VA,[2,120]),{10:$Va,25:196,26:$Vb,27:$Vc,36:$Vd,44:31,47:33,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34,116:$Vm,123:35,124:$Vn,132:36,136:37,138:32},{18:[1,197]},{10:$Va,18:$VU,22:$VV,27:$Vc,33:198,36:$Vd,40:156,41:157,43:158,44:173,45:174,46:168,47:184,49:159,50:$VW,54:160,55:$VX,59:161,61:162,62:$VY,70:166,71:$VZ,77:167,78:$V_,80:170,81:163,82:$V$,84:169,85:164,86:$V01,87:171,88:165,89:$V11,90:172,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34},{18:[2,32]},o($V41,[2,72]),o($V41,[2,73]),o($V41,[2,74]),o($V41,[2,75]),o($V41,[2,76]),o($V41,[2,77]),o($V41,[2,78]),o($V41,[2,79]),o($V41,[2,80]),o($V41,[2,81]),{18:[2,82]},{18:[2,83]},{18:[2,84]},{18:[2,85]},{18:[2,86]},{18:$V51,22:$V61},{18:$V71,22:$V81},o($V41,[2,38]),{10:$Va,27:$Vc,36:$Vd,47:201,91:89,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38},{10:[1,205],16:$VR,22:[2,161],27:$Vc,30:204,36:$Vd,44:203,47:33,56:202,68:206,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34},{10:$Va,16:[2,167],27:$Vc,36:$Vd,47:208,63:207,91:89,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38},{10:$Va,18:[2,67],22:$V91,25:210,26:$Vb,27:$Vc,36:$Vd,44:31,47:33,83:209,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34,116:$Vm,123:35,124:$Vn,132:36,136:37,138:32},{18:[2,69],22:$Va1},{18:[2,71],22:$Vb1},{16:$VR,30:213},{10:$Va,18:[2,64],22:$Vc1,25:215,26:$Vb,27:$Vc,36:$Vd,44:31,47:33,79:214,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34,116:$Vm,123:35,124:$Vn,132:36,136:37,138:32},o($Vd1,$Vq,{48:[1,216],103:$Vr,104:$Vs}),o($VT,[2,16]),o($Vp,[2,130]),o($Vp,[2,131]),{10:$Va,25:142,26:$Vb,27:$Vc,36:$Vd,44:31,47:33,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34,116:$Vm,119:[2,187],123:35,124:$Vn,127:218,131:217,132:36,136:37,138:32},{10:[1,221],36:[1,222],119:[2,185],128:220,129:143,130:219},{10:$Va,25:223,26:$Vb,27:$Vc,36:$Vd,44:31,47:33,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34,116:$Vm,123:35,124:$Vn,132:36,136:37,138:32},{10:$Va,25:224,26:$Vb,27:$Vc,36:$Vd,44:31,47:33,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34,116:$Vm,123:35,124:$Vn,132:36,136:37,138:32},o($Vp,[2,145]),{119:[1,225]},{103:$Vr,104:$Vs,119:[2,178]},o($VA,[2,124]),o($VL,[2,152]),o([5,9,10,14,16,18,22,26,27,29,32,35,36,50,53,55,62,67,69,71,74,76,78,82,86,89,95,96,97,98,103,104,105,106,119],[2,21]),{18:[2,31]},o($V41,[2,36]),o($V41,[2,37]),{16:$VR,30:226,103:$Vr,104:$Vs},{22:[1,227]},o([22,32],$Ve1,{30:228,16:$VR}),o($V41,[2,47]),o([16,22,24,27,103,104,108,109,110,111,112,113,115,116,121],$VE,{32:[1,230],60:[1,229]}),{22:[2,162],32:$Vf1},{16:[1,233],64:232},{16:[2,168],103:$Vr,104:$Vs},{22:[1,234]},{18:[2,66],22:$Vg1},o($V41,[2,68]),o($V41,[2,70]),o($V41,[2,56],{72:235,73:236,74:[1,237],76:$Vh1}),{22:[1,239]},{18:[2,63],22:$Vi1},o($Vd1,[2,41]),{119:[2,141]},{119:[2,188]},{119:[2,137]},{119:[2,186]},{14:$V21},{14:$V31},o($VQ,[2,138]),o($VQ,[2,139]),o($VA,[2,119]),o($V41,[2,159],{51:240,52:241,53:[1,242]}),{10:$Va,22:[2,163],27:$Vc,36:$Vd,47:244,57:243,91:89,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38},o($V41,[2,46]),{10:$Va,25:245,26:$Vb,27:$Vc,36:$Vd,44:31,47:33,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34,116:$Vm,123:35,124:$Vn,132:36,136:37,138:32},{10:[1,246]},{10:$Va,27:$Vc,36:$Vd,44:247,47:33,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34},o($V41,[2,50]),{65:248,66:249,67:$Vj1,69:$Vk1},o($V41,[2,65]),o($V41,[2,57],{73:252,76:$Vh1}),o($V41,[2,58]),{10:[1,254],16:[2,169],75:253},{16:$VR,30:255},o($V41,[2,62]),o($V41,[2,42]),o($V41,[2,160]),{16:$VR,30:256,49:257,50:$VW},{22:[1,258]},{22:[2,164],103:$Vr,104:$Vs},{16:$VR,30:259},{60:[1,260]},o([14,22,32],[2,118]),{18:[1,261],66:262,67:$Vj1,69:$Vk1},o($Vl1,[2,52]),{10:$Va,27:$Vc,36:$Vd,44:264,47:33,68:263,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34},{14:[1,265]},o($V41,[2,59]),{16:$VR,30:266},{16:[2,170]},o($V41,[2,61]),o($V41,[2,43]),o($V41,[2,44]),{10:$Va,16:[2,165],27:$Vc,36:$Vd,44:269,45:270,46:268,47:184,58:267,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34},o($V41,[2,48]),{10:$Va,25:271,26:$Vb,27:$Vc,36:$Vd,44:31,47:33,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34,116:$Vm,123:35,124:$Vn,132:36,136:37,138:32},o($V41,[2,51]),o($Vl1,[2,53]),{14:[1,272],32:$Vf1},o([14,32],$Ve1),{10:$Va,22:$VV,27:$Vc,36:$Vd,40:274,42:273,43:158,44:275,45:276,47:184,49:159,50:$VW,54:160,55:$VX,59:161,61:162,62:$VY,70:166,71:$VZ,77:167,78:$Vm1,81:163,82:$Vn1,85:164,86:$Vo1,88:165,89:$Vp1,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34},o([10,18,22,27,36,50,55,62,67,69,71,76,78,82,86,89,95,96,97,98,103,104,105,106],[2,60]),{16:$VR,30:281},{16:[2,166]},{16:$V51},{16:$V71},{16:$VR,30:282},{10:$Va,22:$VV,27:$Vc,36:$Vd,40:274,42:283,43:158,44:275,45:276,47:184,49:159,50:$VW,54:160,55:$VX,59:161,61:162,62:$VY,70:166,71:$VZ,77:167,78:$Vm1,81:163,82:$Vn1,85:164,86:$Vo1,88:165,89:$Vp1,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34},o($Vl1,[2,55],{114:34,107:38,91:39,102:43,92:45,93:46,94:47,99:58,100:59,101:60,43:158,49:159,54:160,59:161,61:162,81:163,85:164,88:165,70:166,77:167,47:184,44:275,45:276,40:284,10:$Va,22:$VV,27:$Vc,36:$Vd,50:$VW,55:$VX,62:$VY,71:$VZ,78:$Vm1,82:$Vn1,86:$Vo1,89:$Vp1,95:$Ve,96:$Vf,97:$Vg,98:$Vh,103:$Vi,104:$Vj,105:$Vk,106:$Vl}),o($V41,[2,34]),{22:$V61},{22:$V81},{10:$Va,22:$V91,25:285,26:$Vb,27:$Vc,36:$Vd,44:31,47:33,83:209,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34,116:$Vm,123:35,124:$Vn,132:36,136:37,138:32},{22:$Va1},{22:$Vb1},{10:$Va,22:$Vc1,25:286,26:$Vb,27:$Vc,36:$Vd,44:31,47:33,79:214,91:39,92:45,93:46,94:47,95:$Ve,96:$Vf,97:$Vg,98:$Vh,99:58,100:59,101:60,102:43,103:$Vi,104:$Vj,105:$Vk,106:$Vl,107:38,114:34,116:$Vm,123:35,124:$Vn,132:36,136:37,138:32},o($V41,[2,45]),o($V41,[2,49]),o($Vl1,[2,54],{114:34,107:38,91:39,102:43,92:45,93:46,94:47,99:58,100:59,101:60,43:158,49:159,54:160,59:161,61:162,81:163,85:164,88:165,70:166,77:167,47:184,44:275,45:276,40:284,10:$Va,22:$VV,27:$Vc,36:$Vd,50:$VW,55:$VX,62:$VY,71:$VZ,78:$Vm1,82:$Vn1,86:$Vo1,89:$Vp1,95:$Ve,96:$Vf,97:$Vg,98:$Vh,103:$Vi,104:$Vj,105:$Vk,106:$Vl}),o($V41,[2,35]),{22:$Vg1},{22:$Vi1}],
defaultActions: {4:[2,3],15:[2,1],16:[2,2],26:[2,154],98:[2,9],134:[2,8],157:[2,32],168:[2,82],169:[2,83],170:[2,84],171:[2,85],172:[2,86],198:[2,31],217:[2,141],218:[2,188],219:[2,137],220:[2,186],254:[2,170],268:[2,166],269:[2,39],270:[2,40],285:[2,174],286:[2,172]},
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

// parser customization

var
dperformAction = parser.performAction;

parser.performAction = function performAction() {
    var
    yy = arguments[3];

    yy.env.yylloc   = yy.lexer.yylloc;
    yy.env.yylineno = yy.lexer.yylineno;

    return dperformAction.apply(this, arguments);
}
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
var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:/* skip whitespace */
break;
case 1:/* single line comment */
break;
case 2:/* multiline comment */
break;
case 3:return 36
break;
case 4:return 'EOL'
break;
case 5:return 35
break;
case 6: this.yy.env.newContext(); return 9 
break;
case 7: this.yy.env.newContext(); return 26 
break;
case 8:return 95
break;
case 9:return 98
break;
case 10:return 82
break;
case 11:return 50
break;
case 12:return 53
break;
case 13:return 55
break;
case 14:return 60
break;
case 15:return 62
break;
case 16:return 67
break;
case 17:return 69
break;
case 18:return 89
break;
case 19:return 86
break;
case 20:return 96
break;
case 21:return 71
break;
case 22:return 74
break;
case 23:return 76
break;
case 24:return 78
break;
case 25:return 97
break;
case 26:return 10
break;
case 27:return 16
break;
case 28:return 18
break;
case 29:return 27
break;
case 30:return 29
break;
case 31:return 116
break;
case 32:return 119
break;
case 33:return 115
break;
case 34:return 111
break;
case 35:return 112
break;
case 36:return 113
break;
case 37:return 48
break;
case 38:return 24
break;
case 39:return 124
break;
case 40:return 14
break;
case 41:return 32
break;
case 42:return 121
break;
case 43:return 22
break;
case 44:return 105
break;
case 45:return 106
break;
case 46:return 103
break;
case 47:return 104
break;
case 48:return 108
break;
case 49:return 109
break;
case 50:return 110
break;
case 51: yy.parseError('character ' + yy_.yytext + ' with code: ' + yy_.yytext.charCodeAt(0), {loc: yy_.yylloc}); 
break;
case 52:return 5
break;
}
},
rules: [/^(?:[ \f\t\u00A0\u2028\u2029\uFEFF]+)/,/^(?:\/\/.*)/,/^(?:---([\s\S]*?)---)/,/^(?:'([^\\']|\\[\s\S])*')/,/^(?:(\r\n|\n))/,/^(?:use\b)/,/^(?:class\b)/,/^(?:func\b)/,/^(?:me\b)/,/^(?:nil\b)/,/^(?:return\b)/,/^(?:if\b)/,/^(?:else\b)/,/^(?:for\b)/,/^(?:in\b)/,/^(?:switch\b)/,/^(?:case\b)/,/^(?:default\b)/,/^(?:continue\b)/,/^(?:break\b)/,/^(?:true\b|false\b)/,/^(?:try\b)/,/^(?:catch\b)/,/^(?:finally\b)/,/^(?:throw\b)/,/^(?:0x[\da-fA-F]+|^\d*\.?\d+(?:[eE][+-]?\d+)?\b)/,/^(?:[\$\w\x7f-\uffff]+)/,/^(?:\{)/,/^(?:\})/,/^(?:\()/,/^(?:\))/,/^(?:\[)/,/^(?:\])/,/^(?:\*=|\/=|%=|\+=|-=|<<=|>>=|>>>=|&=|\^=|\|=)/,/^(?:<<|>>|>>>)/,/^(?:<=|>=|==|!=|<|>)/,/^(?:&&|\|\||&|\^|\|)/,/^(?:\+\+|--)/,/^(?:=)/,/^(?:@)/,/^(?::)/,/^(?:,)/,/^(?:\.)/,/^(?:;)/,/^(?:!)/,/^(?:~)/,/^(?:\+)/,/^(?:-)/,/^(?:\*)/,/^(?:\/)/,/^(?:%)/,/^(?:.)/,/^(?:$)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52],"inclusive":true}}
});
// lexer customization
var
terminals     = parser.terminals_,
yy            = parser.yy,
SEMICOLON     = parseInt(findTerminal(';')),
reactiveTerms = {
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
    'CASE'    : true,
    'DEFAULT' : true,
    'CONTINUE': true,
    'BREAK'   : true,
    'TRY'     : true,
    'CATCH'   : true,
    'FINALLY' : true,
    'THROW'   : true,

    '@'       : true,
    ']'       : true,
    '}'       : true,
    ')'       : true
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
    }
});

yy.Environment = Class({

    contexts: null,

    errors: null,

    exported: null,

    classNodes: null,

    currentCompilingClass: null,

    currentCompilingMethod: null,

    varSeed: 0,

    filename: '',

    init: function(filename) {
        this.filename   = filename;
        this.contexts   = [];
        this.errors     = [];
        this.exported   = {};
        this.classNodes = [];

        // initialize the first context (module)
        this.newContext();
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
        if (isNaN(n)) {
            n = this.contexts.length - 1;
        }
        else if (n <= 0) {
            n = this.contexts.length + (n - 1);
        }
        return this.contexts[n];
    },

    generateVar: function(str) {
        return '__' + (str || 'var') + (this.varSeed++);
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
    'debugger', 'function', 'this', 'with',
    'default', 'if', 'throw',
    'delete', 'in', 'try',

    // Ecma-262 FutureReservedWord
    'class', 'enum', 'extends', 'super',
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

yy.parseError = function parseError (msg, hash) {
    var filename = yy.env.filename;
    //is non recoverable parser error?
    if (hash && hasProp.call(hash, 'loc') && hash.expected) {
        switch (hash.text) {
            case '\n': hash.text = 'NEW_LINE';       break;
            case ''  : hash.text = 'END_OF_PROGRAM'; break;
        }
        msg = "unexpected " + hash.text;
    }
    else {
        msg = "unexpected " + msg;
    }

    msg += " at " + filename + ':' + hash.loc.first_line;

    throw msg;
};

yy.generateRoute = function(route) {
    var
    parsed,
    rFileNameExt   = /([\s\S]+)*(^|\/)([\w\-]+)*(\.[\w\-]+)*$/,
    rCapitalLetter = /^[A-Z]/,
    rLocalModule   = /^\.([\w-]+)$/;

    // is a local module '.local_module'?
    parsed = rLocalModule.exec(route);
    if (parsed) {
        return './' + parsed[1];
    }

    // is a valid route?
    parsed = rFileNameExt.exec(route);
    if (parsed) {
        // if has no file extension and has no capital letter then is a package
        if (! parsed[4] && ! rCapitalLetter.test(parsed[3])) {
            return (parsed[1] || '') + parsed[2] + parsed[3] + '/' + parsed[3];
        }
    }

    return route.replace(/\\/g, '/').replace(/\/+/g, '/');
};

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

yy.Node = Class({

    type: 'Node',

    runtimePrefix: 'CRL.',

    scope: null,

    types: null,

    init: function init(children) {
        this.children = [];
        this.lineno   = yy.env.yylloc.first_line;
        this.loc      = Object.create(yy.env.yylloc);

        this.yy       = yy;

        // setup parent node for later referencing
        this.adopt(slice.call(arguments));

        this.initNode();
    },

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
        //
        //console.log('ahhh')
    },

    runtimeFn: function(name) {
        return this.runtimePrefix + name + '(';
    },

    error: function(txt, lineno) {
        throw 'Error: ' + txt + ' at ' + yy.env.filename + ':' + lineno;
    },

    compile: function() {
        // virtual
    }
});

yy.Mock = Class(yy.Node, {

    type: 'Mock',

    initNode: function() {
        this; arguments;
    }

});

yy.List = Class(yy.Node, {

    type: 'List',

    children: null,

    init: function() {
        this.children = [];
        this.adopt(slice.call(arguments));
    },

    add: function() {
        this.children = this.children.concat(slice.call(arguments));
    },

    addFront: function() {
        this.children = slice.call(arguments).concat(this.children);
    }

});


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

yy.ModuleNode = Class(yy.ContextAwareNode, {

    type: 'ModuleNode',

    initializerName: 'init',

    compile: function() {
        //console.log('compile module');
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
        exported = this.yy.env.getExported();

        for (name in exported) {
            if (name !== this.initializerName) {
                ret += 'exports.' + name + ' = ' + exported[name] + '; ';
            }
        }
        return ret;
    }
});

yy.Lit = yy.LiteralNode = Class(yy.Node, {

    type: 'Lit, LiteralNode',

    init: function(ch, yloc) {
        //console.log(ch);
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

yy.SelectorExprNode = Class(yy.Node, {
    type: 'SelectorExprNode'
});

yy.UnaryExprNode = Class(yy.Node, {
    type: 'UnaryExprNode'
});

yy.AssociationNode = Class(yy.Node, {
    type: 'AssociationNode'
});

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

        this.from = this.children[2];
        this.to   = this.children[4];
    },
    
    compile: function() {
        var
        num, lit,
        openParen  = '(',
        closeParen = ')',
        from       = this.from,
        to         = this.to,
        ch         = this.children;

        if (from === undefined) {
            from = new yy.Lit('0', ch[1].lineno);
        }

        this.children = [
            ch[0],
            new yy.Lit('.slice(', ch[1].lineno),
            from
        ];

        if (to !== undefined) {
            if (to instanceof yy.UnaryExprNode && typeof to.children[1].children === 'string') {
                lit     = new yy.Lit(stringifyNode(to), to.lineno);
                lit.loc = to.children[1].loc;
                to      = lit;
            }

            if (to instanceof yy.Lit) {
                to.children =  this.transformLiteral(to.children);
                this.children.push(
                    new yy.Lit(', ', ch[3].lineno),
                    to
                );
            }
            else {
                if (to instanceof yy.AssociationNode) {
                    openParen  = '';
                    closeParen = '';
                }
                this.children.push(
                    new yy.Lit(', +' + openParen, ch[3].lineno),
                    to, 
                    new yy.Lit(closeParen + ' + 1 || 9e9', to.lineno)
                );
            }
        }

        this.children.push(new yy.Lit(')', ch[5].lineno));
    },    

    transformLiteral: function(l) {
        var num = parseInt(l);
        if (! isNaN(num)) {
            return String(+(num)+1);
        }
        else {
            return l;
        }
    }

});

yy.ObjectConstructorNode = Class(yy.Node, {

    type: 'ObjectConstructorNode',

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
            if (constrArgs.keyed) {
                if (className) {
                    ch.splice(2, 0, new yy.Lit('(new ' + this.runtimePrefix + 'Conf(', ch[2].children[0].lineno));
                    ch.push(3, 0,   new yy.Lit('))', ch[3].children[2].lineno));
                }
                else {
                    prefix = '';
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

        if (ch[3]) { // keyed
            this.keyed = true;
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
        if (this.keyed) {
            this.children[0].children = '{';
            this.children[2].children = '}';
        }
        else {
            this.children[0].children = '(';
            this.children[2].children = ')';
        }
    }
});

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
        lineno   = this.lineno,
        splitted = this.children.split(/\r\n|\n/),
        len      = splitted.length;

        for (i = 0; i < len; i++) {
            str = splitted[i].replace(/^\s+/, '');
            if (i < len - 1) {
                str += '\\';
            }
            splitted[i] = new yy.Lit(str, lineno + i);
        }

        this.children = splitted;
    }
});

yy.UseNode = Class(yy.Node, {

    type: 'UseNode',

    rAlias: /([\w\-]+)*(?:\.[\w\-]+)*$/,

    rCapitalLetter: /^[A-Z]/,

    rClearName: /[^\w]/,

    initNode: function() {
        this.base('initNode', arguments);

        var parsed;

        this.aliasNode  = this.children[2];
        this.targetNode = this.children[1];
        this.route      = this.yy.generateRoute(this.targetNode.children.substring(1, this.targetNode.children.length - 1)); // trim quotes
        this.alias      = this.aliasNode ? this.aliasNode.children : false;

        if (!this.alias) {
            parsed = this.rAlias.exec(this.route);
            this.alias = (parsed[1] || '').replace(this.rClearName, '_');
        }

        this.yy.env.context().addLocalVar(this.alias);
    },

    compile: function() {
        var
        ch     = this.children,
        route  = this.route,
        alias  = this.alias,
        suffix = '';

        if (this.rCapitalLetter.test(alias)) {
            suffix = '.' + alias;
        }

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
            new yy.Lit(')' + suffix + ';', ch[1].lineno)
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

    superClassNames: null,

    initializerNode: null,

    initializerName: 'init',

    initNode: function() {
        this.base('initNode', arguments);
        var
        ch    = this.children,
        cname = ch[1].children;

        this.className       = cname;
        this.superClassNames = this.getSuperClassNames();
        this.block           = ch[3];
        this.propertiesNames = [];

        this.propertySet = new yy.PropertySetNode();
        this.propertySet.parent = this;
        
        this.methodSet = new yy.MethodSetNode();
        this.methodSet.parent = this;

        this.setupSets(this.block);

        this.yy.env.registerClass(this);

        this.yy.env.context().addLocalVar(this.className);
    },

    getSuperClassNames: function() {
        if (! this.children[2]) {
            return [];
        }
        var
        str,
        node = this.children[2].children[1];

        str = stringifyNode(node);

        return str.split(',');
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
        var i, len,
        combineStr = '',
        ch        = this.children;

        if (this.superClassNames.length > 0) {
             combineStr = ', [' + this.superClassNames.join(', ') + ']';
        }

        this.children = [
            new yy.Lit(this.className + ' = function ' + this.className, ch[0].lineno),
            this.methodSet,
            new yy.Lit(this.runtimeFn('defClass') + this.className + combineStr +')', ch[3].lineno)
        ];
    },

    compileWithNoInit: function() {
        var i, len,
        ch = this.children,
        superInitStr   = '',
        combineStr     = '',
        applyConfStr   = this.runtimeFn('applyConf') + 'this, arguments[0]);',
        prepareInitStr = 'var $isConf=arguments[0] instanceof CRL.Conf;this.$mutex=this.$mutex?this.$mutex+1:1;',
        runInitStr     = 'if(this.$mutex===1){' + applyConfStr + 'delete this.$mutex;}else{this.$mutex--}',
        argsStr        = '';

        if (this.superClassNames.length > 0) {
             combineStr = ', [' + this.superClassNames.join(', ') + ']';
        }

        argsStr = this.propertiesNames.join(', ');
    
        for (i = 0, len = this.superClassNames.length; i < len; i++) {
            superInitStr += this.superClassNames[i] + '.call(this);';
        }        

        this.children = [
            new yy.Lit(this.className + ' = function ' + this.className, ch[0].lineno),
            new yy.Lit('('+ argsStr +'){' + prepareInitStr + superInitStr , ch[1].lineno),
            this.propertySet,
            new yy.Lit(runInitStr + '};', this.propertySet.lineno),
            this.methodSet,
            new yy.Lit(this.runtimeFn('defClass') + this.className +  combineStr + ')', ch[3].lineno)
        ];
    
    },

    compile: function() {
        this.base('compile', arguments);
        if (this.initializerNode) {
            this.compileWithInit();
        }
        else {
            this.compileWithNoInit();
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
        
        if (this.hasDefaultValue) {
            str = '=(' + this.name + '===undefined||' + this.name + '===null||$isConf)?';
            ch.splice(3, 0, new yy.Lit(':' + this.name, ch[2].lineno));
        }
        else {
            str = '=' + this.name + ';';
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
        this.isInitializer = true;
        this.children[0].children.splice(0, 2);
        this.children[0].block.children[0].children = '';
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

    initNode: function() {
        this.base('initNode', arguments);
        this.context = this.yy.env.context();
    },

    compile: function() {
        var
        ch = this.children, last, builtin;

        if (ch[0] instanceof yy.VarNode) {
            builtin = this[ch[0].name + 'Builtin'];
            if (builtin) {
                builtin.call(this);
            }
        }

        this.base('compile', arguments);
    },

    superBuiltin: function() {
        var
        len, lineno,
        methodName,
        ch = this.children,
        ls = ch[2],
        stub = '',
        ctx = this.yy.env.context();

        if (ctx.ownerNode.parent instanceof yy.MethodNode) {
            methodName = ctx.ownerNode.parent.name;
        }
        else {
            this.error("can not call 'super' builtin function outside of method scope", ch[3].lineno);
        }

        ch[0].children[0].children = '';
        ch[1].children = '';

        if (ls) {
            len = ls.children.length;

            if (ctx.ownerNode.parent.isInitializer) {
                stub = '';
            }
            else {
                stub = '.prototype.' + methodName;
            }

            if (len === 1) {
                stub   += '.apply(me, arguments';
                lineno = ls.children[0].lineno;
            }
            else if (len > 1) {
                stub   += '.call(me, ';
                lineno = ls.children[len - 1].lineno;
            }

            ls.children.splice(1, 1, new yy.Lit(stub, lineno));
        }

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
            ls = ch[3].children[0].children;
            ls.push(new yy.Lit(' break; ', ls[ls.length - 1].lineno));
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
        var ch = this.children;

        if (ch.length <= 3) {
            ch[0].children = 'while ';
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
        ch = this.children,
        k, v, str1, str2, str3,
        $i, $len, $coll, $keys;

        if (ch.length === 5) {
            /*
            for v in coll { }
            for (var $coll = coll, $keys = CRL_keys($coll), $i = 0, $len = $keys.length, v; $i < $len; $i++) {v = $coll[$keys[$i]];}
            */
            v     = ch[1].children[0].children;
            $i    = yy.env.generateVar('i');
            $len  = yy.env.generateVar('len');
            $coll = yy.env.generateVar('coll');
            $keys = yy.env.generateVar('keys');

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
            $i    = yy.env.generateVar('i');
            $len  = yy.env.generateVar('len');
            $coll = yy.env.generateVar('coll');
            $keys = yy.env.generateVar('keys');

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

yy.TryNode = Class(yy.Node, {

    type: 'TryNode',

    compile: function() {
        var
        ch = this.children;

        if (!ch[2]) {
            this.children.push(new yy.Lit('catch($error){}', this.lineno));
        }
    }

});

yy.CatchNode = Class(yy.Node, {

    type: 'CatchNode',

    compile: function() {
        var
        ch = this.children;

        if (ch[1]) {
            ch[1].children = '(' + ch[1].children + ') ';
        }
    }

});


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
        this.visitNode(ast);
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

/*
## cor.Loader

This class is responsible to load the modules required anywhere
in the source code. Also manage dependencies

*/
var Loader = Class({
    // the path of the .json file containig the environment variables
    envPath                : null,
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

    // add paths to be ignred by the loader
    // path parametter is an array
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

        for (i = 0,  len = required.length; i < len; i++) {
            requiredPath = required[i];

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
        console.error('Unable to read file ', srcPath, ' requested from ', from);
    },

    onLoaderReady: function() {
        var module = this.moduleCache[this.entryModulePath];
        if (module) {
            return module.getExports();
        }
        else {
            this.error('Entry module not found');
        }
    },

    setPath: function(srcPaths, envPath) {
        var name;
        for (name in srcPaths) {
            this.pathMap[name] = path.resolve(envPath, srcPaths[name]);
        }
    },

    requireModule: function(srcPath, from) {
        if ((! this.ignoredPaths[srcPath]) && (! this.moduleCache[srcPath])) {
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

    setEntry: function(entryPath, envPath) {
        var
        parsed,
        me  = this,
        cwd = path.cwd();

        if (entryPath) {
            if (path.ext(envPath) === '.json') {
                me.readFile(envPath, cwd, function onEnvReady(envPath, from, txt) {
                    var
                    env = parseJson(txt);
                    me.envPath = path.resolve(cwd, envPath);
                    if (env) {
                        if (env.ignore) {
                            me.ignorePath(env.ignore);
                        }
                        if (env.paths) {
                            me.setPath(env.paths, me.envPath);
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


    init: function(path, src, deps, loader) {
        this.src         = src;
        this.filename    = path;
        this.dependences = deps;
        this.loader      = loader;
    },

    getExports: function() {
        var path, PROG, env, js, src;

        if (this.environment === null) {

            js = this.toJs();
            if (typeof js === 'string') {
                js = {src: js};
            }
            src = 'var PROG=function(require,module,exports){var PROG;\n' +
                  (js.prefix  || '') +
                  (js.src     || '') + '}' +
                  (js.suffix  || '');
            eval(src);
            if (typeof PROG === 'function') {
                this.environment = this.newModule();
                PROG(this.environment.require, this.environment, this.environment.exports);
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
                else {
                    throw me.loader.error("Can not find module '" + srcPath + "'", me.filename);
                }
            }
        };

        return newMod;
    },

    toJs: function() {
        var
        ext    = path.ext(this.filename),
        plugin = this.loader.plugins[ext];

        if (plugin) {
            return plugin.toJs(this.src, this.filename);
        }
        else {
            throw this.error('Can not translate to javascript files \'.' + ext + "'", this.filename);
        }
    }
});

// public to cor namespace
cor.Loader  = Loader;
cor.Program = Program;
cor.path    = path;

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
    entry, env, sentry,
    scripts = document.getElementsByTagName('script'),
    len     = scripts.length,
    i       = -1;

    while (++i < len) {
        entry = entry || scripts[i].getAttribute('data-entry');
        env   = env   || scripts[i].getAttribute('data-env');
    }

    if (entry && path.ext(entry) === '') {
        sentry = entry.split(path.pathSep);
        sentry.push(path.pathSep + sentry[sentry.length - 1] + '.cor');
        entry  = path.sanitize(sentry.join(path.pathSep));
    }

    loader.setEntry(entry, env);

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
loader = cor.loader;
path   = cor.path;

//Custom plugin for .js files
loader.addPlugin({

    ext       : '.js',
    rComments : /\/\/([\s\S]*?)\n|\/\*([\s\S]*?)\*\//g,
    rRequire  : /(?:^|\s)require\s*\(\s*['"]([\w-\.\/]*?)['"]/g,
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
            suffix: suffix
        };
    }

});

})(typeof cor === 'undefined' ? {} : cor);
