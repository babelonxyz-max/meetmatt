# Meet Matt - Microservices Architecture

**Version:** 1.0  
**Last Updated:** 2026-02-05  
**Status:** Design Phase

---

## Overview

Transitioning from monolithic Next.js app to microservices architecture for production scalability.

---

## Services

### 1. Payment Service
**Port:** 3001  
**Responsibilities:**
- Process crypto payments (NOWPayments integration)
- Payment status tracking
- Webhook handling
- Invoice generation
- Refund processing

**Database:** PostgreSQL (payments, transactions)

**APIs:**
- `POST /payments/create` - Create new payment
- `GET /payments/:id/status` - Check payment status
- `POST /webhooks/nowpayments` - Webhook receiver

---

### 2. User Service
**Port:** 3002  
**Responsibilities:**
- User registration/authentication
- Session management
- User preferences
- API key management
- Usage tracking

**Database:** PostgreSQL (users, sessions, api_keys)

**APIs:**
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /users/:id` - Get user profile
- `PUT /users/:id` - Update user
- `GET /users/:id/usage` - Get usage stats

---

### 3. Brain Service (Devin Integration)
**Port:** 3003  
**Responsibilities:**
- AI agent deployment via Devin
- Session management with Devin
- Build status tracking
- Code repository management
- Deployment orchestration

**Database:** PostgreSQL (agents, deployments, sessions)

**APIs:**
- `POST /agents/deploy` - Deploy new agent
- `GET /agents/:id/status` - Get deployment status
- `POST /agents/:id/rebuild` - Rebuild agent
- `GET /agents/:id/logs` - Get build logs

---

## Communication

### Inter-Service Communication
- **Message Queue:** Redis / RabbitMQ
- **REST APIs:** For synchronous calls
- **Events:** Async communication via message broker

### API Gateway
- **Tool:** Nginx / Kong / Custom
- **Responsibilities:**
  - Request routing
  - Rate limiting
  - Authentication verification
  - Load balancing

---

## Data Flow

```
User → Web App → API Gateway → Services
                     ↓
                Message Queue
                     ↓
              Microservices
```

### Payment Flow
1. User initiates payment → Web App
2. Web App → Payment Service
3. Payment Service → NOWPayments
4. Webhook → Payment Service
5. Payment Service → Message Queue → User Service (notify)
6. Payment Service → Message Queue → Brain Service (deploy on success)

### Deployment Flow
1. User confirms deployment → Web App
2. Web App → Brain Service
3. Brain Service → Devin API
4. Devin builds agent
5. Brain Service tracks status
6. Brain Service → Message Queue → User Service (notify on complete)

---

## Tech Stack

| Service | Runtime | Framework | Database |
|---------|---------|-----------|----------|
| Payment | Node.js | Express/Fastify | PostgreSQL |
| User | Node.js | Express/Fastify | PostgreSQL |
| Brain | Node.js | Express/Fastify | PostgreSQL |
| Gateway | Nginx | - | Redis |
| Queue | - | Bull/BullMQ | Redis |

---

## Environment Variables

### Payment Service
```
PORT=3001
DATABASE_URL=postgresql://...
NOWPAYMENTS_API_KEY=...
NOWPAYMENTS_IPN_SECRET=...
REDIS_URL=redis://...
```

### User Service
```
PORT=3002
DATABASE_URL=postgresql://...
JWT_SECRET=...
REDIS_URL=redis://...
```

### Brain Service
```
PORT=3003
DATABASE_URL=postgresql://...
DEVIN_API_KEY=...
REDIS_URL=redis://...
```

---

## Deployment

### Docker Compose (Development)
```yaml
version: '3.8'
services:
  payment:
    build: ./services/payment-service
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/payments
  
  user:
    build: ./services/user-service
    ports:
      - "3002:3002"
  
  brain:
    build: ./services/brain-service
    ports:
      - "3003:3003"
  
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
  
  redis:
    image: redis:7
    ports:
      - "6379:6379"
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

### Kubernetes (Production)
- Each service has its own deployment
- Horizontal Pod Autoscaling (HPA)
- Ingress for routing
- Secrets for sensitive data

---

## Migration Plan

### Phase 1: Setup (Current)
- [x] Create service directories
- [x] Document architecture
- [ ] Set up Docker Compose
- [ ] Create shared types library

### Phase 2: Extract Payment Service
- [ ] Create payment-service project
- [ ] Migrate payment logic from web app
- [ ] Set up NOWPayments integration
- [ ] Test independently

### Phase 3: Extract User Service
- [ ] Create user-service project
- [ ] Migrate user/auth logic
- [ ] Set up JWT authentication
- [ ] Test independently

### Phase 4: Extract Brain Service
- [ ] Create brain-service project
- [ ] Migrate Devin integration
- [ ] Set up deployment orchestration
- [ ] Test independently

### Phase 5: API Gateway
- [ ] Set up Nginx/Kong
- [ ] Configure routing rules
- [ ] Set up rate limiting
- [ ] SSL certificates

### Phase 6: Integration
- [ ] Update web app to use gateway
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Production deployment

---

## Current Structure

```
meetmatt/
├── app/                    # Web app (Next.js)
├── services/              # Microservices
│   ├── payment-service/   # Payment processing
│   ├── user-service/      # User management
│   └── brain-service/     # Devin integration
├── shared/                # Shared code
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   └── constants/        # Constants
├── docs/                  # Documentation
└── docker-compose.yml     # Local development
```

---

## Next Steps

1. Set up shared types library
2. Create base service template
3. Implement Payment Service
4. Docker Compose setup
5. Testing infrastructure
