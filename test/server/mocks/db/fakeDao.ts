import { mockModule } from "../../../test_infra/mockModule.js";
import { FakeAccessTokenDao } from "./dao/FakeAccessTokenDao.js";

export function mockDao() {
  const fakeDao = new FakeDao();
  mockModule("src/server/db/dao.js", {
    dao: fakeDao,
    __esModule: true,
  });
  return fakeDao;
}

export class FakeDao {
  readonly accessToken = new FakeAccessTokenDao();

  reset() {
    this.accessToken.reset();
  }
}
