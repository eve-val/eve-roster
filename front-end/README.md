# eve-roster front-end

## Get started

1. Install the latest version of [Node.js](https://nodejs.org/en/).
2. `$ cd <this dir>`
3. `$ npm install`

To build for production with minificaton:

``` bash
$ npm run build
```

To build for development:
1. Follow the instructions in `/back-end/README.md` to set up the backend
server.
2. Modify `/back-end/config.local.json` and set `serveMode: "dev-frontend"`
3. Start the back-end server.
4. Open up a new shell, navigate to `/front-end` and run `$ npm run dev`

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

The back-end currently serves pre-canned data for the `/api/roster` endpoint.
The data source is `/back-end/api/roster.fake.json`. You can generate new fake
data by running:

``` bash
$ node shared/bin/xml_converter.js shared/bin/member_tracking_snapshot.xml > back-end/api/roster.fake.json
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