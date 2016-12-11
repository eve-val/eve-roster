# eve-roster front-end

## Get started

1. Install the latest version of [Node.js](https://nodejs.org/en/).
2. `$ cd <this dir>`
3. `$ npm install`

To build for production with minificaton:

``` bash
$ npm run build
```

To run the development environment you will first need to start up the back-end 
server in another terminal (see `/back-end/README.md`). Then run:

``` bash
$ npm run dev
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