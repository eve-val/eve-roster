import { dao } from "../../../db/dao";
import { BorrowedShipOutputRow } from "../../../db/dao/CharacterShipDao";
import { jsonEndpoint } from "../../../infra/express/protectedEndpoint";

export default jsonEndpoint((req, res, db, account, privs): Promise<
  BorrowedShipOutputRow[]
> => {
  privs.requireRead("characterShips", true);
  return dao.characterShip.getBorrowedShips(db, {
    accountId: account.id,
    includeOpsecChars: privs.canRead("memberOpsecAlts", true),
  });
});
