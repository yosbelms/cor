%nonassoc IDENT
%nonassoc ',' IN


%start Module

%ebnf
%%

Module
    : Source EOF { return new yy.ModuleNode($1) }
    ;

Source
    : GlobalStmt Source {
            if ($2 instanceof yy.List)   {
                $2.addFront($1)
                $$= $2
            }
            else if ($2){
                $$= new yy.List($1, $2)
            }
            else {
                $$= new yy.List($1)
            }
        }
    | GlobalStmtNoSemicolon {
            if ($$ instanceof yy.List) {
                $$.add($1)
            }
            else {
                $$ = new yy.List($1)
            }
        }
    //empty
    |                       { $$= new yy.List() }
    ;

/* Global Statements */

ClassStmt
    : CLASS IDENT ExtendsStmt? ClassBlock {
            $$= new yy.ClassNode(
                new yy.Lit($1, @1),
                new yy.Lit($2, @2),
                $3, $4
            )
        }
    ;

ExtendsStmt
    : ':' QualifiedIdent { $$= new yy.Node(new yy.Lit($1, @1), $2) }
    ;

ClassBlock
    : '{' MemberList '}'     { $$= new yy.Node(new yy.Lit($1, @1), $2, new yy.Lit($3, @3)) }
    ;

MemberList
    : Member MemberList      {
            if ($2 instanceof yy.List) {
                $2.addFront($1)
                $$= $2
            }
            else if ($2) {
                $$= new yy.List($1, $2)
            }
            else {
                $$= new yy.List($1)
            }
        }
    | MemberNotSemicolon     { $$= new yy.List($1) }
    |
    ;

Member
    : PropertyDecl ';'       { $1.children.push(new yy.Lit(';', @2)); $$=$1 }
    | FunctionStmt ';'       { $$= new yy.MethodNode($1, new yy.Lit(';', @2)) }
    | ';'                    { $$= new yy.Lit(';', @1)}
    ;

MemberNotSemicolon
    : PropertyDecl
    | FunctionStmt           { $$= new yy.MethodNode($1) }
    ;

PropertyDecl
    : IDENT '=' Value        { $$= new yy.PropertyNode(new yy.Lit($1, @1), new yy.Lit($2, @2), $3) }
    | IDENT                  { $$= new yy.PropertyNode(new yy.Lit($1, @1)) }
    ;

FunctionStmt
    : FUNC IDENT? '(' FunctionArgs? ')' (Block|Value) {
            $$= new yy.FunctionNode(
                new yy.Lit($1, @1),
                new yy.Lit($2, @2),
                new yy.Lit($3, @3),
                $4,
                new yy.Lit($5, @5),
                $6
            )
        }
    ;

FunctionArgs
    : IDENT                  { $$= new yy.List(new yy.Lit($1, @1)) }
    | FunctionArgs ',' IDENT { $1.add(new yy.Lit($2, @2), new yy.Lit($3, @3)) }
    ;

Block
    : '{' StmtList '}' {
            $$= new yy.BlockNode(
                new yy.Lit($1, @1),
                $2,
                new yy.Lit($3, @3)
            )
        }
    ;

UseStmt
    : USE STRING IDENT?    { $$= new yy.UseNode(new yy.Str($1, @1), new yy.Lit($2, @2), $3 ? new yy.Lit($3, @3) : null) }
    ;

GlobalDeclarationStmt
    : QualifiedIdent '=' Value      { $$= new yy.AssignmentNode($1, new yy.Lit($2, @2), $3) }
    ;

GlobalStmt
    : FunctionStmt
    | ClassStmt
    | UseStmt ';'               { $1.children.push(new yy.Lit(';', @2)); $$ = $1 }
    | GlobalDeclarationStmt ';' { $1.children.push(new yy.Lit(';', @2)); $$ = $1 }
    | ';'                       { $$= new yy.Lit(';', @1) }
    ;

GlobalStmtNoSemicolon
    : UseStmt
    | GlobalDeclarationStmt
    ;

/* Not Global Statements */

StmtList
    : Stmt StmtList    {
            if ($2 instanceof yy.List)   {
                $2.addFront($1)
                $$= $2
            }
            else if ($2){
                $$= new yy.List($1, $2)
            }
            else {
                $$= new yy.List($1)
            }
        }
    | StmtNotSemicolon
    |
    ;

StrictStmtList
    : Stmt                              { $$= new yy.List($1) }
    | StrictStmtList Stmt               { $1.add($2) }
    ;

SimpleStmt
    : Expr ';'       { $$= new yy.SimpleStmtNode($1, new yy.Lit(';', @2)) }
    | IncDecStmt ';' { $$= new yy.SimpleStmtNode($1, new yy.Lit(';', @2)) }
    | ';'            { $$= new yy.Lit(';', @1) }
    ;

SimpleStmtNotSemicolon
    : Expr           { $$= new yy.SimpleStmtNode($1) }
    | IncDecStmt     { $$= new yy.SimpleStmtNode($1) }
    ;

IncDecStmt
    : OperationExpr INCDECOP  { $$= new yy.Node($1, new yy.Lit($2, @2)) }
    ;

IfStmt
    : IF OperationExpr Block ElseStmt? { $$= new yy.IfNode(new yy.Lit($1, @1), $2, $3, $4)}
    ;

ElseStmt
    : ELSE Block  { $$= new yy.Node(new yy.Lit($1, @1), $2) }
    | ELSE IfStmt { $$= new yy.Node(new yy.Lit($1, @1), $2) }
    ;

ForStmt
    : FOR ExprList? ';' OperationExpr? ';' SimpleStmtNotSemicolon? Block {
            $$= new yy.ForNode(
                new yy.Lit($1, @1), $2,
                new yy.Lit($3, @3), $4,
                new yy.Lit($5, @5), $6, $7
            )
        }
    | FOR Expr Block          { $$= new yy.ForNode(new yy.Lit($1, @1), $2, $3) }
    | FOR Block               { $$= new yy.ForNode(new yy.Lit($1, @1), $2) }
    ;

ForInStmt
    : FOR IDENT IN Value Block {
            $$= new yy.ForInNode(
                new yy.Lit($1, @1),
                new yy.VarNode(new yy.Lit($2, @2)),
                new yy.Lit($3, @3),
                $4, $5
            )
        }
    | FOR IDENT ',' IDENT IN Value Block {
            $$= new yy.ForInNode(
                new yy.Lit($1, @1),
                new yy.VarNode(new yy.Lit($2, @2)),
                new yy.Lit($3, @3),
                new yy.VarNode(new yy.Lit($4, @4)),
                new yy.Lit($5, @5),
                $6, $7
            )
        }
    ;

ForInRangeStmt
    : FOR IDENT IN Value ':' Value Block  {
            $$= new yy.ForInRangeNode(
                new yy.Lit($1, @1),
                new yy.VarNode(new yy.Lit($2, @2)),
                new yy.Lit($3, @3),
                $4,
                new yy.Lit($5, @5),
                $6, $7
            )
        }
    | FOR IDENT IN Value ':' Block {
            $$= new yy.ForInRangeNode(
                new yy.Lit($1, @1),
                new yy.VarNode(new yy.Lit($2, @2)),
                new yy.Lit($3, @3),
                $4,
                new yy.Lit($5, @5),
                null, $6
            )
        }
    | FOR IDENT IN ':' Value Block {
            $$= new yy.ForInRangeNode(
                new yy.Lit($1, @1),
                new yy.VarNode(new yy.Lit($2, @2)),
                new yy.Lit($3, @3),
                null,
                new yy.Lit($4, @4),
                $5, $6
            )
        }
    | FOR IDENT IN ':' Block {
            $$= new yy.ForInRangeNode(
                new yy.Lit($1, @1),
                new yy.VarNode(new yy.Lit($2, @2)),
                new yy.Lit($3, @3),
                null,
                new yy.Lit($4, @4),
                null, $5
            )
        }
    ;


SwitchStmt
    : SWITCH OperationExpr? CaseBlock       { $$= new yy.SwitchNode(new yy.Lit($1, @1), $2, $3) }
    ;

CaseBlock
    : '{' CaseStmtList '}'                  { $$= new yy.Node(new yy.Lit($1, @1), $2, new yy.Lit($3, @3)) }
    ;

CaseStmtList
    : CaseStmt                              { $$ = new yy.List($1) }
    | CaseStmtList CaseStmt                 { $1.add($2) }
    ;

CaseStmt
    : CASE ExprList ':' StrictStmtList      { $$= new yy.CaseNode(new yy.Lit($1, @1), $2, new yy.Lit($3, @3), $4) }
    | DEFAULT ':' StrictStmtList            { $$= new yy.CaseNode(new yy.Lit($1, @1), new yy.Lit($2, @2), $3) }
    ;

// Error management
CatchStmt
    : CATCH Expr Block                      { $$= new yy.CatchNode(new yy.Lit($1, @1), $2, $3) }
    ;

ReturnStmt
    : RETURN Value? ';'                     { $$= new yy.Node(new yy.Lit($1, @1), $2, new yy.Lit(';', @3)) }
    ;

ReturnStmtNotSemicolon
    : RETURN Value                          { $$= new yy.Node(new yy.Lit($1, @1), $2) }
    | RETURN                                { $$= new yy.Lit($1, @1) }
    ;

BreakStmt
    : BREAK ';'                             { $$= new yy.Node(new yy.Lit($1, @1), new yy.Lit(';', @2)) }
    ;

BreakStmtNotSemicolon
    : BREAK                                 { $$= new yy.Node(new yy.Lit($1, @1)) }
    ;

ContinueStmt
    : CONTINUE ';'                          { $$= new yy.Node(new yy.Lit($1, @1), new yy.Lit(';', @2)) }
    ;

ContinueStmtNotSemicolon
    : CONTINUE                              { $$= new yy.Node(new yy.Lit($1, @1)) }
    ;

Stmt
    : SimpleStmt
    | IfStmt
    | ForStmt
    | ForInStmt
    | ForInRangeStmt
    | SwitchStmt
    | ReturnStmt
    | BreakStmt
    | ContinueStmt
    | CatchStmt
    | FunctionStmt ';'
    ;

StmtNotSemicolon
    : SimpleStmtNotSemicolon
    | ReturnStmtNotSemicolon
    | BreakStmtNotSemicolon
    | ContinueStmtNotSemicolon
    | FunctionStmt
    ;


/* Expressions */

LeftHandExpr
    : IDENT                  { $$= new yy.VarNode(new yy.Lit($1, @1)) }
    | IndexExpr
    | SelectorExpr
    ;

PrimaryExpr
    : LeftHandExpr
    | ME                     { $$= new yy.MeNode($1, @1) }
    | STRING                 { $$= new yy.Str($1, @1) }
    | BOOLEAN                { $$= new yy.Lit($1, @1) }
    | NUMBER                 { $$= new yy.Lit($1, @1) }
    | NIL                    { $$= new yy.Lit($1, @1) }
    | '(' Value ')'          { $$= new yy.AssociationNode(new yy.Lit($1, @1), $2, new yy.Lit($3, @3)) }
    | SliceExpr
    | CallExpr
    | TypeAssertExpr
    | GoExpr
    ;

UnaryExpr
    : PrimaryExpr
    | '+' UnaryExpr  { $$= new yy.UnaryExprNode(new yy.Lit($1, @1), $2) }
    | '-' UnaryExpr  { $$= new yy.UnaryExprNode(new yy.Lit($1, @1), $2) }
    | '!' UnaryExpr  { $$= new yy.UnaryExprNode(new yy.Lit($1, @1), $2) }
    | '~' UnaryExpr  { $$= new yy.UnaryExprNode(new yy.Lit($1, @1), $2) }
    
    // pure existence
    | PrimaryExpr '?' { $$= new yy.ExistenceNode($1, new yy.Lit($2, @2)) }
    ;

OperationExprNotAdditive
    : UnaryExpr
    | OperationExprNotAdditive '*' UnaryExpr          { $$= new yy.Node($1, new yy.Lit($2, @2), $3) }
    | OperationExprNotAdditive '/' UnaryExpr          { $$= new yy.Node($1, new yy.Lit($2, @2), $3) }
    | OperationExprNotAdditive '%' UnaryExpr          { $$= new yy.Node($1, new yy.Lit($2, @2), $3) }
    | OperationExprNotAdditive SHIFTOP UnaryExpr      { $$= new yy.Node($1, new yy.Lit($2, @2), $3) }
    | OperationExprNotAdditive COMPARISONOP UnaryExpr { $$= new yy.Node($1, new yy.Lit($2, @2), $3) }
    | OperationExprNotAdditive BINARYOP UnaryExpr     { $$= new yy.Node($1, new yy.Lit($2, @2), $3) }
    | OperationExprNotAdditive '&' UnaryExpr          { $$= new yy.Node($1, new yy.Lit($2, @2), $3) }
    ;

OperationExpr
    : OperationExprNotAdditive
    | OperationExpr '+' OperationExprNotAdditive      { $$= new yy.Node($1, new yy.Lit($2, @2), $3) }
    | OperationExpr '-' OperationExprNotAdditive      { $$= new yy.Node($1, new yy.Lit($2, @2), $3) }
    ;

AssignmentExpr
    : LeftHandExpr ASSIGNMENTOP Value                 { $$= new yy.AssignmentNode($1, new yy.Lit($2, @2), $3) }
    | LeftHandExpr '=' Value                          { $$= new yy.AssignmentNode($1, new yy.Lit($2, @2), $3) }
    ;

CoalesceExpr
    : OperationExpr COALESCEOP Value                   { $$= new yy.CoalesceNode($1, new yy.Lit($2, @2), $3) }
    ;

ExprList
    : Expr              { $$= new yy.List($1) }
    | ExprList ',' Expr { $1.add(new yy.Lit($2, @2), $3) }
    ;

SliceExpr
    : PrimaryExpr '[' OperationExpr? ':' OperationExpr? ']' {
            $$= new yy.SliceNode(
                $1,
                new yy.Lit($2, @2),
                $3,
                new yy.Lit($4, @4),
                $5,
                new yy.Lit($6, @6)
            )
        }
    
    // slice if exists
    | PrimaryExpr '?' '[' OperationExpr? ':' OperationExpr? ']' {
            $$= new yy.ExistenceNode(
                new yy.SliceNode(
                    $1,                    
                    new yy.Lit($3, @3),
                    $4,
                    new yy.Lit($5, @5),
                    $6,
                    new yy.Lit($7, @7)
                )
            )
        }
    ;

CallExpr
    : PrimaryExpr '(' ValueList? ')'  { $$= new yy.CallNode($1, new yy.Lit($2, @2), $3, new yy.Lit($4, @4)) }
    
    // call if exists
    | PrimaryExpr '?' '(' ValueList? ')'  { $$= new yy.ExistenceNode(new yy.CallNode($1, new yy.Lit($3, @3), $4, new yy.Lit($5, @5))) }
    ;

SelectorExpr
    : PrimaryExpr '.' IDENT           { $$= new yy.Node($1, new yy.Lit($2, @2), new yy.Lit($3, @3)) }
    
    // reference if exists
    | PrimaryExpr '?' '.' IDENT       { $$= new yy.ExistenceNode(new yy.Node($1, new yy.Lit($3, @3), new yy.Lit($4, @4))) }
    ;

IndexExpr
    : PrimaryExpr '[' ']'             { $$= new yy.Node($1, new yy.Lit($2, @2), new yy.Lit($3, @3)) }
    | PrimaryExpr '[' PrimaryExpr ']' { $$= new yy.Node($1, new yy.Lit($2, @2), $3, new yy.Lit($4, @4)) }
    
    // reference if exists
    | PrimaryExpr '?' '[' ']'             { $$= new yy.ExistenceNode(new yy.Node($1, new yy.Lit($3, @3), new yy.Lit($4, @4))) }
    | PrimaryExpr '?' '[' PrimaryExpr ']' { $$= new yy.ExistenceNode(new yy.Node($1, new yy.Lit($3, @3), $4, new yy.Lit($5, @5))) }
    ;

TypeAssertExpr
    : PrimaryExpr '.' '(' PrimaryExpr? ')' {
            $$= new yy.TypeAssertNode(
                $1,
                new yy.Lit($2, @2),
                new yy.Lit($3, @3),
                $4,
                new yy.Lit($5, @5)
            )
        }
    ;

GoExpr
    : GO Block { $$= new yy.GoExprNode(new yy.Lit($1, @1), $2) }
    ;

Expr
    : OperationExpr
    | AssignmentExpr
    | CoalesceExpr
    ;

/* Values */

ObjectConstructor    
    : '&' QualifiedIdent? ObjectConstructorArgs  { $$= new yy.ObjectConstructorNode(new yy.Lit($1, @1), $2, $3) }
    | '&' QualifiedIdent                         { $$= new yy.ObjectConstructorNode(new yy.Lit($1, @1), $2) }
    ;

ObjectConstructorArgs
    : '[' ']'                                    { $$= new yy.ObjectConstructorArgsNode(new yy.Lit($1, @1), null, new yy.Lit($2, @2)) }
    | '[' SimpleElementList ']'                  { $$= new yy.ObjectConstructorArgsNode(new yy.Lit($1, @1), $2, new yy.Lit($3, @3)) }
    | '[' KeyValueElementList ']'                { $$= new yy.ObjectConstructorArgsNode(new yy.Lit($1, @1), $2, new yy.Lit($3, @3), true) }
    ;

QualifiedIdent
    : IDENT                                     { $$= new yy.List(new yy.Lit($1, @1)) }
    | QualifiedIdent '.' IDENT                  { $1.add(new yy.Lit($2, @2), new yy.Lit($3, @3)) }
    ;

KeyValueElementList
    : KeyedElement                              { $$= new yy.List($1) }
    | KeyedElement ',' KeyValueElementList?     {
            if ($3 instanceof yy.List)   {
                $3.addFront($1, new yy.Lit($2, @2))
                $$= $3
            }
            else if ($3){
                $$= new yy.List($1, new yy.Lit($2, @2), $3)
            }
        }
    ;

KeyedElement
    : IDENT ':' Value                           { $$= new yy.Node(new yy.Lit($1, @1), new yy.Lit($2, @2), $3) }
    | STRING ':' Value                          { $$= new yy.Node(new yy.Str($1, @1), new yy.Lit($2, @2), $3) }
    ;

SimpleElementList
    : Value                                     { $$= new yy.List($1) }
    | Value ',' SimpleElementList? {
            if ($3 instanceof yy.List) {
                $3.addFront($1, new yy.Lit($2, @2))
                $$= $3
            }
            else if ($3){
                $$= new yy.List($1, new yy.Lit($2, @2), $3)
            }
        }
    ;

ArrayConstructor
    : '[' ArrayItems? ']'                        { $$= new yy.Node(new yy.Lit($1, @1), $2, new yy.Lit($3, @3)) }
    ;

ArrayItems
    : Value                                      { $$= new yy.List($1) }
    | ArrayItems ',' Value?                      {
            if ($3 instanceof yy.List) {
                $3.addFront($1, new yy.Lit($2, @2))
                $$= $3
            }
            else if ($3) {
                $$= new yy.List($1, new yy.Lit($2, @2), $3)
            }

        }
    ;

Value
    : Expr
    | ObjectConstructor
    | ArrayConstructor
    | FunctionStmt
    ;

ValueList
    : Value                { $$= new yy.ValueList($1) }
    | ValueList ',' Value? { $1.add(new yy.Lit($2, @2), $3) }
    ;

%%