# CRM Backend

This is the backend application for the CRM system, built with [NestJS](https://nestjs.com/).

## Overview

The backend provides a RESTful API and WebSocket services for the CRM, handling data management, communication integrations (Asterisk, SMS), and background processing.

## Key Technologies

- **Framework:** NestJS
- **Database:** PostgreSQL (via TypeORM)
- **Caching:** Redis
- **Message Queue:** RabbitMQ
- **Telephony:** Asterisk ARI (via `ari-client`)
- **API Documentation:** Swagger

## Getting Started

### Prerequisites

Ensure the following services are running (e.g., via Docker):
- PostgreSQL
- Redis
- RabbitMQ
- Asterisk (for telephony features)

### Running the Application

To start the backend in development mode:

```bash
nx serve back
```

The API will be available at `http://localhost:3000/api`.
Swagger documentation is available at `http://localhost:3000/swagger`.

### Testing

Run unit tests:

```bash
nx test back
```

Run e2e tests:

```bash
nx e2e back-e2e
```
