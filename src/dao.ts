import AccessTokenDao from './dao/AccessTokenDao';
import AccountDao from './dao/AccountDao';
import CharacterDao from './dao/CharacterDao';
import CharacterLocationDao from './dao/CharacterLocationDao';
import CitadelDao from './dao/CitadelDao';
import CombatStatsDao from './dao/CombatStatsDao';
import ConfigDao from './dao/ConfigDao';
import CronDao from './dao/CronDao';
import GroupsDao from './dao/GroupsDao';
import KillmailDao from './dao/KillmailDao';
import LogDao from './dao/LogDao';
import OwnershipDao from './dao/OwnershipDao';
import RosterDao from './dao/RosterDao';
import SkillsheetDao from './dao/SkillsheetDao';
import SkillQueueDao from './dao/SkillQueueDao';
import StatisticsDao from './dao/StatisticsDao';


export class Dao {
  // This strucure is necessary in order to avoid circular dependencies.
  // This way, both, say, the CharacterDao and the AccountDao could call methods
  // on each other without introducing a circular dep.

  public accessToken = new AccessTokenDao(this);
  public account = new AccountDao(this);
  public character = new CharacterDao(this);
  public characterLocation = new CharacterLocationDao(this);
  public citadel = new CitadelDao(this);
  public combatStats = new CombatStatsDao(this);
  public config = new ConfigDao(this);
  public cron = new CronDao(this);
  public group = new GroupsDao(this);
  public killmail = new KillmailDao(this);
  public log = new LogDao(this);
  public ownership = new OwnershipDao(this);
  public roster = new RosterDao(this);
  public skillQueue = new SkillQueueDao(this);
  public skillsheet = new SkillsheetDao(this);
  public statistics = new StatisticsDao(this);
}

export const dao = new Dao();
