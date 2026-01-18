# STO Service - Phase 2.5: QR Self-Service (Complete)

## Overview
Phase 2.5 adds public-facing QR code self-service features with Redis-based rate limiting, order tracking, and SMS notifications (without reCAPTCHA).

**Status**: ✅ Complete  
**Build**: `webpack compiled successfully (148 KiB)`  
**Date**: 2026-01-17

---

## Features Implemented

### 1. Redis-Based Rate Limiting
**File**: `apps/sto-service/src/app/modules/qr-codes/services/public-queue.service.ts`

```typescript
// Check rate limit (30 minutes per phone)
async checkRateLimit(phone: string): Promise<boolean>

// Set rate limit after successful queue join
async setRateLimit(phone: string): Promise<void>

// Clear rate limit (admin override or cancellation)
async clearRateLimit(phone: string): Promise<void>
```

**Implementation**:
- **Cache Key**: `rate_limit:phone:${phone}`
- **TTL**: 1800000ms (30 minutes)
- **Storage**: Redis via CACHE_MANAGER
- **Error Message**: "Вы уже записаны в очередь. Пожалуйста, подождите 30 минут перед новой записью."

**Usage Example**:
```typescript
const canProceed = await this.publicQueueService.checkRateLimit('+992000111222');
if (!canProceed) {
  throw new BadRequestException('Rate limit exceeded');
}

// After successful order creation
await this.publicQueueService.setRateLimit('+992000111222');
```

---

### 2. Order Tracking Service
**File**: `apps/sto-service/src/app/modules/qr-codes/services/tracking.service.ts`

**Methods**:
```typescript
// Get full tracking info (position, wait time, status)
async getTrackingInfo(orderId: string, phone: string): Promise<TrackingInfo>

// Cancel order by customer (only WAITING orders)
async cancelOrder(orderId: string, phone: string): Promise<void>

// Get order history for phone number (last 10)
async getOrdersByPhone(phone: string): Promise<StoOrder[]>

// Check if customer has active order
async hasActiveOrder(phone: string): Promise<boolean>
```

**TrackingInfo Interface**:
```typescript
export interface TrackingInfo {
  orderId: string;
  queueNumber: number;           // Global queue number
  queueNumberInZone: number;     // Zone-specific number
  zone: string;
  status: StoOrderStatus;
  currentPosition: number;        // Current position in queue
  estimatedWaitMinutes: number;  // Estimated wait time
  canCancel: boolean;            // Only WAITING orders
  vehicleMake: string;
  vehicleModel: string;
  workType: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
```

**Security**:
- Phone number verification: customer must provide matching phone to track/cancel
- Only WAITING orders can be cancelled
- Rate limit cleared automatically when order is cancelled

---

### 3. Public Queue API Endpoints
**File**: `apps/sto-service/src/app/modules/qr-codes/controllers/public-queue.controller.ts`

#### Endpoints:

**1. Get Queue Info** (no auth)
```http
GET /api/public/queue/info?token=abc123
```
Response:
```json
{
  "zone": "A",
  "availableWorkTypes": ["maintenance", "repair", "diagnostic", "bodywork"],
  "estimatedWaitMinutes": 30
}
```

**2. Join Queue** (rate limited, no captcha)
```http
POST /api/public/queue/join
Content-Type: application/json

{
  "token": "abc123",
  "phone": "+992000111222",
  "customerName": "John Doe",
  "email": "john@example.com",
  "vehicleMake": "Toyota",
  "vehicleModel": "Camry",
  "vehicleYear": 2020,
  "licensePlate": "AA1234BB",
  "workType": "maintenance",
  "workDescription": "Oil change"
}
```
Response:
```json
{
  "success": true,
  "message": "Вы успешно записаны в очередь",
  "queueNumber": 15,
  "estimatedWaitMinutes": 30,
  "customerId": "uuid"
}
```

**3. Track Order Status**
```http
GET /api/public/queue/status/:orderId?phone=+992000111222
```
Response:
```json
{
  "orderId": "uuid",
  "queueNumber": 15,
  "queueNumberInZone": 8,
  "zone": "A",
  "status": "WAITING",
  "currentPosition": 3,
  "estimatedWaitMinutes": 20,
  "canCancel": true,
  "vehicleMake": "Toyota",
  "vehicleModel": "Camry",
  "workType": "maintenance",
  "createdAt": "2026-01-17T10:30:00Z"
}
```

**4. Cancel Order**
```http
POST /api/public/queue/cancel/:orderId
Content-Type: application/json

{
  "phone": "+992000111222"
}
```
Response:
```json
{
  "success": true,
  "message": "Заказ успешно отменён"
}
```

---

### 4. Enhanced OrdersService
**File**: `apps/sto-service/src/app/modules/orders/services/orders.service.ts`

**New Methods**:
```typescript
// Get current position in queue (1-indexed)
async getCurrentPosition(orderId: string): Promise<number>

// Get estimated wait time for zone
async getEstimatedWaitMinutes(zone: StoOrderZone): Promise<number>

// Find all orders with filters (added customerPhone filter)
async findAll(filters?: {
  zone?: StoOrderZone;
  status?: StoOrderStatus;
  workType?: string;
  customerPhone?: string; // NEW
}): Promise<StoOrder[]>
```

**Position Calculation**:
```typescript
// Count orders in same zone with lower queue number
const position = await this.ordersRepository
  .createQueryBuilder('order')
  .where('order.zone = :zone', { zone: order.zone })
  .andWhere('order.status = :status', { status: StoOrderStatus.WAITING })
  .andWhere('order.queueNumberInZone < :queueNumber', {
    queueNumber: order.queueNumberInZone,
  })
  .getCount();

return position + 1; // 1-indexed
```

**Wait Time Estimation**:
- Average: 15 minutes per order
- Formula: `waitingCount * 15`
- Zone-specific calculation

---

### 5. SMS Notifications Integration
**File**: `apps/sto-service/src/app/modules/notifications/services/notification.service.ts`

**Method Added**:
```typescript
private async sendSmsNotification(
  phone: string,
  message: string,
  orderId: string,
): Promise<void>
```

**Integration**:
- SMS notifications queued via RabbitMQ
- Handled by `StoEventProducer.publishNotificationRequest()`
- Routes to CRM MessagesModule
- Sends on: order created, status changed, ready for pickup

**Notification Flow**:
1. Customer joins queue → SMS: "Вы записаны в очередь #15, зона A"
2. Status changes to IN_PROGRESS → SMS: "Ваш автомобиль в работе"
3. Status changes to COMPLETED → SMS: "Ваш автомобиль готов, зона A"

---

## Architecture

### Module Dependencies
```
QrCodesModule
├── TypeORM: QrCode, CustomerCache, StoOrder
├── OrdersModule (imported)
├── Services:
│   ├── QrCodeService
│   ├── PublicQueueService (Redis rate limiting)
│   └── TrackingService (order tracking)
└── Controllers:
    ├── QrCodeController (admin CRUD)
    └── PublicQueueController (public API)
```

### Data Flow

**Queue Join Flow**:
```
1. Customer scans QR code
   → GET /api/public/queue/info?token=abc123

2. Customer fills form
   → POST /api/public/queue/join
   → PublicQueueService.checkRateLimit()
   → OrdersService.create()
   → PublicQueueService.setRateLimit()
   → StoEventProducer.publishNotificationRequest() [SMS]

3. Customer receives SMS with queue number
```

**Tracking Flow**:
```
1. Customer opens tracking URL
   → GET /api/public/queue/status/:orderId?phone=+992...
   → TrackingService.getTrackingInfo()
   → OrdersService.getCurrentPosition()
   → OrdersService.getEstimatedWaitMinutes()

2. Real-time updates via WebSocket (optional)
   → Display boards show queue movement
   → Position updates automatically
```

**Cancellation Flow**:
```
1. Customer clicks "Cancel"
   → POST /api/public/queue/cancel/:orderId
   → TrackingService.cancelOrder()
   → OrdersService.cancelOrder()
   → PublicQueueService.clearRateLimit()

2. Customer can join queue again immediately
```

---

## Security Measures

### 1. Rate Limiting (Redis-based)
- **Limit**: 1 order per phone number per 30 minutes
- **Bypass**: Admin can manually clear via `clearRateLimit()`
- **Storage**: Redis key-value with TTL
- **Reset**: Automatic after 30 minutes or manual cancellation

### 2. Phone Verification
- All tracking/cancellation requires matching phone number
- Prevents unauthorized access to order details
- No authentication tokens needed

### 3. No reCAPTCHA
- Removed per user request
- Rate limiting provides spam protection
- Future: can add back if abuse detected

### 4. QR Token Validation
- Tokens must be active (`isActive: true`)
- Expiration date checked
- Invalid tokens rejected with 400 error

---

## Testing Scenarios

### Test Case 1: Successful Queue Join
```bash
# 1. Get queue info
curl http://localhost:3002/api/public/queue/info?token=test-token-123

# 2. Join queue
curl -X POST http://localhost:3002/api/public/queue/join \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-token-123",
    "phone": "+992000111222",
    "customerName": "Test User",
    "vehicleMake": "Toyota",
    "vehicleModel": "Camry",
    "vehicleYear": 2020,
    "licensePlate": "AA1234BB",
    "workType": "maintenance"
  }'

# Expected: 200 OK with queue number
```

### Test Case 2: Rate Limit Exceeded
```bash
# 1. First join (success)
curl -X POST http://localhost:3002/api/public/queue/join \
  -H "Content-Type: application/json" \
  -d '{"phone": "+992000111222", ...}'

# 2. Second join within 30 minutes (fails)
curl -X POST http://localhost:3002/api/public/queue/join \
  -H "Content-Type: application/json" \
  -d '{"phone": "+992000111222", ...}'

# Expected: 400 Bad Request
# "Вы уже записаны в очередь. Пожалуйста, подождите 30 минут перед новой записью."
```

### Test Case 3: Order Tracking
```bash
# Track order status
curl "http://localhost:3002/api/public/queue/status/order-uuid?phone=%2B992000111222"

# Expected: Full tracking info with current position
```

### Test Case 4: Cancellation
```bash
# Cancel order
curl -X POST http://localhost:3002/api/public/queue/cancel/order-uuid \
  -H "Content-Type: application/json" \
  -d '{"phone": "+992000111222"}'

# Expected: 200 OK, rate limit cleared

# Verify rate limit cleared
curl -X POST http://localhost:3002/api/public/queue/join \
  -H "Content-Type: application/json" \
  -d '{"phone": "+992000111222", ...}'

# Expected: 200 OK (can join again immediately)
```

---

## Configuration

### Environment Variables
```env
# Redis connection (already configured in Phase 2)
REDIS_HOST=localhost
REDIS_PORT=6379

# Public URL for tracking links
PUBLIC_URL=https://sto.example.com

# RabbitMQ for SMS notifications (already configured)
RABBITMQ_URL=amqp://localhost:5672
```

### Redis Keys
```
rate_limit:phone:+992000111222  # TTL: 30 minutes
customer_cache:phone:+992000111222  # TTL: 1 hour (from Phase 2)
```

---

## Integration Points

### 1. WebSocket Gateway (Phase 2)
- Display boards receive real-time queue updates
- Customers can see position changes live
- No authentication required for public displays

### 2. RabbitMQ Producers (Phase 2)
- `sto_notification_request` queue for SMS
- Consumed by CRM MessagesModule
- Payload includes phone, message, priority

### 3. Customer Sync (Phase 2)
- `CustomerCache` entity stores customer data
- Redis caching reduces CRM API calls
- Auto-sync when new order created

---

## Future Enhancements

### Phase 3 Integration
- Angular UI library for public tracking page
- Real-time WebSocket connection for live updates
- Mobile-responsive design

### Possible Additions
- Email notifications (optional)
- WhatsApp notifications (via CRM)
- QR code regeneration on expiry
- Multi-language support (Russian/Tajik)
- Admin dashboard for QR code analytics

---

## Known Limitations

1. **No reCAPTCHA**: Spam protection relies solely on rate limiting
2. **Phone-only Auth**: No OTP/SMS verification
3. **30-minute Lock**: Strict rate limit may frustrate legitimate users
4. **No Multi-Order**: One order per phone at a time

### Recommended for Production
- Add phone OTP verification
- Adjust rate limit based on usage patterns
- Implement admin override UI
- Add abuse detection/IP blocking

---

## Success Metrics

✅ **Build**: Webpack compiled successfully (148 KiB)  
✅ **Redis Rate Limiting**: Functional with TTL  
✅ **Tracking API**: Full tracking info with position  
✅ **Cancellation**: Rate limit cleared on cancel  
✅ **SMS Integration**: Queued via RabbitMQ  
✅ **Security**: Phone verification enforced  

**Phase 2.5 Status**: **COMPLETE** 🎉

---

## Next Steps

### Phase 3: Angular UI Library
1. Create `libs/sto-ui` with Nx generator
2. Public tracking page component
3. Display board component (WebSocket)
4. Mechanic terminal component
5. Admin panel (QR CRUD, settings)

### Deployment
1. Docker image for sto-service
2. Kubernetes manifests (k8s/)
3. Environment-specific configs
4. Load testing (100+ concurrent displays)

---

**Documentation Date**: 2026-01-17  
**Phase**: 2.5 (QR Self-Service)  
**Status**: Complete  
**Next**: Phase 3 (Angular UI)
