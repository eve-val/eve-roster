import querystring = require('querystring');

// Use DOKKU_PROXY_SSL_PORT (or similar values) because we need the external
// port for the EVE SSO redirect URL, not the port in the Docker container
// that the Node server is listening on.
const port = process.env.DOKKU_PROXY_SSL_PORT ||
             process.env.DOKKU_NGINX_SSL_PORT ||
             process.env.DOKKU_PROXY_PORT ||
             process.env.DOKKU_NGINX_PORT ||
             process.env.PORT ||
             8081;
const hostname = process.env.HOSTNAME || 'localhost';
const protocol = process.env.DOKKU_NGINX_SSL_PORT ? 'https' : 'http';

export const LOGIN_PARAMS = querystring.stringify({
  'response_type': 'code',
  'redirect_uri': `${protocol}://${hostname}:${port}/authenticate`,
  'client_id':  process.env.SSO_CLIENT_ID,
  'scope': [
    'esi-ui.open_window.v1',
    'esi-ui.write_waypoint.v1',
    'esi-assets.read_assets.v1',
    'esi-clones.read_clones.v1',
    'esi-killmails.read_killmails.v1',
    'esi-location.read_location.v1',
    'esi-location.read_ship_type.v1',
    'esi-skills.read_skillqueue.v1',
    'esi-skills.read_skills.v1',
    'esi-fleets.read_fleet.v1',
    'esi-fleets.write_fleet.v1'].join(' '),
  'state': '12345',
});
