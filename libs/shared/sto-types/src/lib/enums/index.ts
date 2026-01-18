export enum StoOrderZone {
  RECEPTION = 'reception',
  WORKSHOP = 'workshop',
  DIAGNOSTIC = 'diagnostic',
  BODYWORK = 'bodywork',
}

export enum StoOrderStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum StoOrderPriority {
  URGENT = 'urgent',
  VIP = 'vip',
  WARRANTY = 'warranty',
  NORMAL = 'normal',
}

export enum StoNotificationTrigger {
  ORDER_CREATED = 'order_created',
  ORDER_STARTED = 'order_started',
  ORDER_COMPLETED = 'order_completed',
  ORDER_BLOCKED = 'order_blocked',
  ORDER_DELAYED = 'order_delayed',
}

export enum NotificationChannel {
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  TELEGRAM = 'telegram',
}

export enum ReservationStatus {
  ACTIVE = 'active',
  CONSUMED = 'consumed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export const ZONE_NUMBER_RANGES = {
  [StoOrderZone.RECEPTION]: { start: 1, end: 99 },
  [StoOrderZone.WORKSHOP]: { start: 100, end: 199 },
  [StoOrderZone.DIAGNOSTIC]: { start: 200, end: 299 },
  [StoOrderZone.BODYWORK]: { start: 300, end: 399 },
};

export const TEMPLATE_VARIABLES = {
  customerName: 'Имя клиента',
  customerPhone: 'Телефон клиента',
  vehicleMake: 'Марка автомобиля',
  vehicleModel: 'Модель автомобиля',
  vehicleYear: 'Год выпуска',
  licensePlate: 'Гос. номер',
  workDescription: 'Описание работ',
  estimatedTime: 'Примерное время',
  estimatedCost: 'Примерная стоимость',
  mechanicName: 'Имя механика',
  bayNumber: 'Номер поста',
  completedAt: 'Время завершения',
  queueNumber: 'Номер в очереди',
};
