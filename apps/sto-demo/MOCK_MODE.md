# Mock Mode Implementation - Phase 4.1

## Overview
Добавлен mock режим для работы всех компонентов без запущенного backend сервера.

**Status**: ✅ Complete  
**Date**: 2026-01-18  
**Impact**: Demo приложение полностью функционально offline

---

## Changes Summary

### 1. ✅ StoApiService Mock Mode
**File**: `libs/src/lib/services/sto-api.service.ts`

**Added Features**:
- Demo token support (`demo-zone-a`, `demo-zone-b`, `demo-zone-c`)
- Automatic fallback to mock data on network errors
- Mock responses for all endpoints with 300-500ms delay

**Endpoints with Mock**:
- `getQueueInfo()` - Returns mock zone info
- `joinQueue()` - Returns mock queue number
- `trackOrder()` - Returns mock tracking info
- `cancelOrder()` - Returns mock success response

**Demo Tokens**:
```typescript
'demo-zone-a' → Зона A
'demo-zone-b' → Зона B
'demo-zone-c' → Зона C
```

**Mock Data**:
```typescript
{
  zone: 'Зона Demo',
  availableWorkTypes: ['maintenance', 'repair', 'diagnostics', 'tire-service'],
  estimatedWaitMinutes: 45
}
```

### 2. ✅ StoWebSocketService Mock Mode
**File**: `libs/src/lib/services/sto-websocket.service.ts`

**Added Features**:
- Connection timeout fallback (5 seconds)
- Mock order generation (12 sample orders)
- Real-time simulation (status updates every 5 seconds)
- Automatic cleanup on disconnect

**Mock Orders**:
- 12 orders across 3 zones (A, B, C)
- Mix of statuses: WAITING, IN_PROGRESS, COMPLETED
- 4 work types: maintenance, repair, diagnostics, tire-service
- 3 priorities: NORMAL, HIGH, URGENT
- Sample vehicles: Toyota, BMW, Mercedes, Honda, Nissan, Mazda

**Real-time Simulation**:
```typescript
WAITING → IN_PROGRESS (assign mechanic)
IN_PROGRESS → COMPLETED (set completion time)
Updates every 5 seconds
```

### 3. ✅ QrJoinFormComponent Enhancement
**File**: `libs/src/lib/components/qr-join-form/qr-join-form.component.ts`

**Changed Behavior**:
- **Before**: Error if no token in URL
- **After**: Default to `demo-zone-a` token

**Impact**: Component always loads successfully

---

## Usage Examples

### QR Join Form (No Token)
```
URL: http://localhost:4200/join
Result: Loads with demo-zone-a token
Zone: Зона Demo
Work Types: 4 options available
```

### QR Join Form (Demo Token)
```
URL: http://localhost:4200/join?token=demo-zone-b
Result: Loads with Зона B
Estimated Wait: 45 minutes
```

### Display Board (Mock Mode)
```
URL: http://localhost:4200/display
Connection: Fails after 5s → switches to mock mode
Orders: 12 sample orders displayed
Updates: Every 5 seconds (status changes)
```

### Tracking Page (Mock Mode)
```
URL: http://localhost:4200/track/test-001?phone=79991234567
Result: Mock tracking info
Position: 5 of 12
Wait Time: 30 minutes
Can Cancel: Yes
```

---

## Technical Details

### Error Handling Pattern
```typescript
return this.http.get<T>(url).pipe(
  catchError((error) => {
    console.warn('Backend unavailable, using mock data:', error);
    return of(mockData).pipe(delay(300));
  })
);
```

### Mock Data Generation
```typescript
private generateMockOrders(): StoOrder[] {
  return Array.from({ length: 12 }, (_, i): StoOrder => ({
    id: `mock-order-${i + 1}`,
    queueNumber: i + 1,
    zone: zones[i % 3],
    status: statuses[i % 3],
    // ... other fields
  }));
}
```

### Connection Timeout
```typescript
const connectionTimeout = setTimeout(() => {
  if (!this.connected()) {
    console.warn('WebSocket connection failed, using mock mode');
    this.startMockMode(displayId, filters);
  }
}, 5000);
```

---

## Benefits

### 1. **Offline Demo**
- Полная функциональность без backend
- Идеально для презентаций
- Быстрое тестирование UI

### 2. **Development**
- Разработка frontend без backend
- Независимые команды
- Быстрый прототипинг

### 3. **Testing**
- Консистентные тестовые данные
- Predictable behavior
- Edge cases coverage

### 4. **User Experience**
- Graceful degradation
- No breaking errors
- Informative console logs

---

## Console Output

### Normal Flow (Backend Available)
```
WebSocket connected
Queue update received: 15
```

### Mock Mode (Backend Unavailable)
```
Backend unavailable, using mock data: HttpErrorResponse {...}
WebSocket connection failed, using mock mode
Starting mock mode with sample data
```

---

## API Compatibility

### Production Mode
```typescript
// Backend must be running on port 3002
// All endpoints: http://localhost:3002/api/...
// WebSocket: ws://localhost:3002/sto-queue
```

### Mock Mode (Automatic Fallback)
```typescript
// No backend required
// HTTP calls return mock data after 300-500ms
// WebSocket uses interval-based simulation
```

---

## Known Limitations

### 1. Mock Data Static
- Same 12 orders on each load
- Limited variation
- **Solution**: Add more random generation

### 2. No Persistence
- Changes lost on reload
- No database
- **Solution**: Add localStorage caching

### 3. Simplified Logic
- No queue position recalculation
- No mechanic availability
- **Solution**: Add state management

### 4. Fixed Delays
- Network delays hardcoded (300-500ms)
- **Solution**: Make configurable

---

## Future Enhancements

### Phase 4.2: Advanced Mock Mode
- [ ] Configurable mock scenarios
- [ ] localStorage persistence
- [ ] Mock admin dashboard
- [ ] Realistic queue logic
- [ ] Variable network delays
- [ ] Error simulation mode

### Phase 4.3: Testing Integration
- [ ] Mock mode flag in environment
- [ ] Cypress intercept integration
- [ ] Playwright mock server
- [ ] Storybook integration

---

## Configuration

### Enable/Disable Mock Mode
```typescript
// Currently: Always enabled as fallback

// Future: Environment flag
export const environment = {
  production: false,
  stoApiUrl: 'http://localhost:3002',
  mockMode: true, // Force mock even if backend available
};
```

### Mock Data Customization
```typescript
// In sto-websocket.service.ts
private generateMockOrders(): StoOrder[] {
  // Customize: zones, statuses, work types, priorities
  const zones = ['A', 'B', 'C', 'D']; // Add more zones
  const orderCount = 20; // Increase order count
  // ...
}
```

---

## Testing Checklist

### ✅ QR Join Form
- [x] Loads without token (uses default)
- [x] Loads with demo-zone-a token
- [x] Loads with demo-zone-b token
- [x] Shows 4 work types
- [x] Form submission works
- [x] Shows success screen
- [x] Displays mock queue number

### ✅ Display Board
- [x] Connects and shows 12 orders
- [x] Status badges color-coded
- [x] Orders auto-update every 5s
- [x] Zone filter works
- [x] Work type filter works
- [x] Connection status shows "connected"

### ✅ Tracking Page
- [x] Loads with mock data
- [x] Shows position in queue
- [x] Shows estimated wait time
- [x] Cancel button works
- [x] Success message on cancel

### ✅ Mechanic Terminal
- [x] PIN login works (1234, 5678, 9999)
- [x] Shows available orders
- [x] Take order button works
- [x] Complete order button works
- [x] Timers increment

---

## Deployment Notes

### Development
- Mock mode enabled automatically
- No configuration needed
- Works offline

### Production
- Backend must be available
- Mock mode as fallback only
- Monitor console for warnings

---

**Status**: ✅ All components fully functional offline  
**Demo URL**: http://localhost:4200/  
**Backend Optional**: Yes (graceful fallback)  
**Ready for**: Presentations, offline demos, frontend development
