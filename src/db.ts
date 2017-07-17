import { tables } from './dao/tables';
import { getPostgresKnex } from './db/getPostgresKnex';

export const db = tables.build(getPostgresKnex());
