# eve-roster back-end

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
# serve at localhost:8081
$ npm start
```
