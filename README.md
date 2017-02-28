# eve-roster

## Setup

1. Install the latest version of [Node.js](https://nodejs.org/en/).
2. Install [node-foreman]() `npm install -g foreman`
3. `$ cd <this dir>`
4. `$ npm install`
5. `$ cp env.example .env`
6. Edit `.env` and fill in missing values
7. `$ nf run node bin/updatedb.js`
8. `$ nf start`
9. Load up the site and log in with at least one character
10. `$ cp setup.json.example setup.json`
11. Edit `setup.json` and fill in missing values
12. `$ nf run node bin/quicksetup.js import setup.json`

## Workflow

Modifications to front-end code should appear without the need to reload the
current page. Modifications to back-end code require a server restart to take
effect.

The recommended IDE is [VSCode](https://code.visualstudio.com), but you can use
whatever you like best.

`node-foreman` is used for running the server: `nf start` or running one-off
commands `nf run`.  It starts the Node process using the environment
variables defined in the .env file, which lets us match the production
environment as needed.

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
