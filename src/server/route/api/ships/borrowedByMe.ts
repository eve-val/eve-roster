import { dao } from "../../../db/dao.js";
import { BorrowedShipOutputRow } from "../../../db/dao/CharacterShipDao.js";
import { jsonEndpoint } from "../../../infra/express/protectedEndpoint.js";

export default jsonEndpoint(
  (req, res, db, account, privs): Promise<BorrowedShipOutputRow[]> => {
    privs.requireRead("characterShips", true);
    return dao.characterShip.getBorrowedShips(db, {
      accountId: account.id,
      includeOpsecChars: privs.canRead("memberOpsecAlts", true),
    });
  },
);
