%{
    yy.env.loc = yylloc;
%}

%%
[ \f\t\u00A0\u2028\u2029\uFEFF]+ /* skip whitespace */

"//".*                      %{
                                yy.env.addComment(
                                    new yy.SingleLineCommentNode(yytext, yylloc)
                                );
                            %}

// comments must begin and end with a new line
"---"([\s\S]*?)"---"

                            %{
                                var
                                strBefore, strAfter,
                                rBegin = /(\r\n|\n|^)\s*$/,
                                rEnd   = /^\s*(\r\n|\n|$)/;

                                strBefore = this.matched.substring(0, this.matched.length - yyleng);
                                strAfter  = this._input;
                                
                                if (! rBegin.test(strBefore)) {
                                    throw yy.parseError('comments must begin with a new line', {loc: {first_line: yylloc.first_line }}, true);
                                }

                                if (! rEnd.test(strAfter)) {
                                    throw yy.parseError('comments must end with a new line', {loc: {first_line: yylloc.last_line }}, true);
                                }

                                yy.env.addComment(
                                    new yy.MultiLineCommentNode(yytext, yylloc)
                                );
                            %}

"'"([^\\']|\\[\s\S])*"'"    return 'STRING'
(\r\n|\n)                   return 'EOL'
"use"                       return 'USE'
"class"                     %{ yy.env.newContext(); return 'CLASS' %}
"func"                      %{ yy.env.newContext(); return 'FUNC' %}
"me"                        return 'ME'
"nil"                       return 'NIL'
"return"                    return 'RETURN'
"if"                        return 'IF'
"else"                      return 'ELSE'
"for"                       return 'FOR'
"in"                        return 'IN'
"switch"                    return 'SWITCH'
"case"                      return 'CASE'
"default"                   return 'DEFAULT'
"continue"                  return 'CONTINUE'
"break"                     return 'BREAK'
true\b|false\b              return 'BOOLEAN'

"catch"                     return 'CATCH'

0x[\da-fA-F]+|^\d*\.?\d+(?:[eE][+-]?\d+)?\b   return 'NUMBER'
[\$_a-zA-Z\x7f-\uffff]+[\$\w\x7f-\uffff]*     return 'IDENT'

"{"                         return '{'
"}"                         return '}'
"("                         return '('
")"                         return ')'
"["                         return '['
"]"                         return ']'

"??"                        return 'COALESCEOP'

"*="|"/="|"%="|"+="|"-="|"<<="|">>="|">>>="|"&="|"^="|"|="  return 'ASSIGNMENTOP'
"<<"|">>"|">>>"             return 'SHIFTOP'
"<="|">="|"=="|"!="|"<"|">" return 'COMPARISONOP'
"&&"|"||"|"^"|"|"           return 'BINARYOP'
"++"|"--"                   return 'INCDECOP'

// this binary operator is separated form BINARYOP
// because is used for object literal construction
"&"                         return '&'

"="                         return '='
"@"                         return '@'
":"                         return ':'
","                         return ','
"."                         return '.'
";"                         return ';'
"!"                         return '!'
"~"                         return '~'
"+"                         return '+'
"-"                         return '-'
"*"                         return '*'
"/"                         return '/'
"%"                         return '%'
"?"							return '?'

.                           { yy.parseError('character ' + yytext + ' with code: ' + yytext.charCodeAt(0), {loc: yylloc}); }
$                           return 'EOF'

%%

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

    '&'       : true,
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
}
