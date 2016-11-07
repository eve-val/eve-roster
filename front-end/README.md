# eve-roster front-end

## Get started

1. Install the latest version of [Node.js](https://nodejs.org/en/).
2. `$ cd <this dir>`
3. `$ npm install`

Then either:

``` bash
# serve with hot reload at localhost:8080
$ npm run dev

# build for production with minification
$ npm run build
```

## Framework

The frontend is built on the [Vue framework](https://vuejs.org/). Their documentation
is excellent and worth the read.

Vue solves the same kinds of problems as Angular or React -- you've got some data, and
you need to render it on-screen. Vue does this via *components*, which is what makes up
most of the `src` folder (`*.vue`). A root component takes in a big blob of data, breaks
it up into chunks, renders some of it, and hands the rest off to some sub-components.

Each component is defined in a `.vue` file. A `.vue` file has three parts: HTML (template),
JavaScript, and CSS. The HTML templates contain special directives for rendering and binding
data, including other components, and listening for events. The 
[template syntax documentation](https://vuejs.org/v2/guide/syntax.html) is worth a skim. The
structure of the JavaScript also relies heavily on the
[Vue API](https://vuejs.org/v2/guide/instance.html). The CSS is just CSS.

## Structure

The front-end currently has two pages: `home`, which has some actual content, and `settings`,
which is currently empty and just serves as an example for how to add a second page.

Home has the following structures:

`/pages/index.html` includes `/dist/home.build.js`, which is compiled from `/src/home.js`,
which uses the *components* defined in `/src/home/`. You shouldn't need to change any of
that.

`home.js` includes the root component `Home`, which renders the roster list as a series
of `MemberEntry`s. A `MemberEntry` is made up of one or more `RosterLine`s (one main
and any alts they may have).

## Generating fake data

The front-end currently fakes a server response and always displays the same canned data.
This data can be found in `pages/fake-data/`. The XML file is the raw output of the
[EVE API](http://eveonline-third-party-documentation.readthedocs.io/en/latest/xmlapi/corporation/corp_membertracking.html).
The JSON is what the front-end actually consumes.

You can generate new JSON by using the xml_converter.js script. Run it like so:

``` bash
$ node bin/xml_converter.js path/to/source.xml > target/path.json
```

The converter script adds a lot of fields and rearranges the structure of the data slightly.
Check out the comments in the file for more info.

## Workflow

`npm run dev` will set you up with hotloading and other development goodness. For an IDE I 
recommend [VSCode](https://code.visualstudio.com), but you can use whatever you like best.