# Making a new relase

    This document is for Cor developers and contributors.
    
* Ensure master passes tests
* Bump version in `package.json` and keep version in sync with `./src/cor.js`. Any breaking change or new feature should bump minor (or even major). Non-breaking changes or fixes can just bump patch.
* Update docs (`.md`) manually.
* Run `make` command in Cor project directory.
* Commit.
* `$ git tag <version>` (see `git tag -l` for latest)
* `$ git push origin master --tags`
* `$ npm publish .`
