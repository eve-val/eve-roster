import axios, { AxiosRequestConfig, Method } from "axios";
import { MixedObject } from "../../util/simpleTypes";

import { getAccessToken } from "../../data-source/accessToken/accessToken";
import { jsonEndpoint } from "../../infra/express/protectedEndpoint";

import { CHARACTER_HEADER } from "../../data-source/esi/fetch/fetchSwagger";
import { BASE_URL } from "../../data-source/esi/fetch/fetchEsi";

export default jsonEndpoint(
  (req, res, db, account, privs): Promise<MixedObject> => {
    // authenticate to make sure we're an admin.
    privs.requireRead("api", false);

    // read the character id from the header.
    const targetCharacter = +(req.get(CHARACTER_HEADER) || "");

    // read the URL path from our path, trimming our prefix.
    const prefix = req.route.path.slice(0, -2);
    const origPath = req.path;
    const targetPath = BASE_URL + "/latest" + origPath.replace(prefix, "");

    return Promise.resolve()
      .then(() => {
        if (isNaN(targetCharacter) || targetCharacter <= 0) {
          return null;
        }
        return getAccessToken(db, targetCharacter);
      })
      .then((token: string | null) => {
        // Reissue the request using the credentials.
        const config: AxiosRequestConfig = {
          url: targetPath,
          method: <Method>req.method,
          headers: {
            Accept: "application/json",
            "User-Agent": "SOUND Roster (roster.of-sound-mind.com)",
          },
        };
        if (req.query) {
          const queryParams = {} as MixedObject;
          for (const k in req.query) {
            queryParams[k] = (req.query as MixedObject)[k];
          }
          config.params = queryParams;
        }

        if (req.body != undefined) {
          config.headers["Content-Type"] = "application/json";
          config.data = req.body;
        }
        if (token) {
          config.headers["Authorization"] = `Bearer ${token}`;
        }

        return config;
      })
      .then((config) => axios(config))
      .then((fetchResponse) => {
        res.status(fetchResponse.status);
        return fetchResponse.data;
      });
  }
);
