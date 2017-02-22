# eve-roster

## Setup

1. Install the latest version of [Node.js](https://nodejs.org/en/).
2. `$ cd <this dir>`
3. `$ npm install`
4. `$ cp config.local.json.example config.local.json`
5. Edit `config.local.json` and fill in missing values
6. `$ node bin/updatedb.js`
7. `$ npm start`
8. Load up the site and log in with at least one character
9. `$ node bin/quicksetup.js import config.local.json`

## Workflow

Modifications to front-end code should appear without the need to reload the
current page. Modifications to back-end code require a server restart to take
effect.

The recommended IDE is [VSCode](https://code.visualstudio.com), but you can use
whatever you like best.

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

TODO:  Remove `config.local.json` and replace with environment variables,
       node-foreman, and database records as appropriate.

You must be one of the authorized dokku users on the linode instance to deploy.
This means your ssh key is in dokku's authorized_keys list.  If you want to
manage dokku itself, you must also be a sudoer on the linode instance.

To deploy, you have to have the production `config.local.json` file.

Differences from a regular `config.local.json` file:
```json
{
  "dbFileName": "/eve-roster/storage/roster.sqlite",
  "logDir": "/eve-roster/storage/logs",
  "ssoClientId": "<production app client ID>",
  "ssoSecretKey": "<production app secret key>"
}
```

Make sure your local repository has what you want to push, e.g. no local changes
and up to date with `7sempra/master`.

You'll need to commit `config.local.json` before pushing to dokku. Here's a
handy script to do that automatically: 
``` bash
#!/bin/bash
print_usage() {
  echo "Usage: ./deploy.sh [staging|prod]"
  exit 1
}
ENVS=( prod staging )
if [[ $# -lt 1 ]]; then
  print_usage
fi
if ! [[ ${ENVS[*]} =~ "$1" ]]; then
  print_usage
fi
echo "Deploying to $1"
git add -f config.local.json
git commit -m "Committing config.local.json for deployment"
git push -f $1 master
git reset HEAD^
```

Wait for the dokku output to complete, then check the app at the production URL.
