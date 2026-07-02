export enum MessageStatus {
  Pending = 'pending',     // recibido, sin abrir
  Read = 'read',           // leído, sin acción
  Replied = 'replied',     // respondido
  Snoozed = 'snoozed',     // pospuesto
  Dismissed = 'dismissed', // descartado
}
