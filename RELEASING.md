# Making a new relase

> This document is for Cor developers and contributors.

## Before each release

* Ensure master passes tests
* Update CHANGELOG.md
* Bump version in `package.json`. Any breaking change or new feature should bump minor (or even major). Non-breaking changes or fixes can just bump patch.
* Update docs (`./docs/*.md`) manually.
* Run `make` command in Cor project directory.

### Releasing

*in the `master` branch*
* Commit.
* `$ git tag <version>` (see `git tag -l` for latest)
* `$ git push origin master --tags`
* `$ npm publish .`