export interface EsiNotification {
  is_read?: boolean,
  notification_id: number,
  sender_id: number,
  sender_type: string,
  text?: string,
  timestamp: string,
  type: string,
}
