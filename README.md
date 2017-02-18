# eve-roster

## Get started

1. Install the latest version of [Node.js](https://nodejs.org/en/).
2. `$ cd <this dir>`
3. `$ npm install`
4. `$ cp config.local.json.example config.local.json`
5. Edit `config.local.json` and fill in missing values

Then:

``` bash
# Create empty database in ./roster.sqlite (or file named in config.local.json)
# This also will update existing DB to most recent schema as needed
$ npm run updatedb
```

``` bash
# serve at localhost:8080
$ npm start
```
## Framework

The frontend is built on the [Vue framework](https://vuejs.org/). Their
documentation is excellent and worth the read.

Vue solves the same kinds of problems as Angular or React -- you've got some
data, and you need to render it on-screen. Vue does this via *components*, which
is what makes up most of the `src` folder (`*.vue`). A root component takes in a
big blob of data, breaks it up into chunks, renders some of it, and hands the
rest off to some sub-components.

Each component is defined in a `.vue` file. A `.vue` file has three parts:
HTML (template), JavaScript, and CSS. The HTML templates contain special
directives for rendering and binding data, including other components, and
listening for events. The
[template syntax documentation](https://vuejs.org/v2/guide/syntax.html) is
worth a skim. The structure of the JavaScript also relies heavily on the
[Vue API](https://vuejs.org/v2/guide/instance.html). The CSS is just CSS.

## Generating fake data

The API currently serves pre-canned data for the `/api/roster` endpoint.
The data source is `/api/roster.fake.json`. You can generate new fake
data by running:

``` bash
$ node bin/xml_converter.js bin/member_tracking_snapshot.xml > api/roster.fake.json
```

The canned data is derived from the XML file mentioned above, which is a
snapshot of a call to the
[member tracking API] (http://eveonline-third-party-documentation.readthedocs.io/en/latest/xmlapi/corporation/corp_membertracking.html).

The converter script adds a lot of fields and rearranges the structure of the
data slightly. Check out the comments in the file for more info.

## Workflow

`npm run dev` will set you up with hotloading and other development goodness.
For an IDE I recommend [VSCode](https://code.visualstudio.com), but you can use
whatever you like best.

## Deployment

TODO:  Remove `config.local.json` and replace with environment variables,
       node-foreman, and database records as appropriate.

You must be one of the authorized dokku users on the linode instance to deploy.
This means your ssh key is in dokku's authorized_keys list.  If you want to manage dokku itself, you must also be a sudoer on the linode instance.

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

Make sure your local repository has what you want to push, e.g. no local changes and up to date with `7sempra/master`.

Commit the config.local.json file: `git add -f config.local.json && git commit -m "Committing config.local.json for deployment"`

Push to dokku: `git push -f dokku master`

Wait for the dokku output to complete, then check the app at the production URL.
