# Commands

Cor cli is available as a [Node.js](http://nodejs.org) utility, it allows you to compile and build sources. Commands are used as subcommands of Cor program, for instance `cor build`. Each command may have parameters and options, parameters are passed after the name of the command and options are specified using the following format: `-option=value` which must be specified after parameters. To know about usage, `help` command is there for you. Running `cor help` or just `cor` would show available commands, and `cor help [command]` will print usage of the specified `command`.


## Help
`help` command prints documentation about available commands. Is a tool to guide `cor` cli usage without to get out of the console.

Usage:
```
cor help [command]
```
Will shows available commands. Also prints usage and documentation about a specified command.

Example:
```
cor help build
```
Prints documentation about `cor build` command

```
cor help compile
```
Prints documentation about `cor compile` command


## Build

`build` command compiles packages and its dependencies, the resulting javascript code will be packed and written to a standalone `.js` file inside the specified package.

Usage:
```
cor build <path> [build options]
```

<table>
    <tbody>
        <tr><td colspan="2">Arguments:</td></tr>
        <tr>
            <td><code>path</code></td>
            <td>Specifies the path to the entry file or package to compile.</td>
        </tr>
        <tr><td colspan="2">Options:</td></tr>
        <tr>
            <td><code>-o</code></td>
            <td>Specifies the name of the file where the resulting javascript code will be written, if not specified the file name will be the base name of the entry file with <code>.js</code> suffix.</td>
        </tr>
        <tr>
            <td><code>-env</code></td>
            <td>Specifies the path to the <code>.json</code> file to use as environment configuration.</td>
        </tr>
        <tr>
            <td><code>-crl</code></td>
            <td>If used will embed CRL(Cor Runtime Library) in the head of the compiling result.</td>
        </tr>
        <tr>
            <td><code>-v</code></td>
            <td>If used will print additional information during building process.</td>
        </tr>
    </tbody>
</table>


Example:
```
cor build myapp
```
Builds `myapp` package and its dependencies and creates a file named `myapp.cor.js` inside `myapp` directory containing the resulting javascript code.

```
cor build myapp -crl -o=app.js
```
In this case the output file is named `app.js` and CRL will be embedded in the beginning of the file.


```
cor build myapp -env=myapp/env.json
```
Builds `myapp` package and tells compiler the environment file is located in `myapp/env.json`

## Compile

`compile` command compiles packages and put the result in the specified directory. Every file contained in the source package will be copied to the destination directory as they are, except `.cor` or any other file processed by the loader extensions. These files will be compiled and written to the file system as '.js'.

Usage:
```
cor compile <path> [compile options]
```

<table>
    <tbody>
        <tr><td colspan="2">Arguments:</td></tr>
        <tr>
            <td><code>path</code></td>
            <td>Specifies the path to the package to compile.</td>
        </tr>
        <tr><td colspan="2">Options:</td></tr>
        <tr>
            <td><code>-o</code></td>
            <td>Specifies the path to the directory where the compiled package will be written. The default name has the format: `compiled_{timestamp}`</td>
        </tr>
        <tr>
            <td><code>-v</code></td>
            <td>Specifies if print or not file names as they are compiled.</td>
        </tr>
    </tbody>
</table>


Example:
```
cor compile ./mylib
```
Compiles `mylib` package creates a directory named `mylib_js_` followed by a timestamp, here is where the compiled content will be written.

```
cor compile mylib -o=../delivery_dir/mylib
```
In this case the output directory is `../delivery_dir/mylib`


## Http

`http` command launch a simple http server using current directory (`cwd`) as the root. If a directory is requested it will list all files inside as a list of html links (`<a href=""></a>`). This server is for development purpose; do not use it in production.

Usage:
```
cor http [http options]
```

<table>
    <tbody>
        <tr><td colspan="2">Options:</td></tr>
        <tr>
            <td><code>-port</code></td>
            <td>Specifies the port where the server will listen requests. Default is `8080`</td>
        </tr>
    </tbody>
</table>


Example:
```
cor http
```
Launch an http server using `8080` port.

```
cor http -port=8790
```
Using `8790` port.

