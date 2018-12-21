import { EsiEndpoint } from '../EsiEndpoint';
import { AxiosRequestConfig } from 'axios';
import { MixedObject } from '../../../util/simpleTypes';
import { inspect } from 'util';
import { EsiEndpointParams } from './EsiEndpointParams';

export function buildEsiFetchConfig<T extends EsiEndpoint>(
  baseUrl: string,
  endpoint: T,
  params: EsiEndpointParams<T>,
): AxiosRequestConfig {
  const url = baseUrl + bindPath(endpoint.path, params as MixedObject);

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

  if (endpoint.query) {
    const queryParams = {} as MixedObject;
    for (let v in endpoint.query) {
      queryParams[v] = (params as MixedObject)[v];
    }
    config.params = queryParams;
  }

  if (params._body != undefined) {
    config.headers['Content-Type'] = 'application/json';
    config.data = params._body;
  }

  if (params._token != undefined) {
    config.headers['Authorization'] = `Bearer ${params._token}`;
  }

  return config;
}

const PATH_PARAM_PATTERN = /\$\{([a-zA-Z_]+)\}/g;

function bindPath(path: string, params: MixedObject) {
  return path.replace(PATH_PARAM_PATTERN, (match, p1) => {
    let val = params[p1];
    if (val == undefined) {
      throw new Error(
          `Unbound param '${p1}" for path "${path}" in ${inspect(params)}.`)
    }
    return val.toString();
  });
}
