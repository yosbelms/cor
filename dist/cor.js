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
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[2,4],$V1=[1,11],$V2=[1,14],$V3=[1,9],$V4=[1,10],$V5=[1,12],$V6=[5,9,10,22,26,35],$V7=[1,23],$V8=[5,14,16,18,22,24,29,32,110,113,118],$V9=[5,22],$Va=[1,45],$Vb=[1,43],$Vc=[1,58],$Vd=[1,54],$Ve=[1,53],$Vf=[1,55],$Vg=[1,56],$Vh=[1,57],$Vi=[1,49],$Vj=[1,50],$Vk=[1,51],$Vl=[1,52],$Vm=[1,41],$Vn=[1,42],$Vo=[1,65],$Vp=[5,14,16,18,22,29,32,113],$Vq=[2,123],$Vr=[1,69],$Vs=[1,70],$Vt=[1,71],$Vu=[5,14,16,18,22,29,32,47,93,94,109,113],$Vv=[1,72],$Vw=[1,73],$Vx=[1,74],$Vy=[1,75],$Vz=[1,76],$VA=[1,77],$VB=[1,78],$VC=[5,14,16,18,22,27,29,32,47,93,94,97,99,100,101,102,103,104,105,109,110,113,118],$VD=[2,80],$VE=[5,14,16,18,22,29,32,47,93,94,99,100,101,102,103,104,105,109,113],$VF=[5,14,16,18,22,24,27,29,32,47,93,94,97,99,100,101,102,103,104,105,107,109,110,113,118],$VG=[2,77],$VH=[2,90],$VI=[1,90],$VJ=[1,87],$VK=[1,88],$VL=[1,89],$VM=[2,82],$VN=[1,98],$VO=[29,32],$VP=[1,105],$VQ=[2,10],$VR=[1,104],$VS=[32,113],$VT=[1,126],$VU=[1,124],$VV=[1,125],$VW=[1,138],$VX=[10,18,22,26],$VY=[18,22],$VZ=[14,93,94,99,100,101,102,103,104,105],$V_=[1,167],$V$=[2,33],$V01=[1,186],$V11=[1,187],$V21=[1,188],$V31=[1,189],$V41=[1,193],$V51=[1,190],$V61=[1,191],$V71=[1,192],$V81=[1,200],$V91=[1,201],$Va1=[10,18,22,27,36,49,54,61,66,68,70,72,76,79,85,86,87,88,93,94,95,96],$Vb1=[2,39],$Vc1=[1,216],$Vd1=[2,40],$Ve1=[1,217],$Vf1=[2,166],$Vg1=[1,228],$Vh1=[1,229],$Vi1=[16,18,22],$Vj1=[2,110],$Vk1=[1,248],$Vl1=[2,167],$Vm1=[1,264],$Vn1=[1,265],$Vo1=[18,66,68],$Vp1=[1,286],$Vq1=[1,287],$Vr1=[1,288];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"Module":3,"Source":4,"EOF":5,"GlobalStmt":6,"GlobalStmtNoSemicolon":7,"ClassStmt":8,"CLASS":9,"IDENT":10,"ClassStmt_option0":11,"ClassBlock":12,"ExtendsStmt":13,":":14,"QualifiedIdent":15,"{":16,"MemberList":17,"}":18,"Member":19,"MemberNotSemicolon":20,"PropertyDecl":21,";":22,"FunctionStmt":23,"=":24,"Value":25,"FUNC":26,"(":27,"FunctionStmt_option0":28,")":29,"Block":30,"FunctionArgs":31,",":32,"StmtList":33,"UseStmt":34,"USE":35,"STRING":36,"UseStmt_option0":37,"GlobalDeclarationStmt":38,"Stmt":39,"StmtNotSemicolon":40,"StrictStmtList":41,"SimpleStmt":42,"Expr":43,"IncDecStmt":44,"SimpleStmtNotSemicolon":45,"OperationExpr":46,"INCDECOP":47,"IfStmt":48,"IF":49,"IfStmt_option0":50,"ElseStmt":51,"ELSE":52,"ForStmt":53,"FOR":54,"ForStmt_option0":55,"ForStmt_option1":56,"ForStmt_option2":57,"ForInStmt":58,"IN":59,"SwitchStmt":60,"SWITCH":61,"SwitchStmt_option0":62,"CaseBlock":63,"CaseStmtList":64,"CaseStmt":65,"CASE":66,"ExprList":67,"DEFAULT":68,"CatchStmt":69,"CATCH":70,"ReturnStmt":71,"RETURN":72,"ReturnStmt_option0":73,"ReturnStmtNotSemicolon":74,"BreakStmt":75,"BREAK":76,"BreakStmtNotSemicolon":77,"ContinueStmt":78,"CONTINUE":79,"ContinueStmtNotSemicolon":80,"LeftHandExpr":81,"IndexExpr":82,"SelectorExpr":83,"PrimaryExpr":84,"ME":85,"BOOLEAN":86,"NUMBER":87,"NIL":88,"SliceExpr":89,"CallExpr":90,"TypeAssertExpr":91,"UnaryExpr":92,"+":93,"-":94,"!":95,"~":96,"?":97,"OperationExprNotAdditive":98,"*":99,"/":100,"%":101,"SHIFTOP":102,"COMPARISONOP":103,"BINARYOP":104,"&":105,"AssignmentExpr":106,"ASSIGNMENTOP":107,"CoalesceExpr":108,"COALESCEOP":109,"[":110,"SliceExpr_option0":111,"SliceExpr_option1":112,"]":113,"SliceExpr_option2":114,"SliceExpr_option3":115,"CallExpr_option0":116,"CallExpr_option1":117,".":118,"TypeAssertExpr_option0":119,"ObjectConstructor":120,"ObjectConstructor_option0":121,"ObjectConstructorArgs":122,"SimpleElementList":123,"KeyValueElementList":124,"KeyedElement":125,"KeyValueElementList_option0":126,"SimpleElementList_option0":127,"ArrayConstructor":128,"ArrayConstructor_option0":129,"ArrayItems":130,"ArrayItems_option0":131,"LambdaConstructor":132,"LambdaConstructor_option0":133,"LambdaConstructor_group0":134,"Constructor":135,"ValueList":136,"ValueList_option0":137,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",9:"CLASS",10:"IDENT",14:":",16:"{",18:"}",22:";",24:"=",26:"FUNC",27:"(",29:")",32:",",35:"USE",36:"STRING",47:"INCDECOP",49:"IF",52:"ELSE",54:"FOR",59:"IN",61:"SWITCH",66:"CASE",68:"DEFAULT",70:"CATCH",72:"RETURN",76:"BREAK",79:"CONTINUE",85:"ME",86:"BOOLEAN",87:"NUMBER",88:"NIL",93:"+",94:"-",95:"!",96:"~",97:"?",99:"*",100:"/",101:"%",102:"SHIFTOP",103:"COMPARISONOP",104:"BINARYOP",105:"&",107:"ASSIGNMENTOP",109:"COALESCEOP",110:"[",113:"]",118:"."},
productions_: [0,[3,2],[4,2],[4,1],[4,0],[8,4],[13,2],[12,3],[17,2],[17,1],[17,0],[19,2],[19,2],[19,1],[20,1],[20,1],[21,3],[21,1],[23,6],[31,1],[31,3],[30,3],[34,3],[38,3],[6,1],[6,1],[6,2],[6,2],[6,1],[7,1],[7,1],[33,2],[33,1],[33,0],[41,1],[41,2],[42,2],[42,2],[42,1],[45,1],[45,1],[44,2],[48,4],[51,2],[51,2],[53,7],[53,3],[53,2],[58,5],[58,7],[60,3],[63,3],[64,1],[64,2],[65,4],[65,3],[69,3],[71,3],[74,2],[74,1],[75,2],[77,1],[78,2],[80,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[40,1],[40,1],[40,1],[40,1],[81,1],[81,1],[81,1],[84,1],[84,1],[84,1],[84,1],[84,1],[84,1],[84,3],[84,1],[84,1],[84,1],[92,1],[92,2],[92,2],[92,2],[92,2],[92,2],[98,1],[98,3],[98,3],[98,3],[98,3],[98,3],[98,3],[98,3],[46,1],[46,3],[46,3],[106,3],[106,3],[108,3],[67,1],[67,3],[89,6],[89,7],[90,4],[90,5],[83,3],[83,4],[82,3],[82,4],[82,4],[82,5],[91,5],[43,1],[43,1],[43,1],[120,3],[120,2],[122,2],[122,3],[122,3],[15,1],[15,3],[124,1],[124,3],[125,3],[125,3],[123,1],[123,3],[128,3],[130,1],[130,3],[132,5],[135,1],[135,1],[135,1],[25,1],[25,1],[136,1],[136,3],[11,0],[11,1],[28,0],[28,1],[37,0],[37,1],[50,0],[50,1],[55,0],[55,1],[56,0],[56,1],[57,0],[57,1],[62,0],[62,1],[73,0],[73,1],[111,0],[111,1],[112,0],[112,1],[114,0],[114,1],[115,0],[115,1],[116,0],[116,1],[117,0],[117,1],[119,0],[119,1],[121,0],[121,1],[126,0],[126,1],[127,0],[127,1],[129,0],[129,1],[131,0],[131,1],[133,0],[133,1],[134,1],[134,1],[137,0],[137,1]],
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
case 6: case 43: case 44: case 58:
 this.$= new yy.Node(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 7: case 51: case 139:
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
case 9: case 34: case 110: case 133: case 137: case 140:
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
case 19: case 131:
 this.$= new yy.List(new yy.Lit($$[$0], _$[$0])) 
break;
case 20: case 132:
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
case 23: case 107: case 108:
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
 this.$= new yy.CatchNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], $$[$0]) 
break;
case 57:
 this.$= new yy.Node(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit(';', _$[$0])) 
break;
case 59: case 83: case 84: case 85:
 this.$= new yy.Lit($$[$0], _$[$0]) 
break;
case 60: case 62:
 this.$= new yy.Node(new yy.Lit($$[$0-1], _$[$0-1]), new yy.Lit(';', _$[$0])) 
break;
case 61: case 63:
 this.$= new yy.Node(new yy.Lit($$[$0], _$[$0])) 
break;
case 77:
 this.$= new yy.VarNode(new yy.Lit($$[$0], _$[$0])) 
break;
case 81:
 this.$= new yy.MeNode($$[$0], _$[$0]) 
break;
case 82:
 this.$= new yy.Str($$[$0], _$[$0]) 
break;
case 86:
 this.$= new yy.AssociationNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 91: case 92: case 93: case 94:
 this.$= new yy.UnaryExprNode(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 97: case 98: case 99: case 100: case 101: case 102: case 103: case 105: case 106:
 this.$= new yy.Node($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 109:
 this.$= new yy.CoalesceNode($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 111: case 149:
 $$[$0-2].add(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 112:

            this.$= new yy.SliceNode(
                $$[$0-5],
                new yy.Lit($$[$0-4], _$[$0-4]),
                $$[$0-3],
                new yy.Lit($$[$0-2], _$[$0-2]),
                $$[$0-1],
                new yy.Lit($$[$0], _$[$0])
            )
        
break;
case 113:

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
case 114:
 this.$= new yy.CallNode($$[$0-3], new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 115:
 this.$= new yy.ExistenceNode(new yy.CallNode($$[$0-4], new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0]))) 
break;
case 116: case 118:
 this.$= new yy.Node($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), new yy.Lit($$[$0], _$[$0])) 
break;
case 117: case 120:
 this.$= new yy.ExistenceNode(new yy.Node($$[$0-3], new yy.Lit($$[$0-1], _$[$0-1]), new yy.Lit($$[$0], _$[$0]))) 
break;
case 119:
 this.$= new yy.Node($$[$0-3], new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 121:
 this.$= new yy.ExistenceNode(new yy.Node($$[$0-4], new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0]))) 
break;
case 122:

            this.$= new yy.TypeAssertNode(
                $$[$0-4],
                new yy.Lit($$[$0-3], _$[$0-3]),
                new yy.Lit($$[$0-2], _$[$0-2]),
                $$[$0-1],
                new yy.Lit($$[$0], _$[$0])
            )
        
break;
case 126:
 this.$= new yy.ObjectConstructorNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], $$[$0]) 
break;
case 127:
 this.$= new yy.ObjectConstructorNode(new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 128:
 this.$= new yy.ObjectConstructorArgsNode(new yy.Lit($$[$0-1], _$[$0-1]), null, new yy.Lit($$[$0], _$[$0])) 
break;
case 129:
 this.$= new yy.ObjectConstructorArgsNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0])) 
break;
case 130:
 this.$= new yy.ObjectConstructorArgsNode(new yy.Lit($$[$0-2], _$[$0-2]), $$[$0-1], new yy.Lit($$[$0], _$[$0]), true) 
break;
case 134:

            if ($$[$0] instanceof yy.List)   {
                $$[$0].addFront($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]))
                this.$= $$[$0]
            }
            else if ($$[$0]){
                this.$= new yy.List($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0])
            }
        
break;
case 135:
 this.$= new yy.Node(new yy.Lit($$[$0-2], _$[$0-2]), new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 136:
 this.$= new yy.Node(new yy.Str($$[$0-2], _$[$0-2]), new yy.Lit($$[$0-1], _$[$0-1]), $$[$0]) 
break;
case 138:

            if ($$[$0] instanceof yy.List) {
                $$[$0].addFront($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]))
                this.$= $$[$0]
            }
            else if ($$[$0]){
                this.$= new yy.List($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0])
            }
        
break;
case 141:

            if ($$[$0] instanceof yy.List) {
                $$[$0].addFront($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]))
                this.$= $$[$0]
            }
            else if ($$[$0]) {
                this.$= new yy.List($$[$0-2], new yy.Lit($$[$0-1], _$[$0-1]), $$[$0])
            }

        
break;
case 142:

            this.$= new yy.FunctionNode(
                new yy.Lit($$[$0-4], _$[$0-4]),
                null,
                new yy.Lit($$[$0-3], _$[$0-3]),
                $$[$0-2],
                new yy.Lit($$[$0-1], _$[$0-1]),
                $$[$0]
            )
        
break;
case 148:
 this.$= new yy.ValueList($$[$0]) 
break;
}
},
table: [{3:1,4:2,5:$V0,6:3,7:4,8:6,9:$V1,10:$V2,15:13,22:$V3,23:5,26:$V4,34:7,35:$V5,38:8},{1:[3]},{5:[1,15]},{4:16,5:$V0,6:3,7:4,8:6,9:$V1,10:$V2,15:13,22:$V3,23:5,26:$V4,34:7,35:$V5,38:8},{5:[2,3]},o($V6,[2,24]),o($V6,[2,25]),{5:[2,29],22:[1,17]},{5:[2,30],22:[1,18]},o($V6,[2,28]),{10:[1,19]},{10:[1,20]},{36:[1,21]},{24:[1,22],118:$V7},o($V8,[2,131]),{1:[2,1]},{5:[2,2]},o($V6,[2,26]),o($V6,[2,27]),{27:[1,24]},{11:25,13:26,14:[1,27],16:[2,150]},o($V9,[2,154],{37:28,10:[1,29]}),{10:$Va,25:30,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,105:$Vm,106:34,108:35,110:$Vn,120:36,128:37,132:38,135:32},{10:[1,62]},{10:$Vo,28:63,29:[2,152],31:64},{12:66,16:[1,67]},{16:[2,151]},{10:$V2,15:68},o($V9,[2,22]),o($V9,[2,155]),o($V9,[2,23]),o($Vp,[2,146]),o($Vp,[2,147]),o($Vp,$Vq,{93:$Vr,94:$Vs,109:$Vt}),o($Vp,[2,124]),o($Vp,[2,125]),o($Vp,[2,143]),o($Vp,[2,144]),o($Vp,[2,145]),o($Vu,[2,104],{99:$Vv,100:$Vw,101:$Vx,102:$Vy,103:$Vz,104:$VA,105:$VB}),o($VC,$VD,{24:[1,80],107:[1,79]}),{10:$V2,15:82,110:[2,182],121:81},{10:$Va,25:85,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,105:$Vm,106:34,108:35,110:$Vn,113:[2,188],120:36,128:37,129:83,130:84,132:38,135:32},{27:[1,86]},o($VE,[2,96]),o($VF,$VG),o($VF,[2,78]),o($VF,[2,79]),o($VE,$VH,{27:$VI,97:$VJ,110:$VK,118:$VL}),{10:$Va,27:$Vc,36:$Vd,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:91,93:$Vi,94:$Vj,95:$Vk,96:$Vl},{10:$Va,27:$Vc,36:$Vd,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:93,93:$Vi,94:$Vj,95:$Vk,96:$Vl},{10:$Va,27:$Vc,36:$Vd,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:94,93:$Vi,94:$Vj,95:$Vk,96:$Vl},{10:$Va,27:$Vc,36:$Vd,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:95,93:$Vi,94:$Vj,95:$Vk,96:$Vl},o($VC,[2,81]),o($VC,$VM),o($VC,[2,83]),o($VC,[2,84]),o($VC,[2,85]),{10:$Va,27:$Vc,36:$Vd,46:96,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39},o($VC,[2,87]),o($VC,[2,88]),o($VC,[2,89]),o($V8,[2,132]),{29:[1,97]},{29:[2,153],32:$VN},o($VO,[2,19]),o($V6,[2,5]),{10:$VP,17:99,18:$VQ,19:100,20:101,21:102,22:$VR,23:103,26:$V4},{16:[2,6],118:$V7},{10:$Va,27:$Vc,36:$Vd,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:106},{10:$Va,27:$Vc,36:$Vd,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:107},{10:$Va,25:108,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,105:$Vm,106:34,108:35,110:$Vn,120:36,128:37,132:38,135:32},{10:$Va,27:$Vc,36:$Vd,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:109,93:$Vi,94:$Vj,95:$Vk,96:$Vl},{10:$Va,27:$Vc,36:$Vd,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:110,93:$Vi,94:$Vj,95:$Vk,96:$Vl},{10:$Va,27:$Vc,36:$Vd,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:111,93:$Vi,94:$Vj,95:$Vk,96:$Vl},{10:$Va,27:$Vc,36:$Vd,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:112,93:$Vi,94:$Vj,95:$Vk,96:$Vl},{10:$Va,27:$Vc,36:$Vd,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:113,93:$Vi,94:$Vj,95:$Vk,96:$Vl},{10:$Va,27:$Vc,36:$Vd,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:114,93:$Vi,94:$Vj,95:$Vk,96:$Vl},{10:$Va,27:$Vc,36:$Vd,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:115,93:$Vi,94:$Vj,95:$Vk,96:$Vl},{10:$Va,25:116,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,105:$Vm,106:34,108:35,110:$Vn,120:36,128:37,132:38,135:32},{10:$Va,25:117,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,105:$Vm,106:34,108:35,110:$Vn,120:36,128:37,132:38,135:32},{110:[1,119],122:118},o($Vp,[2,127],{110:[2,183],118:$V7}),{113:[1,120]},{32:[1,121],113:[2,189]},o($VS,[2,140]),{10:$Vo,29:[2,192],31:123,133:122},o($VE,[2,95],{27:$VT,110:$VU,118:$VV}),{10:$Va,14:[2,168],27:$Vc,36:$Vd,46:130,81:92,82:46,83:47,84:128,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,111:129,113:[1,127]},{10:[1,131],27:[1,132]},{10:$Va,25:135,26:$Vb,27:$Vc,29:[2,176],36:$Vd,43:31,46:33,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,105:$Vm,106:34,108:35,110:$Vn,116:133,120:36,128:37,132:38,135:32,136:134},o($VE,[2,91]),o($VC,$VD),o($VE,[2,92]),o($VE,[2,93]),o($VE,[2,94]),{29:[1,136],93:$Vr,94:$Vs},{16:$VW,30:137},{10:[1,139]},{18:[1,140]},{10:$VP,17:141,18:$VQ,19:100,20:101,21:102,22:$VR,23:103,26:$V4},{18:[2,9]},{18:[2,14],22:[1,142]},{18:[2,15],22:[1,143]},o($VX,[2,13]),o($VY,[2,17],{24:[1,144]}),o($Vu,[2,105],{99:$Vv,100:$Vw,101:$Vx,102:$Vy,103:$Vz,104:$VA,105:$VB}),o($Vu,[2,106],{99:$Vv,100:$Vw,101:$Vx,102:$Vy,103:$Vz,104:$VA,105:$VB}),o($Vp,[2,109]),o($VE,[2,97]),o($VE,[2,98]),o($VE,[2,99]),o($VE,[2,100]),o($VE,[2,101]),o($VE,[2,102]),o($VE,[2,103]),o($Vp,[2,107]),o($Vp,[2,108]),o($Vp,[2,126]),{10:[1,150],25:148,26:$Vb,27:$Vc,36:[1,151],43:31,46:33,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,105:$Vm,106:34,108:35,110:$Vn,113:[1,145],120:36,123:146,124:147,125:149,128:37,132:38,135:32},o($Vp,[2,139]),o($VS,[2,190],{43:31,135:32,46:33,106:34,108:35,120:36,128:37,132:38,98:39,81:40,92:44,82:46,83:47,84:48,89:59,90:60,91:61,131:152,25:153,10:$Va,26:$Vb,27:$Vc,36:$Vd,85:$Ve,86:$Vf,87:$Vg,88:$Vh,93:$Vi,94:$Vj,95:$Vk,96:$Vl,105:$Vm,110:$Vn}),{29:[1,154]},{29:[2,193],32:$VN},{10:$Va,14:[2,172],27:$Vc,36:$Vd,46:158,81:92,82:46,83:47,84:156,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,113:[1,155],114:157},{10:[1,159]},{10:$Va,25:135,26:$Vb,27:$Vc,29:[2,178],36:$Vd,43:31,46:33,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,105:$Vm,106:34,108:35,110:$Vn,117:160,120:36,128:37,132:38,135:32,136:161},o($VF,[2,118]),o($VZ,$VH,{27:$VI,97:$VJ,110:$VK,113:[1,162],118:$VL}),{14:[1,163]},{14:[2,169],93:$Vr,94:$Vs},o($VF,[2,116]),{10:$Va,27:$Vc,29:[2,180],36:$Vd,81:92,82:46,83:47,84:165,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,119:164},{29:[1,166]},{29:[2,177],32:$V_},o($VO,[2,148]),o($VC,[2,86]),o([5,9,10,18,22,26,35],[2,18]),{10:$Va,18:$V$,22:$V01,27:$Vc,33:168,36:$Vd,39:169,40:170,42:171,43:184,44:185,45:180,46:194,48:172,49:$V11,53:173,54:$V21,58:174,60:175,61:$V31,69:179,70:$V41,71:176,72:$V51,74:181,75:177,76:$V61,77:182,78:178,79:$V71,80:183,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,106:34,108:35},o($VO,[2,20]),o($V6,[2,7]),{18:[2,8]},o($VX,[2,11]),o($VX,[2,12]),{10:$Va,25:195,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,105:$Vm,106:34,108:35,110:$Vn,120:36,128:37,132:38,135:32},o($Vp,[2,128]),{113:[1,196]},{113:[1,197]},{32:[1,198],113:[2,137]},{32:[1,199],113:[2,133]},o([24,27,32,93,94,97,99,100,101,102,103,104,105,107,109,110,113,118],$VG,{14:$V81}),o([27,32,93,94,97,99,100,101,102,103,104,105,109,110,113,118],$VM,{14:$V91}),o($VS,[2,141]),o($VS,[2,191]),{10:$Va,16:$VW,25:204,26:$Vb,27:$Vc,30:203,36:$Vd,43:31,46:33,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,105:$Vm,106:34,108:35,110:$Vn,120:36,128:37,132:38,134:202,135:32},o($VF,[2,120]),o($VZ,$VH,{27:$VI,97:$VJ,110:$VK,113:[1,205],118:$VL}),{14:[1,206]},{14:[2,173],93:$Vr,94:$Vs},o($VF,[2,117]),{29:[1,207]},{29:[2,179],32:$V_},o($VF,[2,119]),{10:$Va,27:$Vc,36:$Vd,46:209,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,112:208,113:[2,170]},{29:[1,210]},{27:$VI,29:[2,181],97:[1,211],110:$VK,118:$VL},o($VC,[2,114]),o($VO,[2,196],{43:31,135:32,46:33,106:34,108:35,120:36,128:37,132:38,98:39,81:40,92:44,82:46,83:47,84:48,89:59,90:60,91:61,137:212,25:213,10:$Va,26:$Vb,27:$Vc,36:$Vd,85:$Ve,86:$Vf,87:$Vg,88:$Vh,93:$Vi,94:$Vj,95:$Vk,96:$Vl,105:$Vm,110:$Vn}),{18:[1,214]},{10:$Va,18:$V$,22:$V01,27:$Vc,33:215,36:$Vd,39:169,40:170,42:171,43:184,44:185,45:180,46:194,48:172,49:$V11,53:173,54:$V21,58:174,60:175,61:$V31,69:179,70:$V41,71:176,72:$V51,74:181,75:177,76:$V61,77:182,78:178,79:$V71,80:183,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,106:34,108:35},{18:[2,32]},o($Va1,[2,64]),o($Va1,[2,65]),o($Va1,[2,66]),o($Va1,[2,67]),o($Va1,[2,68]),o($Va1,[2,69]),o($Va1,[2,70]),o($Va1,[2,71]),o($Va1,[2,72]),{18:[2,73]},{18:[2,74]},{18:[2,75]},{18:[2,76]},{18:$Vb1,22:$Vc1},{18:$Vd1,22:$Ve1},o($Va1,[2,38]),{10:$Va,27:$Vc,36:$Vd,46:218,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39},{10:[1,222],16:$VW,22:[2,158],27:$Vc,30:221,36:$Vd,43:220,46:33,55:219,67:223,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,106:34,108:35},{10:$Va,16:[2,164],27:$Vc,36:$Vd,46:225,62:224,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39},{10:$Va,18:[2,59],22:$Vf1,25:227,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,73:226,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,105:$Vm,106:34,108:35,110:$Vn,120:36,128:37,132:38,135:32},{18:[2,61],22:$Vg1},{18:[2,63],22:$Vh1},{10:$Va,27:$Vc,36:$Vd,43:230,46:33,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,106:34,108:35},o($Vi1,$Vq,{47:[1,231],93:$Vr,94:$Vs,109:$Vt}),o($VY,[2,16]),o($Vp,[2,129]),o($Vp,[2,130]),{10:$Va,25:148,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,105:$Vm,106:34,108:35,110:$Vn,113:[2,186],120:36,123:233,127:232,128:37,132:38,135:32},{10:[1,236],36:[1,237],113:[2,184],124:235,125:149,126:234},{10:$Va,25:238,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,105:$Vm,106:34,108:35,110:$Vn,120:36,128:37,132:38,135:32},{10:$Va,25:239,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,105:$Vm,106:34,108:35,110:$Vn,120:36,128:37,132:38,135:32},o($Vp,[2,142]),o($Vp,[2,194]),o($Vp,[2,195]),o($VF,[2,121]),{10:$Va,27:$Vc,36:$Vd,46:241,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,113:[2,174],115:240},o($VC,[2,115]),{113:[1,242]},{93:$Vr,94:$Vs,113:[2,171]},o($VC,[2,122]),{27:$VT,110:$VU,118:$VV},o($VO,[2,149]),o($VO,[2,197]),o([5,9,10,14,16,18,22,26,27,29,32,35,36,49,52,54,61,66,68,70,72,76,79,85,86,87,88,93,94,95,96,113],[2,21]),{18:[2,31]},o($Va1,[2,36]),o($Va1,[2,37]),{16:$VW,30:243,93:$Vr,94:$Vs},{22:[1,244]},o([22,32],$Vj1,{30:245,16:$VW}),o($Va1,[2,47]),o([16,22,24,27,93,94,97,99,100,101,102,103,104,105,107,109,110,118],$VG,{32:[1,247],59:[1,246]}),{22:[2,159],32:$Vk1},{16:[1,250],63:249},{16:[2,165],93:$Vr,94:$Vs},{22:[1,251]},{18:[2,58],22:$Vl1},o($Va1,[2,60]),o($Va1,[2,62]),{16:$VW,30:252},o($Vi1,[2,41]),{113:[2,138]},{113:[2,187]},{113:[2,134]},{113:[2,185]},{14:$V81},{14:$V91},o($VS,[2,135]),o($VS,[2,136]),{113:[1,253]},{93:$Vr,94:$Vs,113:[2,175]},o($VC,[2,112]),o($Va1,[2,156],{50:254,51:255,52:[1,256]}),{10:$Va,22:[2,160],27:$Vc,36:$Vd,46:258,56:257,81:92,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39},o($Va1,[2,46]),{10:$Va,25:259,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,105:$Vm,106:34,108:35,110:$Vn,120:36,128:37,132:38,135:32},{10:[1,260]},{10:$Va,27:$Vc,36:$Vd,43:261,46:33,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,106:34,108:35},o($Va1,[2,50]),{64:262,65:263,66:$Vm1,68:$Vn1},o($Va1,[2,57]),o($Va1,[2,56]),o($VC,[2,113]),o($Va1,[2,42]),o($Va1,[2,157]),{16:$VW,30:266,48:267,49:$V11},{22:[1,268]},{22:[2,161],93:$Vr,94:$Vs},{16:$VW,30:269},{59:[1,270]},o([14,22,32],[2,111]),{18:[1,271],65:272,66:$Vm1,68:$Vn1},o($Vo1,[2,52]),{10:$Va,27:$Vc,36:$Vd,43:274,46:33,67:273,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,106:34,108:35},{14:[1,275]},o($Va1,[2,43]),o($Va1,[2,44]),{10:$Va,16:[2,162],27:$Vc,36:$Vd,43:278,44:279,45:277,46:194,57:276,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,106:34,108:35},o($Va1,[2,48]),{10:$Va,25:280,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,105:$Vm,106:34,108:35,110:$Vn,120:36,128:37,132:38,135:32},o($Va1,[2,51]),o($Vo1,[2,53]),{14:[1,281],32:$Vk1},o([14,32],$Vj1),{10:$Va,22:$V01,27:$Vc,36:$Vd,39:283,41:282,42:171,43:284,44:285,46:194,48:172,49:$V11,53:173,54:$V21,58:174,60:175,61:$V31,69:179,70:$V41,71:176,72:$Vp1,75:177,76:$Vq1,78:178,79:$Vr1,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,106:34,108:35},{16:$VW,30:289},{16:[2,163]},{16:$Vb1},{16:$Vd1},{16:$VW,30:290},{10:$Va,22:$V01,27:$Vc,36:$Vd,39:283,41:291,42:171,43:284,44:285,46:194,48:172,49:$V11,53:173,54:$V21,58:174,60:175,61:$V31,69:179,70:$V41,71:176,72:$Vp1,75:177,76:$Vq1,78:178,79:$Vr1,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,106:34,108:35},o($Vo1,[2,55],{106:34,108:35,98:39,81:40,92:44,82:46,83:47,84:48,89:59,90:60,91:61,42:171,48:172,53:173,58:174,60:175,71:176,75:177,78:178,69:179,46:194,43:284,44:285,39:292,10:$Va,22:$V01,27:$Vc,36:$Vd,49:$V11,54:$V21,61:$V31,70:$V41,72:$Vp1,76:$Vq1,79:$Vr1,85:$Ve,86:$Vf,87:$Vg,88:$Vh,93:$Vi,94:$Vj,95:$Vk,96:$Vl}),o($Va1,[2,34]),{22:$Vc1},{22:$Ve1},{10:$Va,22:$Vf1,25:293,26:$Vb,27:$Vc,36:$Vd,43:31,46:33,73:226,81:40,82:46,83:47,84:48,85:$Ve,86:$Vf,87:$Vg,88:$Vh,89:59,90:60,91:61,92:44,93:$Vi,94:$Vj,95:$Vk,96:$Vl,98:39,105:$Vm,106:34,108:35,110:$Vn,120:36,128:37,132:38,135:32},{22:$Vg1},{22:$Vh1},o($Va1,[2,45]),o($Va1,[2,49]),o($Vo1,[2,54],{106:34,108:35,98:39,81:40,92:44,82:46,83:47,84:48,89:59,90:60,91:61,42:171,48:172,53:173,58:174,60:175,71:176,75:177,78:178,69:179,46:194,43:284,44:285,39:292,10:$Va,22:$V01,27:$Vc,36:$Vd,49:$V11,54:$V21,61:$V31,70:$V41,72:$Vp1,76:$Vq1,79:$Vr1,85:$Ve,86:$Vf,87:$Vg,88:$Vh,93:$Vi,94:$Vj,95:$Vk,96:$Vl}),o($Va1,[2,35]),{22:$Vl1}],
defaultActions: {4:[2,3],15:[2,1],16:[2,2],26:[2,151],101:[2,9],141:[2,8],170:[2,32],180:[2,73],181:[2,74],182:[2,75],183:[2,76],215:[2,31],232:[2,138],233:[2,187],234:[2,134],235:[2,185],277:[2,163],278:[2,39],279:[2,40],293:[2,167]},
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
case 8:return 85
break;
case 9:return 88
break;
case 10:return 72
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
case 18:return 79
break;
case 19:return 76
break;
case 20:return 86
break;
case 21:return 70
break;
case 22:return 87
break;
case 23:return 10
break;
case 24:return 16
break;
case 25:return 18
break;
case 26:return 27
break;
case 27:return 29
break;
case 28:return 110
break;
case 29:return 113
break;
case 30:return 109
break;
case 31:return 107
break;
case 32:return 102
break;
case 33:return 103
break;
case 34:return 104
break;
case 35:return 47
break;
case 36:return 105
break;
case 37:return 24
break;
case 38:return '@'
break;
case 39:return 14
break;
case 40:return 32
break;
case 41:return 118
break;
case 42:return 22
break;
case 43:return 95
break;
case 44:return 96
break;
case 45:return 93
break;
case 46:return 94
break;
case 47:return 99
break;
case 48:return 100
break;
case 49:return 101
break;
case 50:return 97
break;
case 51: yy.parseError('character ' + yy_.yytext + ' with code: ' + yy_.yytext.charCodeAt(0), {loc: yy_.yylloc}); 
break;
case 52:return 5
break;
}
},
rules: [/^(?:[ \f\t\u00A0\u2028\u2029\uFEFF]+)/,/^(?:\/\/.*)/,/^(?:---([\s\S]*?)---)/,/^(?:'([^\\']|\\[\s\S])*')/,/^(?:(\r\n|\n))/,/^(?:use\b)/,/^(?:class\b)/,/^(?:func\b)/,/^(?:me\b)/,/^(?:nil\b)/,/^(?:return\b)/,/^(?:if\b)/,/^(?:else\b)/,/^(?:for\b)/,/^(?:in\b)/,/^(?:switch\b)/,/^(?:case\b)/,/^(?:default\b)/,/^(?:continue\b)/,/^(?:break\b)/,/^(?:true\b|false\b)/,/^(?:catch\b)/,/^(?:0x[\da-fA-F]+|^\d*\.?\d+(?:[eE][+-]?\d+)?\b)/,/^(?:[\$_a-zA-Z\x7f-\uffff]+[\$\w\x7f-\uffff]*)/,/^(?:\{)/,/^(?:\})/,/^(?:\()/,/^(?:\))/,/^(?:\[)/,/^(?:\])/,/^(?:\?\?)/,/^(?:\*=|\/=|%=|\+=|-=|<<=|>>=|>>>=|&=|\^=|\|=)/,/^(?:<<|>>|>>>)/,/^(?:<=|>=|==|!=|<|>)/,/^(?:&&|\|\||\^|\|)/,/^(?:\+\+|--)/,/^(?:&)/,/^(?:=)/,/^(?:@)/,/^(?::)/,/^(?:,)/,/^(?:\.)/,/^(?:;)/,/^(?:!)/,/^(?:~)/,/^(?:\+)/,/^(?:-)/,/^(?:\*)/,/^(?:\/)/,/^(?:%)/,/^(?:\?)/,/^(?:.)/,/^(?:$)/],
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
    rPublic        = /^[a-z_-]+$/;
    
    // replace \ by /
    function normalize(route) {
        return route.replace(/\\/g, '/').replace(/\/+/g, '/');
    }


    // Public modules
    if (rPublic.test(route)) {
        return normalize(route);
    }
    
    // Delegate, is a route that has explicit extension
    // example: jquery.js, mylib.cor
    // parsed[4] is the file extension
    // so if parsed[4]? then is delegate route
    parsed = rFileNameExt.exec(route);
    if (parsed[4]) {
        return normalize(route);
    }

    // else process by applying Cor package convention
    //return packagize(route);
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
        this.base('init', sub.children);
    },
    
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
        oldNode, newNode,
        condition,
        ref = this.ref,
        ch  = this.children;
        
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
        else {
            this.children = [
                new yy.Lit('typeof (' + ref + ' = ', ch[0].lineno),
                ch[0],
                new yy.Lit(')' + condition, ch[0].lineno),
                new yy.Lit('void 0 : ' + ref, ch[ch.length - 1].lineno),
                this.subject,
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
    confPath                : null,
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

    setPath: function(srcPaths, confPath) {
        var name;
        for (name in srcPaths) {
            this.pathMap[name] = path.resolve(confPath, srcPaths[name]);
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

    setEntry: function(entryPath, confPath) {
        var
        parsed,
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
