(function(){ typeof cor === 'undefined' && (cor = {});

var
INDENT = '    ',
Class   = cor.Class,
hasProp = Object.prototype.hasOwnProperty;

/*
# A library to make CLI apps

## Classes

* cor.Cli
* cor.CliCommand
* cor.CliCommandInput

## Usage Example

\#\!/usr/bin/env node
require('../src/cli.js');

// create the app;
cli = new cor.CliApp();

// setup name and descriptions
// the name of the app must coincide with the name of the file
// for documentation purpose
cli.setup('power', 'Allows to shutdown or restart the computer')

cmd = cli.newCommand('shutdown', 'Shutdown the computer')
cmd.addArgument('message', 'Specify the message to show before to shutdown')
cmd.addOption('time', 'the time in seconds before to shutdown')
cmd.setAction(function(input, app){
    app.print(input.getArgument('message') + '\n')
	app.print('The machine will shutdown in ' + (input.getOption('time') || 0) + ' secs')
})

cmd = cli.newCommand('restart', 'Allows you to restar the computer')
cmd.setAction(function(input, app){
    //code here
});

cli.run();

//now you can use it from CLI
> power shutdown "Im going home now" -time=5
Im going home now
The machine will shutdown in 5 secs
> power restart

// to see help of the commands
> mycli help
> mycli help copy
> mycli help cmdx


NOTICE: all descriptions are automatically capitalized
*/

/*
CliApp is the base class to make a CLI application, it stores executable commands.
Once the application is running chooses and executes the command after parse argv
*/
var
CliApp = Class({

    // the name of the app
    // must coincide with the name of the file
    // that boots the cli app
    name: '',


    // description of the app
    description: '',


    // the name of the default command
    // by default is first command added wich is "help" command
    defaultCommandName: null,


    // hash containing the commands mapped by its names
    commands: null,

    helpTopics: null,

    argv: null,

    // holds the position while iterating "argv"
    argvLoc: 0,

    // stores last error message
    _error: null,

    init: function(argv) {
        this.commands   = {};
        this.helpTopics = {};
        setHelpCommand(this);
    },

    /*
    setup the name and the description of the app
    very important for documentation and correct
    working of the library
    */
    setup: function(name, desc) {
        this.name        = name || '';
        this.description = normalizeSpaces(capitalize(desc || ''));
        this.argv        = process.argv.slice(2);
    },

    print: function(msg) {
        console.log(msg);
    },

    setDefaultCommandName: function(name) {
        this.defaultCommandName = name;
    },

    getDefaultCommandName: function() {
        return this.defaultCommandName;
    },

    addHelpTopic: function(helpTopic) {
        this.helpTopics[helpTopic.name] = helpTopic;
    },

    getHelpTopic: function(name) {
        return this.helpTopics[name];
    },

    /*
    adds a command to the store
    and register it
    */
    addCommand: function(command) {
        if (command instanceof CliCommand) {
            command.app = this;
            if (hasProp.call(this.commands, command.name)) {
                return this.error('Command "' + command.name + '" is already setted');
            }
            this.commands[command.name] = command;
            if (! this.defaultCommandName) {
                this.setDefaultCommandName(command.name);
            }
        }
        else {
            throw new Error('Trying to add an invalid command');
        }
    },

    getCommand: function(name) {
        return this.commands[name];
    },

    /*
    a factory method which creates an instance of
    cor.CliCommand and automatically register it
    using setCommand method
    */
    newCommand: function(name, desc) {
        var
        command = new CliCommand(name, desc);
        this.addCommand(command);
        return command;
    },

    /*
    a factory method which creates an instance of
    cor.CliHelpTopic and automatically register it
    using setCommand method
    */
    newHelpTopic: function(name, desc) {
        var topic = new CliHelpTopic(name, desc);
        this.addHelpTopic(topic);
        return topic;
    },

    /*
    parses "argv" taking as rules the commands
    added before
    */
    parse: function() {
        var i,
        cmdArg, cmdArgs, cmdArgsLen,
        arg, option, command, helpHint,
        rIsOption   = /^\-/,
        commandName = this.nextArg(),
        cliInput    = new CliCommandInput();

        if (commandName) {
            // is a valid command ?
            if (hasProp.call(this.commands, commandName)) {
                command = this.commands[commandName];
            }
            else {
                return this.error('No command to execute. Run "' + this.name + ' help".');
            }
        }
        else
        // let's see if there is a default command setted
        if (!command && hasProp.call(this.commands, this.defaultCommandName)){
            command = this.commands[this.defaultCommandName];
            // reset argv iterator
            this.argvLoc = 0;
        }
        else {
            return this.error('No command to execute. Run "' + this.name + ' help".');
        }

        cliInput.command = command;
        helpHint = ". Run '" + this.name + ' help ' + commandName + "'.";

        // loop over arguments of the choosen command
        for (cmdArgs = command.arguments, cmdArgsLen = cmdArgs.length, i = 0; i < cmdArgsLen; i++) {
            cmdArg = cmdArgs[i];
            arg  = this.nextArg();
            // does this arguments looks like an option?
            if (arg && !rIsOption.test(arg)) {
                // is this arguments an array?
                if (cmdArg.isArray) {
                    // if initialized as array
                    if (cliInput.arguments[cmdArg.name] instanceof Array) {
                        // push a new item to the arguments list
                        cliInput.arguments[cmdArg.name].push(arg);
                    }
                    // if is not initialized as array just make it
                    else {
                        cliInput.arguments[cmdArg.name] = [arg];
                    }
                    // arguments iteration step back
                    i--;
                }
                else {
                    // just store the arg
                    cliInput.arguments[cmdArg.name] = arg;
                }
            }
            // is the argument marked as required and argv does provides nothing fot it?
            if (cmdArg.required && typeof cliInput.arguments[cmdArg.name] === 'undefined') {
                return this.error("Argument '" + cmdArg.name + "' is required" + helpHint);
            }
        }

        // this argument is an option ?
        if (!rIsOption.test(arg)) {
            arg = this.nextArg();
        }

        // extract all options
        while (arg) {
            option = this.parseOption(arg);
            if (option) {
                // does this command has an option named x ?
                if (hasProp.call(command.options, option[0])) {
                    cliInput.options[option[0]] = option[1];
                }
                else {
                    // stop here, because this command has not this option defined
                    return this.error("Unknown option '" + option[0] + "' for '" + command.name + "' command" + helpHint);
                }
            }
            else {
                // stop here
                // all values has to be options
                return this.error("Error in '" + arg + "'" + helpHint);
            }
            arg = this.nextArg();
        }
        return cliInput;
    },

    // iterates through argv variable
    nextArg: function() {
        var arg = this.argv[this.argvLoc];
        this.argvLoc++;
        return arg;
    },

    /*
    Parses an option and return an array
    where array[0] has the name of the option
    and array[1] has the value. If the option can not be parsed
    it will return false

    parseOption("-opt")     //returns  ["opt", true]
    parseOption("-opt=val") //returns  ["opt", "val"]
    */
    parseOption: function(v) {
        var
        rOption = /^\-([a-z]+)(=(.+))*$/,
        parsed  = rOption.exec(v);

        if (parsed) {
            return [parsed[1], parsed[3] || true];
        }

        return false;
    },

    error: function(e) {
        this._error = e;
    },

    /*
    Runs the application
    */
    run: function () {
        var
        action,
        input = this.parse();

        if (input) {
            action = input.command._action;
            typeof action === 'function' && action(input, this);
        }
        else {
            this.print(this._error);
        }
    },

    getCommandsNamesMaxLength: function() {
        var name, max = 0;
        for (name in this.commands) {
            if (hasProp.call(this.commands, name)) {
                max = Math.max(max, name.length);
            }
        }
        return max;
    },

    getHelpTopicsNamesMaxLength: function() {
        var name, max = 0;
        for (name in this.helpTopics) {
            if (hasProp.call(this.helpTopics, name)) {
                max = Math.max(max, name.length);
            }
        }
        return max;
    },

    /*
    Returns the documentation of the application
    used when run help command
    */
    getDoc: function() {
        var
        name,
        namesMaxLength = Math.max(this.getCommandsNamesMaxLength(), this.getHelpTopicsNamesMaxLength()),
        thereIsTopics  = false;
        ret = '',
        doc = '';

        doc += this.description + '\n\n';
        doc += 'Usage:\n\n' + INDENT + this.name + ' command [arguments]\n\n';
        doc += 'The commands are:\n\n';

        for (name in this.commands) {
            if (hasProp.call(this.commands, name) && !this.commands[name].hidden) {
                doc += INDENT + rightPath(name, namesMaxLength) + ' ';
                doc += this.commands[name].description + '\n';
            }
        }

        doc += '\nUse "' + this.name + ' help [command]" for more information about a command.';

        ret = doc;
        doc = '';

        doc += '\n\nAdditional help topics:\n\n';
        for (name in this.helpTopics) {
            if (hasProp.call(this.helpTopics, name)) {
                thereIsTopics = true;
                doc += INDENT + rightPath(name, namesMaxLength) + ' ';
                doc += this.helpTopics[name].description + '\n';
            }
        }

        doc += '\nUse "' + this.name + ' help [topic]" for more information about that topic.';

        if (thereIsTopics) {
            ret += doc;
        }

        return ret;
    }

});


/*
CliCommand objects stores arguments and options definition and documentation

Usage:

cmd = new cor.CliCommand('copy', 'It copies files to destination')
cmd.addArgument('file', 'file to copy', true)
cmd.addArgument('to', 'destination', true)
cmd.addOption('f', 'it forces the copy even if an error occurs')

app.addCommand(cmd)

*/
var
CliCommand = Class({

    app: null,

    // stores the name of the command
    name: '',

    // stores the description of the command
    description: null,

    // stores the help documentation to be displayed whith "help command"
    help: null,

    // stores the arguments
    arguments: null,

    // stores the options, e.g: -force -env=dev
    options: null,

    lastArgumentIsArray: false,

    // defines whether the command documentation
    // appears when help command is executed
    hidden: false,

    _action: null,

    init: function(name, desc) {
        this.name        = name;
        this.description = normalizeSpaces(capitalize(desc || ''));
        this.arguments   = [];
        this.options     = {};
        this.help        = '';
    },

    setHidden: function(h) {
        this.hidden = true;
    },

    setHelp: function(txt) {
        this.help = capitalize(txt || '');
    },

    getHelp: function() {
        return this.help;
    },

    /*
    adds a new argument to the command

    Params:
    name             The name of the arguments
    description      The documentation of the argument
    required Boolean Whether the arguments is required or not
    isArray  Boolean Whether the arguments is an array or not

    Once an arguments is marked as array, can not be added another argument after it

    app = new cor.CliApp('tool')
    cmd = app.newCommand('concat')
    cmd.addArgument('files', '...', true, true) // required = true, isArray = true
    cmd.setAction(function(input, app){
        app.print(input.getArgument('files'))
    })

    > tool concat data.txt
    ["data.txt"]
    > tool concat data.txt dato.txt
    ["data.txt", "dato.txt"]

    */
    addArgument: function(name, desc, required, isArray) {
        if (this.lastArgumentIsArray) {
            throw "Can not add more arguments after '" +
                  this.arguments[this.arguments.length - 1].name +
                  "' because it is an array";
        }

        this.arguments.push({
            name        : name,
            required    : !!required,
            description : normalizeSpaces(capitalize(desc || '')),
            isArray     : !!isArray
        });

        if (isArray) {
            this.lastArgumentIsArray = true;
        }
    },

    /*
    Adds an option to a command. The command options are spected to be used as follows:
    -optname=value for common key value pair
    -optname       for boolean options

    cmd.addOption('force')
    cmd.addOption('format')
    cmd.setAction(function(input, app) {
        if (input.getOption('force')) {
            app.print('forcing...')
        }

        var format = input.getOption('format')
        if (format) {
            app.print('formatting to ' + format)
        }
    })

    > tool concat data.txt -force
    forcing...
    > tool concat data.txt -format=zip
    formatting to zip
    */
    addOption: function(name, desc) {
        this.options[name] = {
            name        : name,
            description : normalizeSpaces(capitalize(desc || ''))
        };
    },

    /*
    Sets the command action, this method take a function(the action) as a parameter
    to execute once the app matches argv whith the given configuration

    during the the execution of the action, two arguments are passed. The first is
    an instance of CliCommandInput which contains the data gathered taking argv by
    CliApp.parse method. The second is the instance of CliApp where the
    command belongs to.
    */
    setAction: function(rnnr) {
        this._action = rnnr;
    },

    getArgumentsNamesMaxLength: function() {
        var i,
        max = 0,
        len = this.arguments.length;
        for (i = 0; i < len; i++) {
            max = Math.max(max, this.arguments[i].name.length);
        }
        return max;
    },

    getOptionsNamesMaxLength: function() {
        var name, max = 0;
        for (name in this.options) {
            if (hasProp.call(this.options, name)) {
                max = Math.max(max, name.length);
            }
        }
        return max;
    },

    /*
    Returns a command documentation. Used when help command run
    */
    getDoc: function() {
        var i, len, name, arg,
        doc            = '',
        optsDoc        = '',
        argsDoc        = '',
        argsUsage      = '',
        hasOptions     = false,
        cmdName        = (this.app.name ? this.app.name + ' ' : '') + this.name,
        namesMaxLength = Math.max(this.getOptionsNamesMaxLength(), this.getArgumentsNamesMaxLength());

        // build the docs of the arguments
        for (i = 0, len = this.arguments.length; i < len; i++) {
            arg = this.arguments[i];
            argsDoc   += INDENT + rightPath(arg.name, namesMaxLength) + ' ' + arg.description + '\n';
            argsUsage += (arg.required ? '<' + arg.name + '>' : '[' + arg.name + ']') + (arg.isArray ? '... ' : ' ');
        }

        // build the docs of the options
        for (name in this.options) {
            if (hasProp.call(this.options, name)) {
                hasOptions = true;
                optsDoc += INDENT + '-' + rightPath(name, namesMaxLength - 1) + ' ';
                optsDoc += this.options[name].description + '\n';
            }
        }

        // put all together
        // add usage and description
        doc += 'Usage:  ' + cmdName + ' ' + argsUsage + '[' + this.name + ' options' + ']\n\n';

        if (this.description) {
            doc += this.description;
        }

        if (this.help) {
            doc += this.help;
        }

        if (argsDoc) {
            doc += '\n\nThe arguments are:\n\n';

            // add arguments docs
            doc += argsDoc + '\n';
        }

        // add options docs
        if (hasOptions) {
            doc += 'The ' + this.name + ' options are: \n\n';
            doc += optsDoc;
        }

        return doc;
    }
});


/*
CliCommandInput holds the data parsed for CliApp
*/
var
CliCommandInput = Class({

    command: null,

    arguments: null,

    options: null,

    error: null,

    init: function() {
        this.arguments = {};
        this.options   = {};
    },

    // returns an argument value
    getArgument: function(name) {
        return this.arguments[name];
    },

    // returns an option value
    getOption: function(name) {
        return this.options[name];
    }
});

var
CliHelpTopic = Class({

    name: null,

    description: null,

    help: null,

    init: function(name, desc) {
        this.name        = name || '';
        this.description = normalizeSpaces(capitalize(desc || ''));
        this.help        = '';
    },

    setHelp: function(txt) {
        this.help = normalizeSpaces(capitalize(txt || ''));
    },

    getHelp: function() {
        return this.help;
    },

    getDoc: function() {
        return this.getHelp();
    }

});


cor.CliApp          = CliApp;
cor.CliCommand      = CliCommand;
cor.CliCommandInput = CliCommandInput;
cor.CliHelpTopic    = CliHelpTopic;


function normalizeSpaces(str) {
    return String(str).replace(/\s+/g, ' ');
}

function rightPath(str, max) {
    var ret = String(str);
    while (ret.length < max) {
        ret += ' ';
    }
    return ret;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.substr(1);
}


//the help command
function setHelpCommand(cli) {
    var
    hlp = cli.newCommand('help', 'Display help about the usage of available commands');
    hlp.addArgument('command', 'The name of the command to show the help');
    hlp.setAction(function(input, app){
        var
        doc, cmd,
        cmdName        = input.getArgument('command'),
        defaultCmdName = app.getDefaultCommandName();

        if (cmdName) {
            cmd = app.getCommand(cmdName) || app.getHelpTopic(cmdName);
        }
        else if (defaultCmdName) {
            if (defaultCmdName === 'help') {
                app.print(app.getDoc());
                return;
            }
            else {
                cmd = app.getCommand(defaultCmdName);
            }
        }

        if (cmd) {
            app.print(cmd.getDoc());
        }
        else {
            app.print('There is no help topic for "' + (cmdName || defaultCmdName) + '"');
        }
    });

    hlp.setHidden(true);
}

}).call(this);
