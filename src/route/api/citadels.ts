import { dao } from '../../dao';
import { jsonEndpoint } from '../../express/protectedEndpoint';


interface Output {
  citadels: CitadelJson[],
}

interface CitadelJson {
  id: number,
  name: string | null,
  type: string,
  allianceAccess: boolean,
  allianceOwned: boolean,
}

export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  privs.requireRead('citadels');

  return Promise.resolve()
  .then(() => {
    return dao.citadel.getAll(db, [
      'citadel_id',
      'citadel_name',
      'citadel_type',
      'citadel_allianceAccess',
      'citadel_allianceOwned',
    ]);
  })
  .then(rows => {
    return {
      citadels: rows.map(row => ({
          id: row.citadel_id,
          name: row.citadel_name,
          type: row.citadel_type,
          allianceAccess: !!row.citadel_allianceAccess,
          allianceOwned: !!row.citadel_allianceOwned,
      })),
    };
  });
});
