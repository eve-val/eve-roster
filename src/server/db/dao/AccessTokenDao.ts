import { Tnex } from "../../db/tnex/index.js";
import { Dao } from "../dao.js";
import { accessToken, AccessToken } from "../tables.js";

export default class AccessTokenDao {
  constructor(private _parent: Dao) {}

  getAll(db: Tnex, characterIds: number[]) {
    return db
      .select(accessToken)
      .whereIn("accessToken_character", characterIds)
      .columns(
        "accessToken_character",
        "accessToken_refreshToken",
        "accessToken_accessToken",
        "accessToken_accessTokenExpires",
        "accessToken_needsUpdate",
        "accessToken_scopes",
      )
      .run();
  }

  updateAll(
    db: Tnex,
    rows: Pick<
      AccessToken,
      | "accessToken_character"
      | "accessToken_refreshToken"
      | "accessToken_accessToken"
      | "accessToken_accessTokenExpires"
      | "accessToken_needsUpdate"
    >[],
  ): Promise<unknown> {
    return db.updateAll(accessToken, "accessToken_character", rows);
  }

  upsert(
    db: Tnex,
    characterId: number,
    refreshToken: string,
    scopes: string[],
    accessTokenVal: string,
    accessTokenExpires: number,
    needsUpdate: boolean,
  ): Promise<unknown> {
    return db.upsert(
      accessToken,
      {
        accessToken_character: characterId,
        accessToken_refreshToken: refreshToken,
        accessToken_scopes: scopes,
        accessToken_accessToken: accessTokenVal,
        accessToken_accessTokenExpires: accessTokenExpires,
        accessToken_needsUpdate: needsUpdate,
      },
      "accessToken_character",
    );
  }
}
