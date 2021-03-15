import { dao } from '../../../db/dao';
import { BorrowedShipOutputRow } from '../../../db/dao/CharacterShipDao';
import { jsonEndpoint } from '../../../infra/express/protectedEndpoint';

export default jsonEndpoint(
  (req, res, db, account, privs): Promise<BorrowedShipOutputRow[]> => {
    privs.requireRead('characterShips');
    return dao.characterShip.getBorrowedShips(db, {
      includeOpsecChars: privs.canRead('memberOpsecAlts'),
    });
  },
);
