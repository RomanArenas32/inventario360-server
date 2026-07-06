export enum MessageStatus {
  Pending = 'pending', // received, not opened
  Read = 'read', // read, no action taken
  Replied = 'replied', // replied to
  Snoozed = 'snoozed', // snoozed for later
  Dismissed = 'dismissed', // discarded
}
