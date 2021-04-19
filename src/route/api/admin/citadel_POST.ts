import { jsonEndpoint } from "../../../infra/express/protectedEndpoint";
import { DEFAULT_NUM } from "../../../db/tnex";
import { dao } from "../../../db/dao";
import {
  verify,
  string,
  boolean,
} from "../../../util/express/schemaVerifier";

export class Input {
  name = string();
  type = string();
  allianceAccess = boolean();
  allianceOwned = boolean();
}
const inputSchema = new Input();

interface Output extends Input {
  id: number;
}

export default jsonEndpoint(
  (req, res, db, account, privs): Promise<Output> => {
    return Promise.resolve()
      .then(() => {
        privs.requireWrite("citadels");

        const input = verify(req.body, inputSchema);

        return dao.citadel.add(db, {
          citadel_id: DEFAULT_NUM,
          citadel_name: input.name,
          citadel_type: input.type,
          citadel_allianceAccess: input.allianceAccess,
          citadel_allianceOwned: input.allianceOwned,
        });
      })
      .then((id) => {
        return dao.citadel.getById(db, id, [
          "citadel_id",
          "citadel_name",
          "citadel_type",
          "citadel_allianceAccess",
          "citadel_allianceOwned",
        ]);
      })
      .then((row) => {
        if (row == null) {
          throw new Error("Our database is on fire.");
        }
        return {
          id: row.citadel_id,
          name: row.citadel_name,
          type: row.citadel_type,
          allianceAccess: !!row.citadel_allianceAccess,
          allianceOwned: !!row.citadel_allianceOwned,
        };
      });
  }
);
