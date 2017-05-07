import { tables } from './dao/tables';
import { Tnex } from './tnex';

const knex = require('./util/knex-loader');

export const db = tables.build(knex);
