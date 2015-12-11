# 0.1.0 intercept

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

# 0.0.2 autoatack

Shipping : 
* Compiler
* Loader
* Source-maps
* AST
* CRL
* Docs
* CLI tools