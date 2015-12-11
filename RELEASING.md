# Making a new relase

    This document is for Cor developers and contributors.

## Before each release

* Ensure master passes tests
* Bump version in `package.json`. Any breaking change or new feature should bump minor (or even major). Non-breaking changes or fixes can just bump patch.
* Update docs (`./docs/*.md`) manually.
* Run `make` command in Cor project directory.

### Fine grained

* Commit.
* `$ git tag <version>` (see `git tag -l` for latest)
* `$ git push origin master --tags`
* `$ npm publish .`

### Coarse grained

    It should be used in case CICD server is no configured to do so

* Create a new branch with the version name `git checkout -b <version>`
* Run `make release`
* if every thing is ok, the you can savely delete version branch
    `git branch -D v<version>`


### Asisted by CICD servers

    Make sure the CICD server authenticates automatically in GitHub and NPM

* Create a new branch with the version name `git checkout -b <version>`
* `git push origin <version>`

    The CICD server should be able to execute `make release` command which publish the new version in NPM and will make a new tag named v<version>, eg. v1.3.0
* if every thing is ok, the you can savely delete version branch
    `git branch -D v<version>`

