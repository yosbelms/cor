(function(){ typeof cor === 'undefined' && (cor = {});

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
}

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

yy.Node = Class({

    type: 'Node',

    runtimePrefix: 'crl_',

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
        throw 'Error: ' + txt + ', on line ' + lineno;
    },

    compile: function() {
        // virtual
    }
})

yy.Mock = Class(yy.Node, {

    type: 'Mock',

    initNode: function() {
        this; arguments;
    }

})

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

})


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
})


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
})

yy.ModuleNode = Class(yy.ContextAwareNode, {

    type: 'ModuleNode',

    initializerName: 'init',

    compile: function() {
        //console.log('compile module');
        this.base('compile', arguments);
        var i, item, name, initialize,
        nameLineno, isQualified, len,
        names = {},
        ls    = this.children[0],
        len   = ls.children.length;

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
                this.context.ignoreVar(name);
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
            initialize = initialize || '';
            ls.children.unshift(new yy.Lit(this.context.compileVars(), 1));
            ls.children.push(new yy.Lit('; ' + this.getClassDefine() + initialize + this.getExport(), this.lineno));
        }
    },

    getClassDefine: function() {
        var
        i, len, classNode,
        ret        = [],
        ch         = this.children,
        classNodes = this.yy.env.classNodes;

        if (classNodes) {
            for (i = 0, len = classNodes.length; i < len; i++) {
                classNode = classNodes[i];
                ret.push(this.runtimeFn('defineClass') + classNode.className);
                if (classNode.superClassNames.length > 0) {
                    ret.push(',[' + classNode.superClassNames.join(',') + ']');
                }
                ret.push('); ');
            }
        }

        return ret.join('');
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
})

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
})

yy.SelectorExprNode = Class(yy.Node, {
    type: 'SelectorExprNode'
})

yy.UnaryExprNode = Class(yy.Node, {
    type: 'UnaryExprNode',
})

yy.AssociationNode = Class(yy.Node, {
    type: 'AssociationNode',
})

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
})

yy.SliceNode = Class(yy.Node, {

    type: 'SliceNode',

    initNode: function() {
        this.base('initNode', arguments);

        var
        num, lit,
        str1  = '(',
        str2  = ')',
        ch    =  this.children,
        start = ch[2],
        end   = ch[4];

        if (start === undefined) {
            start = new yy.Lit('0', ch[1].lineno);
        }

        this.children = [
            ch[0],
            new yy.Lit('.slice(', ch[1].lineno),
            start
        ];

        if (end !== undefined) {
            if (end instanceof yy.UnaryExprNode && typeof end.children[1].children === 'string') {
                lit     = new yy.Lit(end.children[0].children + end.children[1].children, end.lineno);
                lit.loc = end.children[1].loc;
                end     = lit;
            }

            if (end instanceof yy.Lit) {
                end.children =  this.transformLiteral(end.children);
                this.children.push(
                    new yy.Lit(', ', ch[3].lineno),
                    end
                );
            }
            else {
                if (end instanceof yy.AssociationNode) {
                    str1 = '';
                    str2 = '';
                }
                this.children.push(
                    new yy.Lit(', +' + str1, ch[3].lineno),
                    end,
                    new yy.Lit(str2 + ' + 1 || 9e9', end.lineno)
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

})

yy.ObjectConstructorNode = Class(yy.Node, {

    type: 'ObjectConstructorNode',

    initNode: function() {
        this.base('initNode', arguments);
        var qn,
        ch = this.children,
        constr = ch[2],
        prefix = 'new ',
        className = ch[1] ? ch[1].children : null;

        if (constr) {
            if (constr.keyed) {
                if (className) {
                    prefix = this.runtimeFn('newByConf');
                    ch.splice(2, 0, new yy.Lit(',', ch[2].children[0].lineno))
                    ch.push(3, 0,   new yy.Lit(')', ch[3].children[2].lineno))
                }
                else {
                    prefix = '';
                }
            }
            else {
                if (!className) {
                    ch[1] = new yy.Lit(this.runtimePrefix + 'Object', ch[0].lineno);
                }
            }
        }
        else {
            qn = ch[1];
            ch.push(new yy.Lit('()', qn.children[qn.children.length - 1].lineno))
        }

        if (!className) {
            //ch[1] = new yy.Lit(this.runtimePrefix + 'Object', ch[0].lineno);
        }

        ch[0] = new yy.Lit(prefix, ch[0].lineno);

        if (className) {
            if (className instanceof Array) {
                className = className[0].children;
            }
            //this.yy.env.addUsedVar(className);
        }
    }

})

yy.ObjectConstructorArgsNode = Class(yy.Node, {

    type: 'ObjectConstructorArgsNode',

    initNode: function() {
        var ch = this.children;

        this.checkKeyNames(ch[1]);

        if (ch[3] || !ch[1]) { // keyed
            ch[0].children = '{';
            ch[2].children = '}';

            this.keyed = true;
        }
        else {
            ch[0].children = '(';
            ch[2].children = ')';
        }

    },

    checkKeyNames: function(ch) {
        if (!ch) { return }
        var
        elements = ch.children,
        names = {}, i = 0, name,
        len = elements.length;

        for (; i < len; i++) {
            if (!(elements[i] instanceof yy.Lit)){
                if (!(elements[i].children[0] instanceof yy.Str)) {
                    name = elements[i].children[0].children;
                    if (names[name] === true) {
                        this.error('Can not repeat object key "' + name + '"', elements[i].children[0].lineno);
                    }
                    names[name] = true;
                }
            }
        }
    }
})

yy.TypeAssertNode = Class(yy.Node, {

    type: 'TypeAssertNode',

    initNode: function() {
        this.base('initNode', arguments);

        var
        ch = this.children,
        typ = ch[3] || new yy.Lit(this.runtimePrefix + 'Undefined', ch[4].lineno);

        this.children = [
            new yy.Lit(this.runtimeFn('assertType'), ch[0].lineno),
            ch[0],
            new yy.Lit(', ', ch[1].lineno),
            typ,
            new yy.Lit(')', ch[4].lineno),
        ];
    }
})

yy.AssignmentNode = Class(yy.Node, {

    type: 'AssignmentNode',

    rUpper: /^[A-Z]+$/,

    initNode: function() {
        this.base('initNode', arguments);
        var
        ch = this.children;
        //console.log('init assign')
        //if (ch[0] instanceof yy.VarNode && !this.yy.env.context().isVarDeclared(ch[0].name)) {
        if (ch[0] instanceof yy.VarNode) {
            ch[0].markAsUsedVar();
        }
    }
})

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

})

yy.Str = yy.StringNode = Class(yy.Lit, {

    type: 'Str, StringNode',

    initNode: function() {
        this.base('initNode', arguments);
        var
        i        = 0,
        lineno   = this.lineno,
        splitted = this.children.split(/\r\n|\n/),
        len      = splitted.length;

        for (; i < len - 1; i++) {
            splitted[i] = new yy.Lit(splitted[i].replace(/^\s+/, '') + '\\', lineno);
            lineno++;
        }
        splitted[i] = new yy.Lit(splitted[i].replace(/^\s+/, ''), lineno);

        this.children = splitted;
    }

})

yy.UseNode = Class(yy.Node, {

    type: 'UseNode',

    rAlias: /([\w\-]+)*(?:\.[\w\-]+)*$/,

    rCapitalLetter: /^[A-Z]/,

    rClearName: /[^\w]/,

    initNode: function() {
        this.base('initNode', arguments);

        var
        parsed, route, path,
        ch     = this.children,
        target = ch[1],
        alias  = ch[2] ? ch[2].children : false,
        suffix = '';

        route = target.children.substring(1, target.children.length - 1); // trim quotes

        route = this.yy.generateRoute(route);

        if (! alias) {
            parsed = this.rAlias.exec(route);
            alias  = parsed[1] || '';
        }

        alias = alias.replace(this.rClearName, '_');

        if (this.rCapitalLetter.test(alias)) {
            suffix = '.' + alias;
        }

        ch[0].children = 'require(';

        if (alias) {
            if (! ch[2]) {
                ch[2] = new yy.Lit(alias, ch[0].lineno)
                ch[2].loc = ch[0].loc
            }
            ch[2].children += ' = ';
            this.yy.env.context().addLocalVar(alias);
        }

        ch[1].children = "'" + (path || route) + "'";
        this.children  = [
            ch[2],
            ch[0],
            ch[1],
            new yy.Lit(')' + suffix, ch[1].lineno),
        ];
    }
})

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
})

yy.ClassNode = Class(yy.ContextAwareNode, {

    type: 'ClassNode',

    className: null,

    superClassNames: null,

    initNode: function() {
        this.base('initNode', arguments);
        var
        ch              = this.children,
        cname           = ch[1].children,
        stub            = '(){this.$init.apply(this, arguments)}; ' + cname + '.$classBody = function ' + cname + '()',
        superClassNames = this.getSuperClassNames();

        this.check(ch[3]);

        this.children = [
            new yy.Lit('function ', ch[0].lineno),
            ch[1],
            new yy.Lit(stub, ch[1].lineno),
            ch[3],
        ];

        this.className = cname;
        this.superClassNames = superClassNames;

        this.yy.env.registerClass(this);
    },

    getSuperClassNames: function() {
        if (! this.children[2]) {
            return [];
        }
        var
        str,
        node = this.children[2].children[1],
        ch   = node.children;

        str = stringifyNode(node);

        return str.split(',');
    },

    check: function(block) {
        var
        members = block.children[1] ? block.children[1].children : [],
        set, i = 0, properties = [],
        names = {}, member, methodFound = false;

        for (; i < members.length; i++) {
            member = members[i];
            if (hasProp.call(names, member.name)) {
                this.error('Can not redeclare the class member "' + member.name + '"', member.nameLineno);
            }
            if (member instanceof yy.MethodNode) {
                methodFound = true;
            }
            else if (methodFound === true) {
                this.error('Properties declaration goes before methods declaration "' + member.name + '"', member.nameLineno);
            }
            else {
                properties.push(members.splice(i, 1)[0]);
                i--;
            }
            names[member.name] = true;
        }

        if (properties.length > 0) {
            set = new yy.PropertySetNode(properties, this.context);
            set.parent = this;
            block.children.splice(1, 0, set);
        }
    },

    compile: function() {
        this.base('compile', arguments);
    }

})


yy.PropertySetNode = Class(yy.Node, {

    type: 'PropertySetNode',

    context: null,

    init: function(ch, ctx) {
        yy.Node.prototype.init.apply(this, ch);
        this.context = ctx;
    },

    initNode: function() {
        this.base('initNode', arguments);
        var
        ch = this.children;
        if (ch[0]) {
            ch.push(new yy.Lit(' };', ch[ch.length - 1].lineno));
        }
    },

    compile: function() {
        var
        ch     = this.children,
        lineno = this.parent.children[2].lineno,
        str, names = [], i = 0, len = this.children.length;

        for (; i < len; i++) {
            if (!(this.children[i] instanceof yy.Lit)) {
                names.push(this.children[i].name);
                this.context.ignoreVar(this.children[i].name);
            }
        }

        str = 'this.$setup = function setup(' + names.join(', ') + '){'

        ch.splice(0, 0, new yy.Lit(str, lineno));
        ch.splice(1, 0, new yy.Lit(this.context.compileVars(), ch[0].lineno));
    }

})


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
        ch  = this.children,
        str;

        ch[0].children = 'this.' + this.name;
        str = ' = ' + this.name;
        if (this.hasDefaultValue) {
            str += ' === undefined ? ';
            ch.splice(3, 0, new yy.Lit(': ' + this.name, ch[2].lineno))
        }

        ch[1].children = str;
    }
})


yy.MethodNode = Class(yy.Node, {

    type: 'MethodNode',

    name: null,

    nameLineno: null,

    initNode: function() {
        this.base('initNode', arguments);
        var
        ch   = this.children,
        name = ch[0].name;

        this.name = name;
        this.nameLineno = this.children[0].children[1].lineno;

        ch[0].children[0].children = 'this.' + name + ' = function ';
        ch[0].context.addLocalVar('me', 'this');
    }
})

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
            if (len === 1) {
                stub   = '.prototype.' + methodName + '.apply(me, arguments';
                lineno = ls.children[0].lineno;
            }
            else if (len > 1) {
                stub   = '.prototype.' + methodName + '.call(me, ';
                lineno = ls.children[len - 1].lineno;
            }

            ls.children.splice(1, 1, new yy.Lit(stub, lineno));
        }

    }

})

yy.IfNode = Class(yy.Node, {

    type: 'IfNode',

    initNode: function() {
        this.base('initNode', arguments);
        var
        ch = this.children;

        ch.splice(1, 0, new yy.Lit('(', ch[0].lineno));
        ch.splice(3, 0, new yy.Lit(') ', ch[2].lineno));
    }

})

yy.ElseNode = Class(yy.Node, {

    type: 'ElseNode',

    initNode: function() {
        this.base('initNode', arguments);
        var
        ch = this.children;

        // else if
        if (ch.length === 2) {
            ch.splice(1, 0, new yy.Lit(' ', ch[0].lineno));
        }

    }

})


yy.SwitchNode = Class(yy.Node, {
    
    type: 'SwitchNode',

    initNode: function() {
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

})

yy.CaseNode = Class(yy.Node, {

    type: 'CaseNode',

    compile: function() {
        this.base('compile', arguments);
        var
        ch = this.children, ls;

        this.handleFallThrough(ch[1]);


        if (ch[3]) { //if is not "default"
            ls = ch[3].children[0].children;
            ls.push(new yy.Lit(' break; ', ls[ls.length - 1].lineno))
        }
    },

    handleFallThrough: function(exprList) {
        var
        i = 0,
        ls = exprList.children,
        len = ls.length;

        for (; i < len; i++) {
            if (ls[i].children === ',') {
                ls[i].children = ': case ';
            }
        }
    }

})

yy.ForNode = Class(yy.Node, {

    type: 'ForNode',

    initNode: function() {
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

})


// God save me.
yy.ForInNode = Class(yy.Node, {

    type: 'ForInNode',

    initNode: function() {
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
            ch[4].children.splice(1, 0, new yy.Lit(str3, ch[4].children[0].lineno))

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
            ch[4].children.splice(1, 0, new yy.Lit(str3, ch[4].children[0].lineno))
        }
    }

})

yy.TryNode = Class(yy.Node, {

    type: 'TryNode',

    compile: function() {
        var
        ch = this.children;

        if (!ch[2]) {
            this.children.push(new yy.Lit('catch($error){}', this.lineno))
        }
    }

})

yy.CatchNode = Class(yy.Node, {

    type: 'CatchNode',

    compile: function() {
        var
        ch = this.children;

        if (ch[1]) {
            ch[1].children = '(' + ch[1].children + ') ';
        }
    }

})


}).call(this);
