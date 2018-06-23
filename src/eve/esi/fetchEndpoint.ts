import { inspect } from 'util';
import moment = require('moment');

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { EsiErrorCompat } from './EsiErrorCompat';
import { EsiErrorKind } from './EsiError';
import { MixedObject, SimpleMap } from '../../util/simpleTypes';
import { BaseEsiEndpoint, FetchMethod, PublicEsiEndpoint, PrivateEsiEndpoint, PublicEsiEndpointWithParams, PrivateEsiEndpointWithParams } from './EsiEndpoint';

const logger = require('../../util/logger')(__filename);


/**
 * Loads an ESI endpoint via HTTP.
 *
 * Throws EsiError when it encounters problems.
 */
export async function fetchEndpoint<T extends PublicEsiEndpoint>(
  endpoint: T,
  pathBindings: T['pathBindings'],
): Promise<T['response']>;

export async function fetchEndpoint<T extends PrivateEsiEndpoint>(
  endpoint: T,
  pathBindings: T['pathBindings'],
  token: string,
): Promise<T['response']>;

export async function fetchEndpoint<T extends BaseEsiEndpoint>(
  endpoint: T,
  pathBindings: T['pathBindings'],
  token?: string,
): Promise<T['response']> {
  return _fetchEndpoint(
      endpoint, pathBindings as MixedObject, undefined, token);
}


/**
 * Same as above, but for endpoints that require parameters (outside of those
 * specified in the path itself).
 */
export async function fetchEndpoinWithArgs<
  T extends PublicEsiEndpointWithParams
>(
  endpoint: T,
  pathBindings: T['pathBindings'],
  fetchParams: T['params'],
): Promise<T['response']>;

export async function fetchEndpoinWithArgs<
  T extends PrivateEsiEndpointWithParams
>(
  endpoint: T,
  pathBindings: T['pathBindings'],
  fetchParams: T['params'],
  token: string,
): Promise<T['response']>;

export async function fetchEndpoinWithArgs<T extends BaseEsiEndpoint>(
  endpoint: T,
  pathBindings: object,
  fetchParams: object,
  token?: string,
): Promise<T['response']> {
  return _fetchEndpoint(
      endpoint, pathBindings as MixedObject, fetchParams as MixedObject, token);
}

async function _fetchEndpoint<T extends BaseEsiEndpoint>(
    endpoint: T,
    pathBindings: MixedObject | undefined,
    fetchParams: MixedObject | undefined,
    token: string | undefined,
): Promise<T['response']> {

  const url = BASE_URL
      + (pathBindings ? bindPath(endpoint.path, pathBindings) : endpoint.path);

  let config: AxiosRequestConfig = {
    url: url,
    method: endpoint.method,
    headers: {
      // According to CCP, this Accept header is not necessary, but the cURL
      // example sets it, so ¯\_(ツ)_/¯
      'Accept': 'application/json',
      'User-Agent': 'SOUND Roster (roster.of-sound-mind.com)',
    },
  };

  if (fetchParams) {
    if (endpoint.method == FetchMethod.GET) {
      config.params = fetchParams;
    } else if (endpoint.method == FetchMethod.POST) {
      config.headers['Content-Type'] = 'application/json';
      config.data = fetchParams;
    }
  }

  if (token != undefined) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  let response: AxiosResponse;
  try {
    response = await axios(config);
  } catch (err) {
    let errKind = EsiErrorKind.GENERIC_ERROR;
    const response: AxiosResponse | undefined = err.response;
    if (response) {
      if (response.status == 401 || response.status == 403) {
        errKind = EsiErrorKind.FORBIDDEN_ERROR;
      } else if (response.status == 404) {
        errKind = EsiErrorKind.NOT_FOUND_ERROR;
      } else if (response.status >= 400 && response.status < 500) {
        errKind = EsiErrorKind.CLIENT_ERROR;
      } else if (response.status >=500 && response.status < 600) {
        errKind = EsiErrorKind.INTERNAL_SERVER_ERROR;
      }
    } else if (err.request) {
      errKind = EsiErrorKind.IO_ERROR;
    }

    throw new EsiErrorCompat(
        errKind,
        `${errKind} while fetching "${url}"`,
        err);
  }

  checkForWarnings(endpoint, response);

  return response.data;
}

const PATH_PARAM_PATTERN = /\$\{([a-zA-Z_]+)\}/g;

function bindPath(path: string, params: MixedObject) {
  return path.replace(PATH_PARAM_PATTERN, (match, p1) => {
    let val = params[p1];
    if (val == undefined) {
      throw new Error(
          `Unbound param "${p1}" for path "${path}" in ${inspect(params)}.`)
    }
    return val.toString();
  });
}

function checkForWarnings(endpoint: BaseEsiEndpoint, response: AxiosResponse) {
  const warning: string = response.headers['warning'];

  if (warning != undefined) {
    const tag = warning.startsWith(`199`) ? 'newVer'
      : warning.startsWith(`299`) ? 'deprecated'
      : 'unknown';

    logPathWarning(endpoint.path, tag, warning);
  }
}

const ERR_LOG_TIMESTAMPS = new Map<string, SimpleMap<number>>();
const MIN_TIME_BETWEEN_LOGS = moment.duration(1, 'hour').asMilliseconds();;

function logPathWarning(path: string, tag: string, message: string) {
  const entry: SimpleMap<number> = ERR_LOG_TIMESTAMPS.get(path) || {};
  const prevTimestamp = entry[tag] || 0;

  if (Date.now() - prevTimestamp > MIN_TIME_BETWEEN_LOGS) {
    // TODO: Ping Slack about this
    logger.error(`ESI WARNING for path "${path}": ${message}.`);
    entry[tag] = Date.now();
    ERR_LOG_TIMESTAMPS.set(path, entry);
  }
}

const BASE_URL = 'https://esi.evetech.net';

