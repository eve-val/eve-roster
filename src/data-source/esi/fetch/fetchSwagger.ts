import axios, {AxiosResponse, AxiosRequestConfig} from "axios";

export async function fetchSwagger(baseUrl: string): Promise<object> {
  const config: AxiosRequestConfig = {
    url: baseUrl + "/latest/swagger.json",
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "SOUND Roster (roster.of-sound-mind.com)",
    },
  };

  let response: AxiosResponse;
  response = await axios(config);
  return response.data;
}

export async function getModifiedSwagger(baseUrl: string, host: string): Promise<object> {
  let swagger: any;
  swagger = await fetchSwagger(baseUrl);

  swagger["host"] = host;

  // Replace securityDefinitions to specify API Key auth - we'll use the
  // character id we want to proxy for as the API "key" but rely on our
  // own out of band authentication.
  swagger["securityDefinitions"] = {
    proxy: {
      type: "apiKey",
      in: "header",
      name: "X-Proxy-Character",
    },
  };

  // Replace individual security blocks within each path to refer to the
  // new securityDefinitions type we set up.
  for (const path in swagger["paths"]) {
    for (const method in swagger["paths"][path]) {
      if ("security" in swagger["paths"][path][method]) {
        swagger["paths"][path][method]["security"] = [
          { proxy: [] },
        ];
      };
    };
  };

  return swagger;
}
