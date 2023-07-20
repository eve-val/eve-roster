import { default as axios, AxiosRequestConfig, Method } from "axios";
import { MixedObject } from "../../../shared/util/simpleTypes.js";

import { getAccessToken } from "../../data-source/accessToken/accessToken.js";
import { jsonEndpoint } from "../../infra/express/protectedEndpoint.js";

import { CHARACTER_HEADER } from "../../data-source/esi/fetch/fetchSwagger.js";
import { BASE_URL } from "../../data-source/esi/fetch/fetchEsi.js";

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
          method: req.method as Method,
          headers: {
            Accept: "application/json",
          },
          validateStatus: function (_status) {
            // Pass all statuses along to caller.
            return true;
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
          config.headers!["Content-Type"] = "application/json";
          config.data = req.body;
        }
        if (token) {
          config.headers!["Authorization"] = `Bearer ${token}`;
        }

        return config;
      })
      .then((config) => axios.request<MixedObject>(config))
      .then((fetchResponse) => {
        res.status(fetchResponse.status);
        return fetchResponse.data;
      });
  },
);
