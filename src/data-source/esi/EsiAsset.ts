/**
 * ESI format for assets returned by character and corporation asset
 * endpoints.
 */
export interface EsiAsset {
    is_blueprint_copy?: boolean,
    is_singleton: boolean,
    item_id: number,
    location_flag: string,
    location_id: number,
    location_type:
      | 'station'
      | 'solar_system'
      | 'item'
      | 'other',
    quantity: number,
    type_id: number,
  }
