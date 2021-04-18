exports.up = function (trx) {
  return Promise.resolve()
    .then(() => {
      return trx("group").insert([
        { name: "__admin" },
        { name: "__member" },
        { name: "admin" },
        { name: "full_member" },
        { name: "provisional_member" },
      ]);
    })
    .then(() => {
      return trx("privilege").insert([
        {
          name: "roster",
          category: "roster",
          ownerLevel: 0,
          requiresMembership: true,
          description: "Access to the list of members and their alts.",
        },
        {
          name: "memberAlts",
          category: "member",
          ownerLevel: 2,
          requiresMembership: false,
          description: "What alts a member has.",
        },
        {
          name: "memberHousing",
          category: "member",
          ownerLevel: 1,
          requiresMembership: true,
          description: "What citadel a member lives in.",
        },
        {
          name: "memberTimezone",
          category: "member",
          ownerLevel: 2,
          requiresMembership: false,
          description: `A member's active timezone.`,
        },
        {
          name: "characterActivityStats",
          category: "character",
          ownerLevel: 1,
          requiresMembership: true,
          description: `A character's logon/logoff/kills/losses/scanning stats.`,
        },
        {
          name: "characterSkills",
          category: "character",
          ownerLevel: 1,
          requiresMembership: false,
          description: `A character's skills.`,
        },
        {
          name: "characterSkillQueue",
          category: "character",
          ownerLevel: 1,
          requiresMembership: false,
          description: `A character's skill queue.`,
        },
        {
          name: "adminConsole",
          category: "admin",
          ownerLevel: 0,
          requiresMembership: true,
          description: `If an account can access the admin console.`,
        },
        {
          name: "accountLogs",
          category: "admin",
          ownerLevel: 0,
          requiresMembership: true,
          description: `If an account can logs of account activity.`,
        },
        {
          name: "cronLogs",
          category: "admin",
          ownerLevel: 0,
          requiresMembership: true,
          description: `If an account can read logs of cron activity.`,
        },
        {
          name: "memberOpsecAlts",
          category: "member",
          ownerLevel: 2,
          requiresMembership: false,
          description: `Alts that a member has marked as opsec.`,
        },
        {
          name: "characterIsOpsec",
          category: "character",
          ownerLevel: 2,
          requiresMembership: true,
          description: `Whether an external character is opsec" (see memberOpsecAlts)."`,
        },
        {
          name: "serverLogs",
          category: "admin",
          ownerLevel: 0,
          requiresMembership: true,
          description: `If an account can read server console logs.`,
        },
        {
          name: "citadels",
          category: "admin",
          ownerLevel: 0,
          requiresMembership: true,
          description: `Access to the list of citadels.`,
        },
        {
          name: "serverConfig",
          category: "admin",
          ownerLevel: 0,
          requiresMembership: true,
          description: `Access to the general server config file.`,
        },
        {
          name: "memberGroups",
          category: "admin",
          ownerLevel: 0,
          requiresMembership: true,
          description: `What ACL groups a member has.`,
        },
      ]);
    })
    .then(() => {
      return trx("groupPriv").insert([
        { group: "admin", privilege: "roster", level: 2 },
        { group: "admin", privilege: "memberAlts", level: 2 },
        { group: "admin", privilege: "memberHousing", level: 2 },
        { group: "admin", privilege: "memberTimezone", level: 2 },
        { group: "admin", privilege: "characterActivityStats", level: 2 },
        { group: "admin", privilege: "characterSkills", level: 2 },
        { group: "admin", privilege: "characterSkillQueue", level: 1 },
        { group: "admin", privilege: "adminConsole", level: 2 },
        { group: "admin", privilege: "accountLogs", level: 2 },
        { group: "admin", privilege: "cronLogs", level: 2 },
        { group: "admin", privilege: "memberOpsecAlts", level: 2 },
        { group: "admin", privilege: "serverLogs", level: 2 },
        { group: "admin", privilege: "citadels", level: 2 },
        { group: "admin", privilege: "serverConfig", level: 2 },
        { group: "admin", privilege: "memberGroups", level: 2 },

        { group: "full_member", privilege: "roster", level: 1 },
        { group: "full_member", privilege: "memberTimezone", level: 1 },
        { group: "full_member", privilege: "memberHousing", level: 1 },
        { group: "full_member", privilege: "memberAlts", level: 1 },
        { group: "full_member", privilege: "citadels", level: 1 },
        { group: "provisional_member", privilege: "roster", level: 1 },
        { group: "provisional_member", privilege: "citadels", level: 1 },
      ]);
    })
    .then(() => {
      return trx("config").insert([
        {
          key: "siggyUsername",
          value: null,
          description:
            "Siggy account username to use when scraping Siggy stats.",
        },
        {
          key: "siggyPassword",
          value: null,
          description:
            "Siggy account password to use when scraping Siggy stats.",
        },
      ]);
    });
};

exports.down = function (trx) {
  return Promise.resolve()
    .then(() => trx("groupPriv").del())
    .then(() => trx("privilege").del())
    .then(() => trx("group").del());
};
