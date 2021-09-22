import axios, { AxiosResponse, AxiosRequestConfig } from "axios";

export const CHARACTER_HEADER = "X-Proxy-Character";

export async function fetchSwagger(baseUrl: string): Promise<object> {
  const config: AxiosRequestConfig = {
    url: baseUrl + "/latest/swagger.json",
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "SOUND Roster (roster.of-sound-mind.com)",
    },
  };

  const response: AxiosResponse = await axios(config);
  return response.data;
}

export async function getModifiedSwagger(
  baseUrl: string,
  host: string
): Promise<object> {
  const swagger: any = await fetchSwagger(baseUrl);

  swagger["basePath"] = "/esi/proxy";
  swagger["host"] = host;
  delete swagger["schemes"];

  // Replace securityDefinitions to specify API Key auth - we'll use the
  // character id we want to proxy for as the API "key" but rely on our
  // own out of band authentication.
  swagger["securityDefinitions"] = {
    proxy: {
      type: "apiKey",
      in: "header",
      name: CHARACTER_HEADER,
    },
  };

  // Replace individual security blocks within each path to refer to the
  // new securityDefinitions type we set up.
  for (const path in swagger["paths"]) {
    let shouldDelete: boolean = false;
    for (const method in swagger["paths"][path]) {
      if ("security" in swagger["paths"][path][method]) {
        const security = swagger["paths"][path][method]["security"];
        if ("evesso" in security) {
          for (const scope in security["evesso"]) {
            if (scope.includes("esi-mail")) {
              shouldDelete = true;
            }
          }
        }
        swagger["paths"][path][method]["security"] = [{ proxy: [] }];
      }
    }
    if (shouldDelete) {
      delete swagger["paths"][path];
    }
  }

  return swagger;
}
