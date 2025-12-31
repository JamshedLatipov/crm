import axios, { AxiosInstance } from 'axios';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3001/api';

describe('API Gateway E2E Tests', () => {
  let api: AxiosInstance;
  let authToken: string;
  let testUserId: number;

  beforeAll(async () => {
    api = axios.create({
      baseURL: GATEWAY_URL,
      timeout: 10000,
      validateStatus: () => true,
    });
  });

  describe('Health Checks', () => {
    it('should return health status', async () => {
      const response = await api.get('/health');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'ok');
    });

    it('should return readiness status', async () => {
      const response = await api.get('/health/ready');
      expect(response.status).toBe(200);
    });

    it('should return liveness status', async () => {
      const response = await api.get('/health/live');
      expect(response.status).toBe(200);
    });
  });

  describe('Authentication Flow', () => {
    const testUser = {
      username: `testuser_${Date.now()}`,
      password: 'testpassword123',
      roles: ['operator'],
      firstName: 'Test',
      lastName: 'User',
    };

    it('should register a new user', async () => {
      const response = await api.post('/auth/register', testUser);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('access_token');
      expect(response.data).toHaveProperty('user');
      expect(response.data.user.username).toBe(testUser.username);
      
      testUserId = response.data.user.id;
    });

    it('should login with registered user', async () => {
      const response = await api.post('/auth/login', {
        username: testUser.username,
        password: testUser.password,
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('access_token');
      
      authToken = response.data.access_token;
    });

    it('should reject invalid credentials', async () => {
      const response = await api.post('/auth/login', {
        username: testUser.username,
        password: 'wrongpassword',
      });
      
      expect(response.status).toBe(401);
    });

    it('should validate token', async () => {
      const response = await api.post('/auth/validate', {
        token: authToken,
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('valid', true);
    });
  });

  describe('Protected Routes', () => {
    it('should reject requests without token', async () => {
      const response = await api.get('/leads');
      expect(response.status).toBe(401);
    });

    it('should accept requests with valid token', async () => {
      const response = await api.get('/leads', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      
      expect(response.status).toBe(200);
    });
  });

  describe('Leads CRUD', () => {
    let leadId: number;

    it('should create a lead', async () => {
      const lead = {
        firstName: 'John',
        lastName: 'Doe',
        email: `john.doe.${Date.now()}@example.com`,
        phone: '+1234567890',
        company: 'Test Company',
        source: 'website',
        estimatedValue: 10000,
      };

      const response = await api.post('/leads', lead, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.firstName).toBe(lead.firstName);
      
      leadId = response.data.id;
    });

    it('should get lead by id', async () => {
      const response = await api.get(`/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(leadId);
    });

    it('should update lead', async () => {
      const update = {
        status: 'contacted',
        estimatedValue: 15000,
      };

      const response = await api.patch(`/leads/${leadId}`, update, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('contacted');
      expect(response.data.estimatedValue).toBe(15000);
    });

    it('should get leads list', async () => {
      const response = await api.get('/leads', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data || response.data)).toBe(true);
    });

    it('should search leads', async () => {
      const response = await api.get('/leads/search?q=John', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
    });

    it('should delete lead', async () => {
      const response = await api.delete(`/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(204);
    });
  });

  describe('Contacts CRUD', () => {
    let contactId: number;

    it('should create a contact', async () => {
      const contact = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: `jane.smith.${Date.now()}@example.com`,
        phone: '+1987654321',
        company: 'Tech Corp',
      };

      const response = await api.post('/contacts', contact, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      
      contactId = response.data.id;
    });

    it('should get contact by id', async () => {
      const response = await api.get(`/contacts/${contactId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(contactId);
    });

    it('should update contact', async () => {
      const response = await api.patch(`/contacts/${contactId}`, {
        position: 'CTO',
      }, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
    });

    it('should delete contact', async () => {
      const response = await api.delete(`/contacts/${contactId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(204);
    });
  });

  describe('Deals CRUD', () => {
    let dealId: number;

    it('should create a deal', async () => {
      const deal = {
        title: `Test Deal ${Date.now()}`,
        value: 50000,
        probability: 75,
      };

      const response = await api.post('/deals', deal, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      
      dealId = response.data.id;
    });

    it('should get deal by id', async () => {
      const response = await api.get(`/deals/${dealId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
    });

    it('should update deal', async () => {
      const response = await api.put(`/deals/${dealId}`, {
        value: 75000,
        probability: 85,
      }, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
    });

    it('should get deals stats', async () => {
      const response = await api.get('/deals/stats', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
    });

    it('should delete deal', async () => {
      const response = await api.delete(`/deals/${dealId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(204);
    });
  });

  describe('Tasks CRUD', () => {
    let taskId: number;

    it('should create a task', async () => {
      const task = {
        title: `Test Task ${Date.now()}`,
        description: 'Test task description',
        priority: 'high',
        type: 'call',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      };

      const response = await api.post('/tasks', task, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      
      taskId = response.data.id;
    });

    it('should get task by id', async () => {
      const response = await api.get(`/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
    });

    it('should complete task', async () => {
      const response = await api.patch(`/tasks/${taskId}`, {
        status: 'completed',
      }, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
    });

    it('should get my tasks', async () => {
      const response = await api.get('/tasks/my', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
    });

    it('should delete task', async () => {
      const response = await api.delete(`/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(204);
    });
  });

  describe('Notifications', () => {
    it('should get notifications', async () => {
      const response = await api.get('/notifications', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
    });

    it('should get unread count', async () => {
      const response = await api.get('/notifications/unread/count', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Users', () => {
    it('should get current user profile', async () => {
      const response = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('username');
    });

    it('should update user profile', async () => {
      const response = await api.patch('/users/me', {
        firstName: 'Updated',
      }, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
    });

    it('should get users list', async () => {
      const response = await api.get('/users', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
    });
  });
});
