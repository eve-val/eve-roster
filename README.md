# eve-roster

A corporation management tool for intergalactic spreadsheets.

## Setup

1. Install the "current" version of [Node.js](https://nodejs.org/en/).
2. Install [node-foreman](https://github.com/strongloop/node-foreman):  
`npm install -g foreman`
3. Install NPM packages:  
`$ cd <this dir>`  
`$ npm install`
4. Create your `.env` file and fill in missing values:  
`$ cp env.sample .env`
5. Initialize the database:  
`$ nf run node bin/updatedb.js`
8. Compile the server (see _Compiling the server_, below).
9. Start the server:  
`$ nf start`
9. Load up the site and log in. This account will be marked as the admin.
10. (optional) On the web UI, go to Admin > Setup and fill in/paste in config
details.

## Compiling the server

In order to run the server, you must first compile it. There are a few ways to
do this:

```bash
# Recompiles when code changes; recommended for development
$ npm run watch-server

# One-off build
$ npm run build-server

# Build both server and front-end. Used in production.
$ npm run build
```

If you're doing development, it's recommended that you use the
`npm run watch-server` option.

Whenever you change code on the _backend_, you'll need to kill the server and
run `nf start` again. This is not necessary when you make _frontend_ code
changes.

## Workflow

It is _highly_ recommended that you use an IDE with Typescript support.
[VS Code](https://code.visualstudio.com) in particular has excellent Typescript integration. Sublime Text also has a pretty good Typescript plugin.

VS Code can watch your files and recompile them automatically: Go to
`View > Command Palette > Tasks: Run Task` and select `build-server`.

Modifications to front-end code should appear without the need to reload the
current page. Modifications to back-end code require a server restart to take
effect.

`node-foreman` is used for running the server: `nf start` or running one-off
commands `nf run`.  It starts the Node process using the environment
variables defined in the .env file, which lets us match the production
environment as needed.

## Testing

Tests live in `/test/` and are executed using the
[Jest](https://facebook.github.io/jest/) framework.

Run all tests:
```
$ npm test
```

Run a specific test:
```
$ npm test -- test/path/to/my.test.js
```

There are a bunch of other
[CLI options](https://facebook.github.io/jest/docs/cli.html).

## Front-end development

The frontend is built on the [Vue framework](https://vuejs.org/). Their
documentation is excellent and worth the read.

Vue solves the same kinds of problems as Angular or React -- you've got some
data, and you need to render it on-screen. Vue does this via *components*, which
is what makes up most of the `src/client` folder (`*.vue`). A root component
takes in a big blob of data, breaks it up into chunks, renders some of it, and
hands the rest off to some sub-components.

Each component is defined in a `.vue` file. A `.vue` file has three parts:
HTML (template), JavaScript, and CSS. The HTML templates contain special
directives for rendering and binding data, including other components, and
listening for events. The
[template syntax documentation](https://vuejs.org/v2/guide/syntax.html) is
worth a skim. The structure of the JavaScript also relies heavily on the
[Vue API](https://vuejs.org/v2/guide/instance.html). The CSS is just CSS.

## Deployment

You must be one of the authorized dokku users on the linode instance to deploy.
This means your ssh key is in dokku's authorized_keys list.  If you want to
manage dokku itself, you must also be a sudoer on the linode instance.

You must also add the git remote for the Dokku instance you want to deploy to,
e.g. `git remote add staging dokku@pepperoni.of-sound-mind.com:roster-staging`

Make sure your local repository has what you want to push, e.g. no local changes
and up to date with `7sempra/master`.

If you have added code that uses new environment variables, make sure those are
set before deploying.  Use `dokku config <app>` and
`dokku config:set <app> VAR=value` to inspect and set new environment variables.

Push your changes to the Dokku remote: `git push staging master`

Wait for the dokku output to complete, then check the app at the production URL.
