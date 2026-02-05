# Meet Matt - Microservices

This directory contains the microservices architecture for Meet Matt.

## Quick Start

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f payment-service

# Stop all
docker-compose down
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| payment-service | 3001 | Payment processing |
| user-service | 3002 | User management |
| brain-service | 3003 | Devin AI integration |
| nginx | 80/443 | API Gateway |

## Development

Each service can be run independently:

```bash
cd payment-service
npm install
npm run dev
```

## Architecture

- **API Gateway**: Nginx routes requests to appropriate services
- **Message Queue**: Redis + BullMQ for async jobs
- **Database**: PostgreSQL (shared instance, separate schemas)
- **Communication**: REST APIs + events via message queue

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/meetmatt

# Redis
REDIS_URL=redis://localhost:6379

# External APIs
NOWPAYMENTS_API_KEY=
DEVIN_API_KEY=
JWT_SECRET=
```
