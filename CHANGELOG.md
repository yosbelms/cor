# 0.2.1

* add test covering the changes
* fix bug, `super` no longer can be called from a class which does not inherits
* change the way `super` is used
* refactor the site
* improve performance in yy.MethodNode
* playground minor refactoring
* remove multiple inheritance in favor of single inheritance, see issues #2 and #4
    * refactor the parser grammar
    * add CRL.extends
    * remove CRL.defClass
* update docs

# 0.1.4 

* fix bug in the lexer (cor.l), it no longer recognize "(digit)(char)" as a valid identifier
* fix `bower.json` malformation
* add `make release` command
* update docs

# 0.1.0

* Remove -crl option in `build` command. Support CRL embedding by default and add -no-crl option
* Refactor CRL
    * Change `defineClass` to `defClass`
    * Menial refactoring
* Add a playground page to the docs
* Change '$' char by '__' in variable generation
* Class now compiles in a different way making it more compatible with ES5 prototypes 
* Restructured documentation, there is now a content table for the reference
    * Joined to one page, laguage reference and command reference
    * nav-bar element position is not `fixed` anymore
* Lot of bug fixing and AST refactoring
* Fix bug, in cor.l, it no longer recognizes {digit}{char}+ as a valid identifier
* '$' character can now be used in identifiers
* Clean code in http command, default port is now 9000
* Improved docs
* Moving the forum to http://ost.io/@yosbelms/cor
* Modified README.md

# 0.0.2

Shipping : 
* Compiler
* Loader
* Source-maps
* AST
* CRL
* Docs
* CLI tools