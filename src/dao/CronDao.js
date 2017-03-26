

const CronDao = module.exports = class {
  constructor(parent, builder) {
    this._parent = parent;
    this._builder = builder;
  }

  getMostRecentJob(taskName) {
    return this._builder('cronLog')
        .select('id', 'task', 'start', 'end')
        .where('task', '=', taskName)
        .orderBy('start', 'desc')
        .orderBy('id', 'desc')
        .limit(1)
    .then(([row]) => {
      return row;
    });
  }

  startJob(taskName) {
    return this._builder('cronLog')
        .insert({
          task: taskName,
          start: Date.now(),
        })
    .then(([id]) => {
      return id;
    });
  }

  finishJob(jobId, result) {
    return this._builder('cronLog')
        .update({
          end: Date.now(),
          result: result
        })
        .where('id', '=', jobId);
  }

  dropOldJobs(startCutoff) {
    return this._builder('cronLog')
        .del()
        .where('start', '<', startCutoff);

    /*
    // This is the "more correct" way to to this -- it guarantees that we leave
    // the most recent completed entry in the log even if it's "too old".
    // However, SQLite doesn't support joins on deletes. Womp.
    return this._builder('cronLog as c1')
        .del('c1')
        .leftJoin(function() {
          // The most recent completed entry for each task
          this.select('id', 'max(start) as start')
              .from('cronLog')
              .whereNotNull('end')
              .groupBy('task')
              .as('c2')
        }, 'c1.task', '=', 'c2.task')
        .where('c1.start', '<', 'c2.start')
        .andWhere('c1.start', '<', startCutoff);
    */
  }

  getRecentLogs() {
    return this._builder('cronLog')
        .select('id', 'task', 'start', 'end', 'result')
        .orderBy('id', 'desc')
        .limit(400);
  }
}
