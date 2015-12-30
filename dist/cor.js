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

CRL.extend = function(Cls, baseCls) {
    CRL.copyObj(baseCls, Cls, true);

    function Proto() {
        this.constructor = Cls;
    }

    Proto.prototype = baseCls.prototype;
    Cls.prototype   = new Proto();
}


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
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[2,4],$V1=[1,11],$V2=[1,14],$V3=[1,9],$V4=[1,10],$V5=[1,12],$V6=[5,9,10,22,26,35],$V7=[1,23],$V8=[5,14,16,18,22,24,29,32,118,121,123],$V9=[5,22],$Va=[1,46],$Vb=[1,44],$Vc=[1,59],$Vd=[1,55],$Ve=[1,54],$Vf=[1,56],$Vg=[1,57],$Vh=[1,58],$Vi=[1,50],$Vj=[1,51],$Vk=[1,52],$Vl=[1,53],$Vm=[1,42],$Vn=[1,43],$Vo=[1,41],$Vp=[1,66],$Vq=[5,14,16,18,22,29,32,121],$Vr=[2,127],$Vs=[1,70],$Vt=[1,71],$Vu=[1,72],$Vv=[5,14,16,18,22,29,32,47,102,103,117,121],$Vw=[1,73],$Vx=[1,74],$Vy=[1,75],$Vz=[1,76],$VA=[1,77],$VB=[1,78],$VC=[1,79],$VD=[5,14,16,18,22,27,29,32,47,102,103,107,108,109,110,111,112,113,117,118,121,123],$VE=[2,90],$VF=[5,14,16,18,22,29,32,47,102,103,107,108,109,110,111,112,113,117,121],$VG=[5,14,16,18,22,24,27,29,32,47,102,103,107,108,109,110,111,112,113,115,117,118,121,123],$VH=[2,87],$VI=[2,100],$VJ=[1,92],$VK=[1,90],$VL=[1,91],$VM=[2,92],$VN=[1,100],$VO=[29,32],$VP=[1,107],$VQ=[2,10],$VR=[1,106],$VS=[1,121],$VT=[32,121],$VU=[1,138],$VV=[10,18,22,26],$VW=[18,22],$VX=[2,33],$VY=[1,181],$VZ=[1,182],$V_=[1,183],$V$=[1,184],$V01=[1,188],$V11=[1,189],$V21=[1,185],$V31=[1,186],$V41=[1,187],$V51=[1,196],$V61=[1,197],$V71=[10,18,22,27,36,49,54,61,66,68,70,77,81,85,88,94,95,96,97,102,103,104,105],$V81=[2,39],$V91=[1,208],$Va1=[2,40],$Vb1=[1,209],$Vc1=[2,176],$Vd1=[1,220],$Ve1=[1,221],$Vf1=[2,174],$Vg1=[16,18,22],$Vh1=[2,119],$Vi1=[1,240],$Vj1=[2,177],$Vk1=[1,247],$Vl1=[2,175],$Vm1=[1,259],$Vn1=[1,260],$Vo1=[18,66,68],$Vp1=[1,289],$Vq1=[1,286],$Vr1=[1,287],$Vs1=[1,288];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"Module":3,"Source":4,"EOF":5,"GlobalStmt":6,"GlobalStmtNoSemicolon":7,"ClassStmt":8,"CLASS":9,"IDENT":10,"ClassStmt_option0":11,"ClassBlock":12,"ExtendsStmt":13,":":14,"QualifiedIdent":15,"{":16,"MemberList":17,"}":18,"Member":19,"MemberNotSemicolon":20,"PropertyDecl":21,";":22,"FunctionStmt":23,"=":24,"Value":25,"FUNC":26,"(":27,"FunctionStmt_option0":28,")":29,"Block":30,"FunctionArgs":31,",":32,"StmtList":33,"UseStmt":34,"USE":35,"STRING":36,"UseStmt_option0":37,"GlobalDeclarationStmt":38,"Stmt":39,"StmtNotSemicolon":40,"StrictStmtList":41,"SimpleStmt":42,"Expr":43,"IncDecStmt":44,"SimpleStmtNotSemicolon":45,"OperationExpr":46,"INCDECOP":47,"IfStmt":48,"IF":49,"IfStmt_option0":50,"ElseStmt":51,"ELSE":52,"ForStmt":53,"FOR":54,"ForStmt_option0":55,"ForStmt_option1":56,"ForStmt_option2":57,"ForInStmt":58,"IN":59,"SwitchStmt":60,"SWITCH":61,"SwitchStmt_option0":62,"CaseBlock":63,"CaseStmtList":64,"CaseStmt":65,"CASE":66,"ExprList":67,"DEFAULT":68,"TryCatchFinallyStmt":69,"TRY":70,"CatchStmt":71,"FinallyStmt":72,"CATCH":73,"CatchStmt_option0":74,"FINALLY":75,"ThrowStmt":76,"THROW":77,"ThrowStmt_option0":78,"ThrowStmtNotSemicolon":79,"ReturnStmt":80,"RETURN":81,"ReturnStmt_option0":82,"ReturnStmtNotSemicolon":83,"BreakStmt":84,"BREAK":85,"BreakStmtNotSemicolon":86,"ContinueStmt":87,"CONTINUE":88,"ContinueStmtNotSemicolon":89,"LeftHandExpr":90,"IndexExpr":91,"SelectorExpr":92,"PrimaryExpr":93,"ME":94,"BOOLEAN":95,"NUMBER":96,"NIL":97,"SliceExpr":98,"CallExpr":99,"TypeAssertExpr":100,"UnaryExpr":101,"+":102,"-":103,"!":104,"~":105,"OperationExprNotAdditive":106,"*":107,"/":108,"%":109,"SHIFTOP":110,"COMPARISONOP":111,"BINARYOP":112,"&":113,"AssignmentExpr":114,"ASSIGNMENTOP":115,"CoalesceExpr":116,"COALESCEOP":117,"[":118,"SliceExpr_option0":119,"SliceExpr_option1":120,"]":121,"CallExpr_option0":122,".":123,"TypeAssertExpr_option0":124,"ObjectConstructor":125,"@":126,"ObjectConstructor_option0":127,"ObjectConstructorArgs":128,"ObjectConstructor_option1":129,"SimpleElementList":130,"KeyValueElementList":131,"KeyedElement":132,"KeyValueElementList_option0":133,"SimpleElementList_option0":134,"ArrayConstructor":135,"ArrayConstructor_option0":136,"ArrayItems":137,"ArrayItems_option0":138,"LambdaConstructor":139,"LambdaConstructor_option0":140,"LambdaConstructor_group0":141,"Constructor":142,"ValueList":143,"ValueList_option0":144,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",9:"CLASS",10:"IDENT",14:":",16:"{",18:"}",22:";",24:"=",26:"FUNC",27:"(",29:")",32:",",35:"USE",36:"STRING",47:"INCDECOP",49:"IF",52:"ELSE",54:"FOR",59:"IN",61:"SWITCH",66:"CASE",68:"DEFAULT",70:"TRY",73:"CATCH",75:"FINALLY",77:"THROW",81:"RETURN",85:"BREAK",88:"CONTINUE",94:"ME",95:"BOOLEAN",96:"NUMBER",97:"NIL",102:"+",103:"-",104:"!",105:"~",107:"*",108:"/",109:"%",110:"SHIFTOP",111:"COMPARISONOP",112:"BINARYOP",113:"&",115:"ASSIGNMENTOP",117:"COALESCEOP",118:"[",121:"]",123:".",126:"@"},
productions_: [0,[3,2],[4,2],[4,1],[4,0],[8,4],[13,2],[12,3],[17,2],[17,1],[17,0],[19,2],[19,2],[19,1],[20,1],[20,1],[21,3],[21,1],[23,6],[31,1],[31,3],[30,3],[34,3],[38,3],[6,1],[6,1],[6,2],[6,2],[6,1],[7,1],[7,1],[33,2],[33,1],[33,0],[41,1],[41,2],[42,2],[42,2],[42,1],[45,1],[45,1],[44,2],[48,4],[51,2],[51,2],[53,7],[53,3],[53,2],[58,5],[58,7],[60,3],[63,3],[64,1],[64,2],[65,4],[65,3],[69,2],[69,3],[69,3],[69,4],[71,3],[72,2],[76,3],[79,2],[79,1],[80,3],[83,2],[83,1],[84,2],[86,1],[87,2],[89,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[40,1],[40,1],[40,1],[40,1],[40,1],[90,1],[90,1],[90,1],[93,1],[93,1],[93,1],[93,1],[93,1],[93,1],[93,3],[93,1],[93,1],[93,1],[101,1],[101,2],[101,2],[101,2],[101,2],[106,1],[106,3],[106,3],[106,3],[106,3],[106,3],[106,3],[106,3],[46,1],[46,3],[46,3],[114,3],[114,3],[116,3],[67,1],[67,3],[98,6],[99,4],[92,3],[91,3],[91,4],[100,5],[43,1],[43,1],[43,1],[125,3],[125,2],[125,3],[125,2],[128,2],[128,3],[128,3],[15,1],[15,3],[131,1],[131,3],[132,3],[132,3],[130,1],[130,3],[135,3],[137,1],[137,3],[139,5],[142,1],[142,1],[142,1],[25,1],[25,1],[143,1],[143,3],[11,0],[11,1],[28,0],[28,1],[37,0],[37,1],[50,0],[50,1],[55,0],[55,1],[56,0],[56,1],[57,0],[57,1],[62,0],[62,1],[74,0],[74,1],[78,0],[78,1],[82,0],[82,1],[119,0],[119,1],[120,0],[120,1],[122,0],[122,1],[124,0],[124,1],[127,0],[127,1],[129,0],[129,1],[133,0],[133,1],[134,0],[134,1],[136,0],[136,1],[138,0],[138,1],[140,0],[140,1],[141,1],[141,1],[144,0],[144,1]],
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
case 7: case 51: case 145:
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
case 9: case 34: case 119: case 139: case 143: case 146:
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
case 19: case 137:
 this.$= new yy.List(new yy.Lit($$[$0], _$[$0])) 
break;
case 20: case 138:
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
case 23: case 116: case 117:
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
case 106: case 107: case 108: case 109: case 110: case 111: case 112: case 114: case 115:
 this.$= new yy.Node($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 118:
 this.$= new yy.CoalesceNode($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 120: case 155:
 $$[$0-2].add(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 121:

            this.$= new yy.SliceNode(
                $$[$0-5],
                new yy.Lit($$[$0-4], _$[$0-4]),
                $$[$0-3],
                new yy.Lit($$[$0-2], _$[$0-2]),
                $$[$0-1],
                new yy.Lit($$[$0], _$[$0])
            )
        
break;
case 122:
 this.$= new yy.CallNode($$[$0-3], new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 123: case 124:
 this.$= new yy.Node($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), new yy.Lit($$[$0], _$[$0])) 
break;
case 125:
 this.$= new yy.Node($$[$0-3], new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 126:

            this.$= new yy.TypeAssertNode(
                $$[$0-4],
                new yy.Lit($$[$0-3], _$[$0-3]),
                new yy.Lit($$[$0-2], _$[$0-2]),
                $$[$0-1],
                new yy.Lit($$[$0], _$[$0])
            )
        
break;
case 130: case 132:
 this.$= new yy.ObjectConstructorNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], $$[$0]) 
break;
case 131: case 133:
 this.$= new yy.ObjectConstructorNode(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 134:
 this.$= new yy.ObjectConstructorArgsNode(new yy.Lit($$[$0-1], _$[$0-1]), null, new yy.Lit($$[$0], _$[$0])) 
break;
case 135:
 this.$= new yy.ObjectConstructorArgsNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 136:
 this.$= new yy.ObjectConstructorArgsNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0]), true) 
break;
case 140:

            if ($$[$0] instanceof yy.List)   {
                $$[$0].addFront($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]))
                this.$= $$[$0]
            }
            else if ($$[$0]){
                this.$= new yy.List($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0])
            }
        
break;
case 141:
 this.$= new yy.Node(new yy.Lit($$[$0-2], _$[$0-2]), new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 142:
 this.$= new yy.Node(new yy.Str($$[$0-2], _$[$0-2]), new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 144:

            if ($$[$0] instanceof yy.List) {
                $$[$0].addFront($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]))
                this.$= $$[$0]
            }
            else if ($$[$0]){
                this.$= new yy.List($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0])
            }
        
break;
case 147:

            if ($$[$0] instanceof yy.List) {
                $$[$0].addFront($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]))
                this.$= $$[$0]
            }
            else if ($$[$0]) {
                this.$= new yy.List($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0])
            }

        
break;
case 148:

            this.$= new yy.FunctionNode(
                new yy.Lit($$[$0-4], _$[$0-4]),
                null,
                new yy.Lit($$[$0-3], _$[$0-3]),
                $$[$0-2],
                new yy.Lit($$[$0-1], _$[$0-1]),
                $$[$0]
            )
        
break;
case 154:
 this.$= new yy.ValueList($$[$0]) 
break;
}
},
table: [{3:1,4:2,5:$V0,6:3,7:4,8:6,9:$V1,10:$V2,15:13,22:$V3,23:5,26:$V4,34:7,35:$V5,38:8},{1:[3]},{5:[1,15]},{4:16,5:$V0,6:3,7:4,8:6,9:$V1,10:$V2,15:13,22:$V3,23:5,26:$V4,34:7,35:$V5,38:8},{5:[2,3]},o($V6,[2,24]),o($V6,[2,25]),{5:[2,29],22:[1,17]},{5:[2,30],22:[1,18]},o($V6,[2,28]),{10:[1,19]},{10:[1,20]},{36:[1,21]},{24:[1,22],123:$V7},o($V8,[2,137]),{1:[2,1]},{5:[2,2]},o($V6,[2,26]),o($V6,[2,27]),{27:[1,24]},{11:25,13:26,14:[1,27],16:[2,156]},o($V9,[2,160],{37:28,10:[1,29]}),{10:$Va,25:30,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,125:36,126:$Vo,135:37,139:38,142:32},{10:[1,63]},{10:$Vp,28:64,29:[2,158],31:65},{12:67,16:[1,68]},{16:[2,157]},{10:$V2,15:69},o($V9,[2,22]),o($V9,[2,161]),o($V9,[2,23]),o($Vq,[2,152]),o($Vq,[2,153]),o($Vq,$Vr,{102:$Vs,103:$Vt,117:$Vu}),o($Vq,[2,128]),o($Vq,[2,129]),o($Vq,[2,149]),o($Vq,[2,150]),o($Vq,[2,151]),o($Vv,[2,113],{107:$Vw,108:$Vx,109:$Vy,110:$Vz,111:$VA,112:$VB,113:$VC}),o($VD,$VE,{24:[1,81],115:[1,80]}),{10:$V2,15:83,118:[2,186],127:82},{10:$V2,15:85,118:[2,188],129:84},{10:$Va,25:88,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,121:[2,194],125:36,126:$Vo,135:37,136:86,137:87,139:38,142:32},{27:[1,89]},o($VF,[2,105]),o($VG,$VH),o($VG,[2,88]),o($VG,[2,89]),o($VF,$VI,{27:$VJ,118:$VK,123:$VL}),{10:$Va,27:$Vc,36:$Vd,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:93,102:$Vi,103:$Vj,104:$Vk,105:$Vl},{10:$Va,27:$Vc,36:$Vd,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:95,102:$Vi,103:$Vj,104:$Vk,105:$Vl},{10:$Va,27:$Vc,36:$Vd,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:96,102:$Vi,103:$Vj,104:$Vk,105:$Vl},{10:$Va,27:$Vc,36:$Vd,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:97,102:$Vi,103:$Vj,104:$Vk,105:$Vl},o($VD,[2,91]),o($VD,$VM),o($VD,[2,93]),o($VD,[2,94]),o($VD,[2,95]),{10:$Va,27:$Vc,36:$Vd,46:98,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39},o($VD,[2,97]),o($VD,[2,98]),o($VD,[2,99]),o($V8,[2,138]),{29:[1,99]},{29:[2,159],32:$VN},o($VO,[2,19]),o($V6,[2,5]),{10:$VP,17:101,18:$VQ,19:102,20:103,21:104,22:$VR,23:105,26:$V4},{16:[2,6],123:$V7},{10:$Va,27:$Vc,36:$Vd,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:108},{10:$Va,27:$Vc,36:$Vd,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:109},{10:$Va,25:110,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,125:36,126:$Vo,135:37,139:38,142:32},{10:$Va,27:$Vc,36:$Vd,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:111,102:$Vi,103:$Vj,104:$Vk,105:$Vl},{10:$Va,27:$Vc,36:$Vd,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:112,102:$Vi,103:$Vj,104:$Vk,105:$Vl},{10:$Va,27:$Vc,36:$Vd,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:113,102:$Vi,103:$Vj,104:$Vk,105:$Vl},{10:$Va,27:$Vc,36:$Vd,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:114,102:$Vi,103:$Vj,104:$Vk,105:$Vl},{10:$Va,27:$Vc,36:$Vd,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:115,102:$Vi,103:$Vj,104:$Vk,105:$Vl},{10:$Va,27:$Vc,36:$Vd,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:116,102:$Vi,103:$Vj,104:$Vk,105:$Vl},{10:$Va,27:$Vc,36:$Vd,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:117,102:$Vi,103:$Vj,104:$Vk,105:$Vl},{10:$Va,25:118,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,125:36,126:$Vo,135:37,139:38,142:32},{10:$Va,25:119,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,125:36,126:$Vo,135:37,139:38,142:32},{118:$VS,128:120},o($Vq,[2,131],{118:[2,187],123:$V7}),{118:$VS,128:122},o($Vq,[2,133],{118:[2,189],123:$V7}),{121:[1,123]},{32:[1,124],121:[2,195]},o($VT,[2,146]),{10:$Vp,29:[2,198],31:126,140:125},{10:$Va,14:[2,178],27:$Vc,36:$Vd,46:130,90:94,91:47,92:48,93:128,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,119:129,121:[1,127]},{10:[1,131],27:[1,132]},{10:$Va,25:135,26:$Vb,27:$Vc,29:[2,182],36:$Vd,43:31,46:33,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,122:133,125:36,126:$Vo,135:37,139:38,142:32,143:134},o($VF,[2,101]),o($VD,$VE),o($VF,[2,102]),o($VF,[2,103]),o($VF,[2,104]),{29:[1,136],102:$Vs,103:$Vt},{16:$VU,30:137},{10:[1,139]},{18:[1,140]},{10:$VP,17:141,18:$VQ,19:102,20:103,21:104,22:$VR,23:105,26:$V4},{18:[2,9]},{18:[2,14],22:[1,142]},{18:[2,15],22:[1,143]},o($VV,[2,13]),o($VW,[2,17],{24:[1,144]}),o($Vv,[2,114],{107:$Vw,108:$Vx,109:$Vy,110:$Vz,111:$VA,112:$VB,113:$VC}),o($Vv,[2,115],{107:$Vw,108:$Vx,109:$Vy,110:$Vz,111:$VA,112:$VB,113:$VC}),o($Vq,[2,118]),o($VF,[2,106]),o($VF,[2,107]),o($VF,[2,108]),o($VF,[2,109]),o($VF,[2,110]),o($VF,[2,111]),o($VF,[2,112]),o($Vq,[2,116]),o($Vq,[2,117]),o($Vq,[2,130]),{10:[1,150],25:148,26:$Vb,27:$Vc,36:[1,151],43:31,46:33,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,121:[1,145],125:36,126:$Vo,130:146,131:147,132:149,135:37,139:38,142:32},o($Vq,[2,132]),o($Vq,[2,145]),o($VT,[2,196],{43:31,142:32,46:33,114:34,116:35,125:36,135:37,139:38,106:39,90:40,101:45,91:47,92:48,93:49,98:60,99:61,100:62,138:152,25:153,10:$Va,26:$Vb,27:$Vc,36:$Vd,94:$Ve,95:$Vf,96:$Vg,97:$Vh,102:$Vi,103:$Vj,104:$Vk,105:$Vl,113:$Vm,118:$Vn,126:$Vo}),{29:[1,154]},{29:[2,199],32:$VN},o($VG,[2,124]),o([14,102,103,107,108,109,110,111,112,113],$VI,{27:$VJ,118:$VK,121:[1,155],123:$VL}),{14:[1,156]},{14:[2,179],102:$Vs,103:$Vt},o($VG,[2,123]),{10:$Va,27:$Vc,29:[2,184],36:$Vd,90:94,91:47,92:48,93:158,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,124:157},{29:[1,159]},{29:[2,183],32:[1,160]},o($VO,[2,154]),o($VD,[2,96]),o([5,9,10,18,22,26,35],[2,18]),{10:$Va,18:$VX,22:$VY,27:$Vc,33:161,36:$Vd,39:162,40:163,42:164,43:179,44:180,45:174,46:190,48:165,49:$VZ,53:166,54:$V_,58:167,60:168,61:$V$,69:172,70:$V01,76:173,77:$V11,79:176,80:169,81:$V21,83:175,84:170,85:$V31,86:177,87:171,88:$V41,89:178,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,114:34,116:35},o($VO,[2,20]),o($V6,[2,7]),{18:[2,8]},o($VV,[2,11]),o($VV,[2,12]),{10:$Va,25:191,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,125:36,126:$Vo,135:37,139:38,142:32},o($Vq,[2,134]),{121:[1,192]},{121:[1,193]},{32:[1,194],121:[2,143]},{32:[1,195],121:[2,139]},o([24,27,32,102,103,107,108,109,110,111,112,113,115,117,118,121,123],$VH,{14:$V51}),o([27,32,102,103,107,108,109,110,111,112,113,117,118,121,123],$VM,{14:$V61}),o($VT,[2,147]),o($VT,[2,197]),{10:$Va,16:$VU,25:200,26:$Vb,27:$Vc,30:199,36:$Vd,43:31,46:33,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,125:36,126:$Vo,135:37,139:38,141:198,142:32},o($VG,[2,125]),{10:$Va,27:$Vc,36:$Vd,46:202,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,120:201,121:[2,180]},{29:[1,203]},{27:$VJ,29:[2,185],118:$VK,123:$VL},o($VD,[2,122]),o($VO,[2,202],{43:31,142:32,46:33,114:34,116:35,125:36,135:37,139:38,106:39,90:40,101:45,91:47,92:48,93:49,98:60,99:61,100:62,144:204,25:205,10:$Va,26:$Vb,27:$Vc,36:$Vd,94:$Ve,95:$Vf,96:$Vg,97:$Vh,102:$Vi,103:$Vj,104:$Vk,105:$Vl,113:$Vm,118:$Vn,126:$Vo}),{18:[1,206]},{10:$Va,18:$VX,22:$VY,27:$Vc,33:207,36:$Vd,39:162,40:163,42:164,43:179,44:180,45:174,46:190,48:165,49:$VZ,53:166,54:$V_,58:167,60:168,61:$V$,69:172,70:$V01,76:173,77:$V11,79:176,80:169,81:$V21,83:175,84:170,85:$V31,86:177,87:171,88:$V41,89:178,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,114:34,116:35},{18:[2,32]},o($V71,[2,72]),o($V71,[2,73]),o($V71,[2,74]),o($V71,[2,75]),o($V71,[2,76]),o($V71,[2,77]),o($V71,[2,78]),o($V71,[2,79]),o($V71,[2,80]),o($V71,[2,81]),{18:[2,82]},{18:[2,83]},{18:[2,84]},{18:[2,85]},{18:[2,86]},{18:$V81,22:$V91},{18:$Va1,22:$Vb1},o($V71,[2,38]),{10:$Va,27:$Vc,36:$Vd,46:210,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39},{10:[1,214],16:$VU,22:[2,164],27:$Vc,30:213,36:$Vd,43:212,46:33,55:211,67:215,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,114:34,116:35},{10:$Va,16:[2,170],27:$Vc,36:$Vd,46:217,62:216,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39},{10:$Va,18:[2,67],22:$Vc1,25:219,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,82:218,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,125:36,126:$Vo,135:37,139:38,142:32},{18:[2,69],22:$Vd1},{18:[2,71],22:$Ve1},{16:$VU,30:222},{10:$Va,18:[2,64],22:$Vf1,25:224,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,78:223,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,125:36,126:$Vo,135:37,139:38,142:32},o($Vg1,$Vr,{47:[1,225],102:$Vs,103:$Vt,117:$Vu}),o($VW,[2,16]),o($Vq,[2,135]),o($Vq,[2,136]),{10:$Va,25:148,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,121:[2,192],125:36,126:$Vo,130:227,134:226,135:37,139:38,142:32},{10:[1,230],36:[1,231],121:[2,190],131:229,132:149,133:228},{10:$Va,25:232,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,125:36,126:$Vo,135:37,139:38,142:32},{10:$Va,25:233,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,125:36,126:$Vo,135:37,139:38,142:32},o($Vq,[2,148]),o($Vq,[2,200]),o($Vq,[2,201]),{121:[1,234]},{102:$Vs,103:$Vt,121:[2,181]},o($VD,[2,126]),o($VO,[2,155]),o($VO,[2,203]),o([5,9,10,14,16,18,22,26,27,29,32,35,36,49,52,54,61,66,68,70,73,75,77,81,85,88,94,95,96,97,102,103,104,105,121],[2,21]),{18:[2,31]},o($V71,[2,36]),o($V71,[2,37]),{16:$VU,30:235,102:$Vs,103:$Vt},{22:[1,236]},o([22,32],$Vh1,{30:237,16:$VU}),o($V71,[2,47]),o([16,22,24,27,102,103,107,108,109,110,111,112,113,115,117,118,123],$VH,{32:[1,239],59:[1,238]}),{22:[2,165],32:$Vi1},{16:[1,242],63:241},{16:[2,171],102:$Vs,103:$Vt},{22:[1,243]},{18:[2,66],22:$Vj1},o($V71,[2,68]),o($V71,[2,70]),o($V71,[2,56],{71:244,72:245,73:[1,246],75:$Vk1}),{22:[1,248]},{18:[2,63],22:$Vl1},o($Vg1,[2,41]),{121:[2,144]},{121:[2,193]},{121:[2,140]},{121:[2,191]},{14:$V51},{14:$V61},o($VT,[2,141]),o($VT,[2,142]),o($VD,[2,121]),o($V71,[2,162],{50:249,51:250,52:[1,251]}),{10:$Va,22:[2,166],27:$Vc,36:$Vd,46:253,56:252,90:94,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39},o($V71,[2,46]),{10:$Va,25:254,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,125:36,126:$Vo,135:37,139:38,142:32},{10:[1,255]},{10:$Va,27:$Vc,36:$Vd,43:256,46:33,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,114:34,116:35},o($V71,[2,50]),{64:257,65:258,66:$Vm1,68:$Vn1},o($V71,[2,65]),o($V71,[2,57],{72:261,75:$Vk1}),o($V71,[2,58]),{10:[1,263],16:[2,172],74:262},{16:$VU,30:264},o($V71,[2,62]),o($V71,[2,42]),o($V71,[2,163]),{16:$VU,30:265,48:266,49:$VZ},{22:[1,267]},{22:[2,167],102:$Vs,103:$Vt},{16:$VU,30:268},{59:[1,269]},o([14,22,32],[2,120]),{18:[1,270],65:271,66:$Vm1,68:$Vn1},o($Vo1,[2,52]),{10:$Va,27:$Vc,36:$Vd,43:273,46:33,67:272,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,114:34,116:35},{14:[1,274]},o($V71,[2,59]),{16:$VU,30:275},{16:[2,173]},o($V71,[2,61]),o($V71,[2,43]),o($V71,[2,44]),{10:$Va,16:[2,168],27:$Vc,36:$Vd,43:278,44:279,45:277,46:190,57:276,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,114:34,116:35},o($V71,[2,48]),{10:$Va,25:280,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,125:36,126:$Vo,135:37,139:38,142:32},o($V71,[2,51]),o($Vo1,[2,53]),{14:[1,281],32:$Vi1},o([14,32],$Vh1),{10:$Va,22:$VY,27:$Vc,36:$Vd,39:283,41:282,42:164,43:284,44:285,46:190,48:165,49:$VZ,53:166,54:$V_,58:167,60:168,61:$V$,69:172,70:$V01,76:173,77:$Vp1,80:169,81:$Vq1,84:170,85:$Vr1,87:171,88:$Vs1,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,114:34,116:35},o([10,18,22,27,36,49,54,61,66,68,70,75,77,81,85,88,94,95,96,97,102,103,104,105],[2,60]),{16:$VU,30:290},{16:[2,169]},{16:$V81},{16:$Va1},{16:$VU,30:291},{10:$Va,22:$VY,27:$Vc,36:$Vd,39:283,41:292,42:164,43:284,44:285,46:190,48:165,49:$VZ,53:166,54:$V_,58:167,60:168,61:$V$,69:172,70:$V01,76:173,77:$Vp1,80:169,81:$Vq1,84:170,85:$Vr1,87:171,88:$Vs1,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,114:34,116:35},o($Vo1,[2,55],{114:34,116:35,106:39,90:40,101:45,91:47,92:48,93:49,98:60,99:61,100:62,42:164,48:165,53:166,58:167,60:168,80:169,84:170,87:171,69:172,76:173,46:190,43:284,44:285,39:293,10:$Va,22:$VY,27:$Vc,36:$Vd,49:$VZ,54:$V_,61:$V$,70:$V01,77:$Vp1,81:$Vq1,85:$Vr1,88:$Vs1,94:$Ve,95:$Vf,96:$Vg,97:$Vh,102:$Vi,103:$Vj,104:$Vk,105:$Vl}),o($V71,[2,34]),{22:$V91},{22:$Vb1},{10:$Va,22:$Vc1,25:294,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,82:218,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,125:36,126:$Vo,135:37,139:38,142:32},{22:$Vd1},{22:$Ve1},{10:$Va,22:$Vf1,25:295,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,78:223,90:40,91:47,92:48,93:49,94:$Ve,95:$Vf,96:$Vg,97:$Vh,98:60,99:61,100:62,101:45,102:$Vi,103:$Vj,104:$Vk,105:$Vl,106:39,113:$Vm,114:34,116:35,118:$Vn,125:36,126:$Vo,135:37,139:38,142:32},o($V71,[2,45]),o($V71,[2,49]),o($Vo1,[2,54],{114:34,116:35,106:39,90:40,101:45,91:47,92:48,93:49,98:60,99:61,100:62,42:164,48:165,53:166,58:167,60:168,80:169,84:170,87:171,69:172,76:173,46:190,43:284,44:285,39:293,10:$Va,22:$VY,27:$Vc,36:$Vd,49:$VZ,54:$V_,61:$V$,70:$V01,77:$Vp1,81:$Vq1,85:$Vr1,88:$Vs1,94:$Ve,95:$Vf,96:$Vg,97:$Vh,102:$Vi,103:$Vj,104:$Vk,105:$Vl}),o($V71,[2,35]),{22:$Vj1},{22:$Vl1}],
defaultActions: {4:[2,3],15:[2,1],16:[2,2],26:[2,157],103:[2,9],141:[2,8],163:[2,32],174:[2,82],175:[2,83],176:[2,84],177:[2,85],178:[2,86],207:[2,31],226:[2,144],227:[2,193],228:[2,140],229:[2,191],263:[2,173],277:[2,169],278:[2,39],279:[2,40],294:[2,177],295:[2,175]},
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
                                yy.env.addComment(
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

                                yy.env.addComment(
                                    new yy.MultiLineCommentNode(yy_.yytext, yy_.yylloc)
                                );
                            
break;
case 3:return 36
break;
case 4:return 'EOL'
break;
case 5:return 35
break;
case 6: yy.env.newContext(); return 9 
break;
case 7: yy.env.newContext(); return 26 
break;
case 8:return 94
break;
case 9:return 97
break;
case 10:return 81
break;
case 11:return 49
break;
case 12:return 52
break;
case 13:return 54
break;
case 14:return 59
break;
case 15:return 61
break;
case 16:return 66
break;
case 17:return 68
break;
case 18:return 88
break;
case 19:return 85
break;
case 20:return 95
break;
case 21:return 70
break;
case 22:return 73
break;
case 23:return 75
break;
case 24:return 77
break;
case 25:return 96
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
case 31:return 118
break;
case 32:return 121
break;
case 33:return 117
break;
case 34:return 115
break;
case 35:return 110
break;
case 36:return 111
break;
case 37:return 112
break;
case 38:return 47
break;
case 39:return 113
break;
case 40:return 24
break;
case 41:return 126
break;
case 42:return 14
break;
case 43:return 32
break;
case 44:return 123
break;
case 45:return 22
break;
case 46:return 104
break;
case 47:return 105
break;
case 48:return 102
break;
case 49:return 103
break;
case 50:return 107
break;
case 51:return 108
break;
case 52:return 109
break;
case 53: yy.parseError('character ' + yy_.yytext + ' with code: ' + yy_.yytext.charCodeAt(0), {loc: yy_.yylloc}); 
break;
case 54:return 5
break;
}
},
rules: [/^(?:[ \f\t\u00A0\u2028\u2029\uFEFF]+)/,/^(?:\/\/.*)/,/^(?:---([\s\S]*?)---)/,/^(?:'([^\\']|\\[\s\S])*')/,/^(?:(\r\n|\n))/,/^(?:use\b)/,/^(?:class\b)/,/^(?:func\b)/,/^(?:me\b)/,/^(?:nil\b)/,/^(?:return\b)/,/^(?:if\b)/,/^(?:else\b)/,/^(?:for\b)/,/^(?:in\b)/,/^(?:switch\b)/,/^(?:case\b)/,/^(?:default\b)/,/^(?:continue\b)/,/^(?:break\b)/,/^(?:true\b|false\b)/,/^(?:try\b)/,/^(?:catch\b)/,/^(?:finally\b)/,/^(?:throw\b)/,/^(?:0x[\da-fA-F]+|^\d*\.?\d+(?:[eE][+-]?\d+)?\b)/,/^(?:[\$_a-zA-Z\x7f-\uffff]+[\$\w\x7f-\uffff]*)/,/^(?:\{)/,/^(?:\})/,/^(?:\()/,/^(?:\))/,/^(?:\[)/,/^(?:\])/,/^(?:\?\?)/,/^(?:\*=|\/=|%=|\+=|-=|<<=|>>=|>>>=|&=|\^=|\|=)/,/^(?:<<|>>|>>>)/,/^(?:<=|>=|==|!=|<|>)/,/^(?:&&|\|\||\^|\|)/,/^(?:\+\+|--)/,/^(?:&)/,/^(?:=)/,/^(?:@)/,/^(?::)/,/^(?:,)/,/^(?:\.)/,/^(?:;)/,/^(?:!)/,/^(?:~)/,/^(?:\+)/,/^(?:-)/,/^(?:\*)/,/^(?:\/)/,/^(?:%)/,/^(?:.)/,/^(?:$)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54],"inclusive":true}}
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
        this.comments   = [];

        // initialize the first context (module)
        this.newContext();
    },

    addComment: function(node) {
        this.comments.push(node);
    },

    getComments: function() {
        return this.comments;
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

yy.parseError = function parseError (msg, hash, replaceMsg) {
    var filename = yy.env.filename;
    //is non recoverable parser error?
    if (hash && hasProp.call(hash, 'loc') && hash.expected) {
        switch (hash.text) {
            case '\n': hash.text = 'NEW_LINE';       break;
            case ''  : hash.text = 'END_OF_PROGRAM'; break;
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
There is three types of routes:

- Inner    : begins with . char, example: `.models`
- Delegate : ends with file extensions, example `filename.js`
- Public   : is tested against `^[a-z_-]+$` regex

Routes are tested in the same order as types above, if the route does not match to
any of before types then it will be proccessed by `packagize` function which transform
routes according to Cor package convention.
*/
yy.generateRoute = function(route) {    
    var
    parsed, ext,
    rFileNameExt   = /([\s\S]+)*(^|\/)([\w\-]+)*(\.[\w\-]+)*$/,
    rCapitalLetter = /^[A-Z]/,
    rStatic        = /^(\.\.\/)|(\.\/)|(\/)/,
    rInner         = /^\.([\w-]+)$/,
    rPublic        = /^[a-z_-]+$/;
    
    // replace \ by /
    function normalize(route) {
        return route.replace(/\\/g, '/').replace(/\/+/g, '/');
    }

    // apply Cor package convention
    function packagize(route) {
        var
        parsed = rFileNameExt.exec(route);

        if (parsed && parsed[3] && !parsed[4] && !rCapitalLetter.test(parsed[3])) {
            route = (parsed[1] || '') + parsed[2] + parsed[3] + '/' + parsed[3];
        }
        else if (!parsed[3]) {
            return null;
        }

        return normalize(route);
    }

    // Inner
    parsed = rInner.exec(route);
    if (parsed) {
        return normalize('./' + parsed[1]);
    }

    // Public
    if (rPublic.test(route)) {
        return normalize(route);
    }
    
    // Delegate
    // parsed[4] is the file extension
    // so if parsed[4]? then is delegate route
    parsed = rFileNameExt.exec(route);
    if (parsed[4]) {
        return normalize(route);
    }

    // else process by applying Cor package convention
    return packagize(route);
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
        if (fn(ch[i]) === false) {
            return;
        }
        preorder(ch[i], fn);
    }
}

function flattenToLine(node, lineno) {
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

    runtimePrefix: 'CRL.',

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
        return this.runtimePrefix + name + '(';
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
    },

    addFront: function() {
        this.children = slice.call(arguments).concat(this.children);
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

// Node for function and class blocks
yy.BlockNode = Class(yy.Node, {
    type: 'BlockNode'
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
                new yy.Lit('return', ch[5].loc.first_line),
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

    rCapitalLetter: /^[A-Z]/,

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
        alias  = this.alias || this.extractedAlias,
        suffix = '';

        if (this.rCapitalLetter.test(this.extractedAlias)) {
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
            this.methodSet.children[0].children[1].children += this.runtimeFn('extend') + this.className + extendsStr +');';
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
            newNode = new yy.Lit(this.runtimeFn('extend') + this.className + extendsStr +');', this.propertySet.lineno);
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

        if (this.name) {
            builtin = this[this.name + 'Builtin'];
            if (builtin) {
                builtin.call(this);
            }
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
        comments = this.env.getComments(),
        len      = comments.length;

        this.visitNode(ast);

        for (i = 0; i < len; i++) {
            this.visitNode(comments[i]);
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
        console.error('Unable to read ', srcPath, ' requested from ', from);
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
        var path, prog, env, js;

        if (this.environment === null) {

            js = this.toJs();
            if (typeof js === 'string') {
                js = {src: js};
            }
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
            suffix: suffix
        };
    }

});

})(typeof cor === 'undefined' ? {} : cor);
