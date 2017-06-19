import _ = require('underscore');

/**
 *  The typings for many underscore methods are incorrect, so we fix them here.
 *  :(
 */

export function pluck<T, K extends keyof T>(
    list: T[],
    property: K,
    ): Array<T[K]> {
  return _.pluck(list, property);
}

export function findWhere<T>(list: T[], properties: Partial<T>): T | undefined {
  return _.findWhere(list, properties);
}
