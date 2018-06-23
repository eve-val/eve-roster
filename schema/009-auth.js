
/**
 * Updates various tables to support new auth and roster sync:
 * - Tracks roles per character
 * - Tracks granted scopes per access token
 * - Tracks ownerHashes per character
 * - Expands accessToken cols to support tokens longer than 255 chars
 */

exports.up = async function(trx) {
  await trx.schema.alterTable('accessToken', table => {
    table.jsonb('scopes').nullable();
  });

  await trx.schema.alterTable('ownership', table => {
    table.text('ownerHash').nullable();
  });

  // Drop all pending ownership rows as we don't know what their ownership
  // hashes are.
  await trx('pendingOwnership').del();
  await trx.schema.alterTable('pendingOwnership', table => {
    table.text('ownerHash').notNullable();
  });

  await trx.schema.alterTable('character', table => {
    table.jsonb('roles').nullable();
  });

  await trx('accessToken')
      .update(
          {
            scopes: JSON.stringify([
              'esi-ui.open_window.v1',
              'esi-ui.write_waypoint.v1',
              'esi-assets.read_assets.v1',
              'esi-clones.read_clones.v1',
              'esi-killmails.read_killmails.v1',
              'esi-location.read_location.v1',
              'esi-location.read_ship_type.v1',
              'esi-skills.read_skillqueue.v1',
              'esi-skills.read_skills.v1',
              'esi-fleets.read_fleet.v1',
              'esi-fleets.write_fleet.v1',
            ]),
          });

  // Mark the new columns as non-nullable after we've filled them with default
  // values.
  await trx.schema.alterTable('accessToken', table => {
    table.jsonb('scopes').alter().notNullable();
  });

  // These need to be much longer to support the new scopes
  await trx.schema.raw(
      `ALTER TABLE "accessToken" ALTER COLUMN "refreshToken" TYPE text;`);
  await trx.schema.raw(
      `ALTER TABLE "accessToken" ALTER COLUMN "accessToken" TYPE text;`);
}

exports.down = async function(trx) {
  await trx.schema.alterTable('character', table => {
    table.dropColumn('roles');
  });

  await trx.schema.alterTable('pendingOwnership', table => {
    table.dropColumn('ownerHash');
  });

  await trx.schema.alterTable('ownership', table => {
    table.dropColumn('ownerHash');
  });

  await trx.schema.alterTable('accessToken', table => {
    table.dropColumn('scopes');
  });
}
