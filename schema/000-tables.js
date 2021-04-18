exports.up = function (trx) {
  return Promise.resolve()

    .then(() => {
      return trx.schema.createTable("character", (table) => {
        table.integer("id").primary();

        table.string("name").notNullable();
        table.integer("corporationId").notNullable().index();
        table.string("titles").nullable();
        table.bigInteger("startDate").nullable();
        table.bigInteger("logonDate").nullable();
        table.bigInteger("logoffDate").nullable();
        table.integer("siggyScore").nullable();
      });
    })
    .then(() => {
      return trx.schema.createTable("citadel", (table) => {
        table.increments("id");

        table.string("name").notNullable().index();
        table.string("type").notNullable();
        table.boolean("allianceAccess").notNullable();
        table.boolean("allianceOwned").notNullable();
      });
    })
    .then(() => {
      return trx.schema.createTable("group", (table) => {
        table.string("name").primary();
      });
    })
    .then(() => {
      return trx.schema.createTable("memberCorporation", (table) => {
        table.integer("corporationId").primary();

        table.string("membership").notNullable();
        table.integer("apiKeyId").notNullable();
        table.string("apiVerificationCode").notNullable();
      });
    })
    .then(() => {
      return trx.schema.createTable("privilege", (table) => {
        table.string("name").primary();

        table.string("category").notNullable();
        table.integer("ownerLevel").notNullable();
        table.boolean("requiresMembership").notNullable();
        table.text("description").notNullable();
      });
    })

    .then(() => {
      return trx.schema.createTable("accessToken", (table) => {
        table
          .integer("character")
          .primary()
          .references("character.id")
          .notNullable();
        table.string("refreshToken").notNullable();
        table.string("accessToken").notNullable();
        table.bigInteger("accessTokenExpires").notNullable();
        table.boolean("needsUpdate").notNullable();
      });
    })
    .then(() => {
      return trx.schema.createTable("account", (table) => {
        table.increments("id");

        table.bigInteger("created").notNullable();
        table.integer("mainCharacter").references("character.id").notNullable();
        table.string("activeTimezone").nullable();
        table
          .integer("homeCitadel")
          .references("citadel.id")
          .onDelete("SET NULL")
          .nullable();
      });
    })
    .then(() => {
      return trx.schema.createTable("accountGroup", (table) => {
        table.integer("account").references("account.id").index().notNullable();
        table.string("group").references("group.name").notNullable();

        table.unique(["account", "group"]);
      });
    })
    .then(() => {
      return trx.schema.createTable("accountLog", (table) => {
        table.increments("id");

        table.bigInteger("timestamp").index().notNullable();
        table.integer("account").references("account.id").index().notNullable();
        table.integer("originalAccount").notNullable();
        table.string("event").notNullable();
        table.integer("relatedCharacter").references("character.id").nullable();
        table.text("data").nullable();
      });
    })
    .then(() => {
      return trx.schema.createTable("characterLocation", (table) => {
        table.integer("character").references("character.id").index();
        table.bigInteger("timestamp").notNullable().index();
        table.string("shipName").notNullable();
        table.integer("shipTypeId").notNullable();
        table.bigInteger("shipItemId").notNullable();
        table.integer("solarSystemId").notNullable();
      });
    })
    .then(() => {
      return trx.schema.createTable("characterSkillQueue", (table) => {
        table
          .integer("character")
          .references("character.id")
          .index()
          .notNullable();
        table.integer("queuePosition").notNullable().index();
        table.integer("skill").notNullable();
        table.integer("targetLevel").notNullable();
        table.bigInteger("startTime").nullable();
        table.bigInteger("endTime").nullable();
        table.integer("levelStartSp").notNullable();
        table.integer("levelEndSp").notNullable();
        table.integer("trainingStartSp").notNullable();

        table.unique(["character", "queuePosition"]);
        table.unique(["character", "skill", "targetLevel"]);
      });
    })
    .then(() => {
      return trx.schema.createTable("config", (table) => {
        table.string("key").primary();

        table.text("value").nullable();
        table.text("description").notNullable();
      });
    })
    .then(() => {
      return trx.schema.createTable("cronLog", (table) => {
        table.increments("id");

        table.string("task").index().notNullable();

        // Unix millis
        table.bigInteger("start").index().notNullable();
        table.bigInteger("end").nullable();

        table.string("result").nullable();
      });
    })
    .then(() => {
      return trx.schema.createTable("groupExplicit", (table) => {
        table.increments("id");

        table.integer("account").references("account.id").index().notNullable();
        table.string("group").references("group.name").notNullable();

        table.unique(["account", "group"]);
      });
    })
    .then(() => {
      return trx.schema.createTable("groupPriv", (table) => {
        table.string("group").references("group.name").index().notNullable();
        table
          .string("privilege")
          .references("privilege.name")
          .index()
          .notNullable();
        table.integer("level").notNullable();

        table.unique(["group", "privilege"]);
      });
    })
    .then(() => {
      return trx.schema.createTable("groupTitle", (table) => {
        table.increments("id");

        table
          .integer("corporation")
          .references("memberCorporation.corporationId")
          .index()
          .notNullable();
        table.string("title").index().notNullable();
        table.string("group").references("group.name").notNullable();

        table.unique(["corporation", "title", "group"]);
      });
    })
    .then(() => {
      return trx.schema.createTable("killboard", (table) => {
        table.integer("character").primary().references("character.id");

        table.integer("killsInLastMonth").notNullable();
        table.bigInteger("killValueInLastMonth").notNullable();
        table.integer("lossesInLastMonth").notNullable();
        table.bigInteger("lossValueInLastMonth").notNullable();
        table.bigInteger("updated").notNullable();
      });
    })
    .then(() => {
      return trx.schema.createTable("ownership", (table) => {
        table.integer("character").primary().references("character.id");
        table.integer("account").references("account.id").index().notNullable();
        table.boolean("opsec").notNullable();
      });
    })
    .then(() => {
      return trx.schema.createTable("pendingOwnership", (table) => {
        table.integer("character").primary().references("character.id");
        table.integer("account").references("account.id").notNullable();
      });
    })
    .then(() => {
      return trx.schema.createTable("skillsheet", (table) => {
        table
          .integer("character")
          .references("character.id")
          .index()
          .notNullable();
        table.integer("skill").notNullable();
        table.integer("level").notNullable();
        table.integer("skillpoints").notNullable();

        table.unique(["character", "skill"]);
      });
    });
};

exports.down = function (trx) {
  return Promise.resolve()
    .then((_) => trx.schema.dropTable("skillsheet"))
    .then((_) => trx.schema.dropTable("pendingOwnership"))
    .then((_) => trx.schema.dropTable("ownership"))
    .then((_) => trx.schema.dropTable("killboard"))
    .then((_) => trx.schema.dropTable("groupTitle"))
    .then((_) => trx.schema.dropTable("groupPriv"))
    .then((_) => trx.schema.dropTable("groupExplicit"))
    .then((_) => trx.schema.dropTable("group"))
    .then((_) => trx.schema.dropTable("cronLog"))
    .then((_) => trx.schema.dropTable("config"))
    .then((_) => trx.schema.dropTable("citadel"))
    .then((_) => trx.schema.dropTable("characterSkillQueue"))
    .then((_) => trx.schema.dropTable("characterLocation"))
    .then((_) => trx.schema.dropTable("accountLog"))
    .then((_) => trx.schema.dropTable("accountGroup"))
    .then((_) => trx.schema.dropTable("account"))
    .then((_) => trx.schema.dropTable("accessToken"))
    .then((_) => trx.schema.dropTable("privilege"))
    .then((_) => trx.schema.dropTable("memberCorporation"))
    .then((_) => trx.schema.dropTable("character"));
};
