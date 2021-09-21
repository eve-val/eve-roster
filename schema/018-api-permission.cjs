/**
 * Adds a new permission for API proxy access, given to recruiters.
 */
exports.up = async function (trx) {
  await trx("privilege").insert([
    {
      name: "api",
      category: "admin",
      ownerLevel: 0,
      requiresMembership: true,
      description: "Use API keys on file to audit members.",
    },
  ]);

  await trx("group").insert([{ name: "recruiter" }]);

  await trx("groupPriv").insert([
    { group: "recruiter", privilege: "api", level: 2 },
    { group: "admin", privilege: "api", level: 2 },
  ]);
};

exports.down = async function (trx) {
  await trx("groupPriv").del().where("privilege", "=", "api");
  await trx("group").del().where("name", "=", "recruiter");
  await trx("privilege").del().where("name", "=", "api");
};
