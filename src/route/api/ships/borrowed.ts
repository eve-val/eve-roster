import { dao } from '../../../db/dao';
import { BorrowedShipOutputRow } from '../../../db/dao/CharacterShipDao';
import { jsonEndpoint } from '../../../infra/express/protectedEndpoint';

export default jsonEndpoint(
  (req, res, db, account, privs): Promise<BorrowedShipOutputRow[]> => {
    const notTheOwner = false;
    privs.requireRead('characterShips', notTheOwner);
    return dao.characterShip.getBorrowedShips(db, {
      includeOpsecChars: privs.canRead('memberOpsecAlts', notTheOwner),
    });
  },
);
