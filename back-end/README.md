# eve-roster back-end

## Get started

1. Install the latest version of [Node.js](https://nodejs.org/en/).
2. `$ cd <this dir>`
3. `$ npm install`
4. `$ cp config.local.json.example config.local.json`
5. Edit `config.local.json` and fill in missing values
6. Optionally [encrypt](#config-encryption) `config.local.json` to `config.local.enc`

Then:

``` bash
# Create empty database in ./roster.sqlite (or file named in config.local.json)
# This also will update existing DB to most recent schema as needed
$ npm run updatedb
```

``` bash
# Serve at localhost:80 (production), 8081 (dev-backend) or 8082 (dev-front-end)
$ npm start
```

## Config encryption

By default, configuration is loaded from `config.local.json`. However,
in production and other scenarios, you may not want sensitive passwords,
etc. stored in `config.local.json` to be in plaintext. The server
supports reading an additional encrypted configuration file,
`config.local.enc`, which overrides any configuration in the plaintext
config and the default config. If `config.local.enc` exists then
`config.local.json` can be deleted (assuming the encrypted configuration
contains all necessary details).

To generate an encrypted file:
``` bash
# Follow CLI instructions to enter a password for the file, and
# optionally delete the plaintext configuration when done.
$ npm run encrypt-config
```

If necessary, the encrypted file can be decrypted back to plaintext:

``` bash
# Follow CLI instructions to enter the encrypted file's password
# (aka the one provided above).
$ npm run decrypt-config
```

When the server is launched with an encrypted configuration file, it
requires that file's password in order to decrypt the contents. If not
provided via command line the server will prompt for the password before
continuing with startup. However, you can also specify the password via
command line, in which case the server starts up as usual:

``` bash
# Start the server using the password for decrypting the config file
$ npm start -- -p <password>
```

or

```
$ npm start -- --config-password <password>
```
