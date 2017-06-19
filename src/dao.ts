import AccessTokenDao from './dao/AccessTokenDao';
import AccountDao from './dao/AccountDao';
import CharacterDao from './dao/CharacterDao';
import CitadelDao from './dao/CitadelDao';
import ConfigDao from './dao/ConfigDao';
import CronDao from './dao/CronDao';
import GroupsDao from './dao/GroupsDao';
import KillboardDao from './dao/KillboardDao';
import LogDao from './dao/LogDao';
import OwnershipDao from './dao/OwnershipDao';
import RosterDao from './dao/RosterDao';
import SkillsheetDao from './dao/SkillsheetDao';
import SkillQueueDao from './dao/SkillQueueDao';


export class Dao {
  // This strucure is necessary in order to avoid circular dependencies.
  // This way, both, say, the CharacterDao and the AccountDao could call methods
  // on each other without introducing a circular dep.

  public accessToken = new AccessTokenDao(this);
  public account = new AccountDao(this);
  public character = new CharacterDao(this);
  public citadel = new CitadelDao(this);
  public cron = new CronDao(this);
  public config = new ConfigDao(this);
  public group = new GroupsDao(this);
  public killboard = new KillboardDao(this);
  public log = new LogDao(this);
  public ownership = new OwnershipDao(this);
  public roster = new RosterDao(this);
  public skillQueue = new SkillQueueDao(this);
  public skillsheet = new SkillsheetDao(this);
}

export const dao = new Dao();
