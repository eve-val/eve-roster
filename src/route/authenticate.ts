import querystring from "querystring";

import axios from "axios";
import express from "express";

import { dao } from "../db/dao";
import { Tnex, UpdatePolicy } from "../db/tnex/index";
import { isAnyEsiError } from "../data-source/esi/error";

import { UserVisibleError } from "../error/UserVisibleError";
import { stringQuery } from "../util/express/paramVerifier";
import { BadRequestError } from "../error/BadRequestError";
import {
  ESI_CHARACTERS_$characterId_ROLES,
  ESI_CHARACTERS_$characterId,
} from "../data-source/esi/endpoints";
import { UNKNOWN_CORPORATION_ID } from "../db/constants";
import { fileURLToPath } from "url";
import { buildLoggerFromFilename } from "../infra/logging/buildLogger";
import { getSession } from "../infra/express/session";
import { fetchEsi } from "../data-source/esi/fetch/fetchEsi";
import { fetchAuthInfo } from "../data-source/accessToken/jwt";

const logger = buildLoggerFromFilename(fileURLToPath(import.meta.url));

/**
 * Authenticates a character, creating an account if necessary.
 *
 * This endpoint expects to be fetched as the final part of the EVE SSO flow.
 *
 * The "code" param must be an EVE SSO token.
 *
 * The "state" param must be an AuthType, which specifies whether to create
 * a new account, add this character to an existing account, or log in to an
 * existing account.
 */

export default async function (req: express.Request, res: express.Response) {
  try {
    const state = stringQuery(req, "state");
    const authCode = stringQuery(req, "code");

    let authType: undefined | AuthType;
    let nonce: undefined | string;
    if (state && typeof state == "string" && state.indexOf(".") != -1) {
      const t = state.split(".")[0];
      if (Object.values<string>(AuthType).includes(t)) {
        authType = <AuthType>t;
      }
      nonce = state.split(".")[1];
    }

    const session = getSession(req);

    if (
      authType == undefined ||
      authCode == undefined ||
      nonce == undefined ||
      nonce != session.nonce
    ) {
      throw new BadRequestError(`Invalid 'state' or 'code' queries.`);
    }

    const accountId = await handleEndpoint(
      req.app.locals.db,
      session.accountId,
      authType,
      authCode
    );

    session.accountId = accountId;
    res.redirect("/");
  } catch (e) {
    // TODO: Display this to the user in a prettier manner
    const message = e instanceof UserVisibleError ? e.message : "Server error";
    logger.error("Auth failure");
    logger.error(e);
    res.status(500);
    res.send(message);
  }
}

export enum AuthType {
  LOG_IN = "logIn",
  CREATE_ACCOUNT = "createAccount",
  ADD_CHARACTER = "addCharacter",
}

async function handleEndpoint(
  db: Tnex,
  accountId: number | undefined,
  authType: AuthType,
  authCode: string
) {
  const charInfo = await fetchCharInfo(authCode);
  await storeCharInfo(db, charInfo);
  return await authenticateChar(db, accountId, authType, charInfo);
}

async function fetchCharInfo(authCode: string) {
  const tokens = await fetchAccessTokens(authCode);
  const authInfo = await fetchAuthInfo(tokens.access_token);

  const charId = +authInfo.sub!.replace("CHARACTER:EVE:", "");
  const charInfo: CharacterInfo = {
    id: charId,
    ownerHash: authInfo.owner,
    name: authInfo.name,
    scopes: authInfo.scp || [],

    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessTokenExpires: (authInfo.exp || 0) * 1000,

    corporationId: null,
    roles: null,
  };

  try {
    const [esiCharInfo, esiCharRoles] = await Promise.all([
      fetchEsi(ESI_CHARACTERS_$characterId, { characterId: charInfo.id }),
      fetchEsi(ESI_CHARACTERS_$characterId_ROLES, {
        characterId: charInfo.id,
        _token: tokens.access_token,
      }),
    ]);
    charInfo.corporationId = esiCharInfo.corporation_id;
    charInfo.roles = esiCharRoles.roles;
  } catch (e) {
    if (isAnyEsiError(e)) {
      logger.warn("ESI is unavailable, attempting to auth anyway...", e);
    } else {
      throw e;
    }
  }

  return charInfo;
}

async function storeCharInfo(db: Tnex, charInfo: CharacterInfo) {
  await dao.character.upsertCharacter(
    db,
    {
      character_id: charInfo.id,
      character_name: charInfo.name,
      character_corporationId: charInfo.corporationId || UNKNOWN_CORPORATION_ID,
      character_roles: charInfo.roles,
      character_deleted: false,
      character_titles: null,
      character_startDate: null,
      character_logonDate: null,
      character_logoffDate: null,
      character_siggyScore: null,
    },
    {
      character_titles: UpdatePolicy.PRESERVE_EXISTING,
      character_startDate: UpdatePolicy.PRESERVE_EXISTING,
      character_logonDate: UpdatePolicy.PRESERVE_EXISTING,
      character_logoffDate: UpdatePolicy.PRESERVE_EXISTING,
      character_siggyScore: UpdatePolicy.PRESERVE_EXISTING,
    }
  );

  await dao.accessToken.upsert(
    db,
    charInfo.id,
    charInfo.refreshToken,
    charInfo.scopes,
    charInfo.accessToken,
    charInfo.accessTokenExpires
  );
}

async function authenticateChar(
  db: Tnex,
  existingAuthedAccount: number | undefined,
  authType: AuthType,
  charInfo: CharacterInfo
) {
  const ownershipData = await dao.character.getOwnershipData(db, charInfo.id);
  const owningAccount = ownershipData && ownershipData.account_id;
  const ownerHash = ownershipData && ownershipData.ownership_ownerHash;

  let authedAccount: number;

  if (
    authType != AuthType.LOG_IN &&
    (charInfo.corporationId == null || charInfo.roles == null)
  ) {
    throw new UserVisibleError(
      `CCP's servers are misbehaving; please try again.`
    );
  }

  switch (authType) {
    case AuthType.LOG_IN:
      if (owningAccount == null) {
        throw new UserVisibleError(
          `You must create an account before you log in.`
        );
      } else if (ownerHash != null && charInfo.ownerHash != ownerHash) {
        // Character has changed hands. Refuse auth until they create a new
        // account / transfer character to existing account.
        throw new UserVisibleError(
          `You must create an account before you log in.`
        );
      } else {
        authedAccount = owningAccount;
      }
      break;

    case AuthType.CREATE_ACCOUNT:
      if (owningAccount != null) {
        // TODO: We should support this eventually
        throw new UserVisibleError(
          `Cannot create account: this character is already owned by another ` +
            `account`
        );
      }
      authedAccount = await db.asyncTransaction(async (db) => {
        // TODO: mainCharacter should really be null when we create an
        // account...
        const createdAccountId = await dao.account.create(db, charInfo.id);
        await dao.ownership.ownCharacter(
          db,
          charInfo.id,
          createdAccountId,
          charInfo.ownerHash,
          true
        );
        return createdAccountId;
      });
      break;

    case AuthType.ADD_CHARACTER:
      if (existingAuthedAccount == undefined) {
        throw new UserVisibleError(
          `You must log in before you can add a character.`
        );
      }
      if (owningAccount == null) {
        await dao.ownership.ownCharacter(
          db,
          charInfo.id,
          existingAuthedAccount,
          charInfo.ownerHash,
          false
        );
      } else if (owningAccount != existingAuthedAccount) {
        await dao.ownership.createPendingOwnership(
          db,
          charInfo.id,
          existingAuthedAccount,
          charInfo.ownerHash
        );
      } else {
        // Already logged in and account already owns character: do nothing
      }
      authedAccount = existingAuthedAccount;
      break;

    default:
      throw new Error(`Unknown authType "${authType}".`);
  }

  return authedAccount;
}

async function fetchAccessTokens(authCode: string) {
  return axios
    .post<AccessTokenResponse>(
      "https://login.eveonline.com/v2/oauth/token",
      querystring.stringify({
        grant_type: "authorization_code",
        code: authCode,
      }),
      {
        headers: {
          Authorization: "Basic " + SSO_AUTH_CODE,
          "content-type": "application/x-www-form-urlencoded",
        },
      }
    )
    .then((response) => response.data);
}

const SSO_AUTH_CODE = Buffer.from(
  process.env.SSO_CLIENT_ID + ":" + process.env.SSO_SECRET_KEY
).toString("base64");

interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
}

interface CharacterInfo {
  id: number;
  ownerHash: string;
  name: string;
  scopes: string[];

  accessToken: string;
  refreshToken: string;
  accessTokenExpires: number;

  corporationId: number | null;
  roles: string[] | null;
}
