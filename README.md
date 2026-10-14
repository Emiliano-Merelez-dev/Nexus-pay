<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>
# Nexus Pay — Payment Gateway API 💳

Nexus Pay is a simulated payment gateway API built with **NestJS, TypeScript, and PostgreSQL**. It explores the backend architecture behind e-commerce payment workflows, including order management, payment processing, webhook handling, refunds, and financial movement tracking.

The project focuses on transactional integrity, data consistency, idempotent request handling, and concurrency control in operations that affect multiple database records.

> **Project scope:** Nexus Pay is a portfolio project integrating Mercado Pago's sandbox environment. It is an educational simulation, not a production payment processor.

## 🛠 Tech Stack

- **Backend:** NestJS, Node.js, TypeScript
- **Database:** PostgreSQL
- **ORM:** TypeORM
- **Payment integration:** Mercado Pago SDK
- **Testing:** Jest, Supertest, End-to-End (E2E) testing
- **Infrastructure:** Docker, Docker Compose
- **Validation:** DTOs, `class-validator`, `class-transformer`
- **API:** REST, Postman
- **Additional infrastructure:** Redis service configured with Docker Compose

## ✨ Key Features

- **Order management:** Create and manage orders associated with customers and merchants.
- **Payment processing:** Integrate with Mercado Pago's sandbox environment and track payment statuses.
- **Webhook handling:** Process payment events and synchronize local payment and order records.
- **Refund workflows:** Support partial and full refunds with validation against the remaining refundable amount.
- **Database transactions:** Coordinate related changes to refunds, payments, orders, and ledger entries.
- **Financial movement tracking:** Record credit entries for captured payments and debit entries for completed refunds.
- **Idempotency:** Use idempotency keys to handle repeated requests and avoid duplicate processing.
- **Concurrency control:** Apply PostgreSQL pessimistic locking in critical refund operations.
- **Automated testing:** Validate refund behavior, error scenarios, and concurrent refund-completion requests.

## 🗄️ Database Architecture

The relational schema models the main entities involved in the payment lifecycle.

| Entity             | Responsibility                                                       |
| ------------------ | -------------------------------------------------------------------- |
| `users`            | Stores user information.                                             |
| `merchants`        | Represents merchants associated with users.                          |
| `products`         | Stores products offered by merchants.                                |
| `orders`           | Tracks purchase orders and their status.                             |
| `orderItems`       | Stores order line items, quantities, and prices.                     |
| `payments`         | Tracks payment attempts, providers, amounts, and statuses.           |
| `refunds`          | Records full or partial refund requests and their statuses.          |
| `webhooks`         | Stores webhook events and processing information.                    |
| `ledger_entries`   | Records financial credit and debit movements.                        |
| `idempotency_keys` | Stores idempotency keys and associated request/response information. |

The separation between orders, payments, and refunds makes it possible to track the different stages of a transaction independently.

## 🧠 Engineering Challenges

### 1. Transactional Integrity and Concurrency

One of the main challenges was preventing concurrent requests from generating duplicate financial movements during refund processing.

For example, two requests attempting to complete the same refund could otherwise try to create the same debit ledger entry.

**Solution:** I implemented a transactional refund-completion flow using TypeORM and PostgreSQL pessimistic locking (`SELECT ... FOR UPDATE`).

The refund row is locked before the operation proceeds. Concurrent requests must wait for the active transaction to finish. Once the row becomes available, the application can check the current refund status and avoid generating a duplicate debit entry.

The transaction coordinates the refund status update, ledger entry creation, and payment status update.

### 2. PostgreSQL Locking and Entity Relations

During development, I encountered a PostgreSQL error when applying a pessimistic lock to a query involving the nullable side of an outer join.

**Solution:** I separated the operation into two steps:

1. Lock the refund row without loading its relations.
2. Retrieve the required related entities separately within the same transaction.

This avoids applying `FOR UPDATE` to the nullable side of an outer join while preserving the transactional workflow.

### 3. Webhook Integration

The application receives payment events from Mercado Pago's sandbox environment and uses the event data to identify the corresponding payment or order.

During development, I investigated webhook payload parsing, DTO transformation, and payment identifier extraction to ensure incoming events could be interpreted correctly and used to update local records.

### 4. Refund Validation and Financial Tracking

The refund workflow validates payment eligibility and prevents a requested refund from exceeding the remaining refundable balance.

Captured payments generate credit entries, while completed refunds generate debit entries. Payment and order statuses are updated according to the refund outcome.

## 🧪 Testing

The project includes E2E tests built with Jest and Supertest.

The refund test suite covers:

- Invalid request data and missing resources.
- Refund attempts against payments that have not been captured.
- Refund amounts exceeding the remaining refundable balance.
- Creation of pending refunds.
- Partial refunds and debit ledger entries.
- Full refunds and order cancellation.
- Prevention of duplicate debit entries.
- Concurrent attempts to complete the same refund.

**Refund E2E test result:** 10/10 tests passed in the test run performed during development.

Run the E2E suite with:

```bash
npm run test:e2e
```

The test script loads its configuration from `.env.test` and uses `jest-e2e.json`.

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm
- Docker and Docker Compose
- Mercado Pago sandbox credentials

### 1. Clone the repository

```bash
git clone https://github.com/Emiliano-Merelez-dev/Nexus-pay.git
cd Nexus-pay
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create the environment files needed for development and testing using the provided template:

```bash
cp .env.template .env
cp .env.template .env.test
```

Update each file with the appropriate database settings and Mercado Pago sandbox credentials. Use a separate test database for E2E tests.

See the Environment Variables section below for the required settings.

### 4. Start the infrastructure

Start PostgreSQL and Redis using Docker Compose:

```bash
docker compose up -d
```

The Compose configuration reads the PostgreSQL credentials and database name from the environment.

When running the NestJS application directly on your machine, `DB_HOST=localhost` matches the provided port mapping. If you later containerize the application itself, the database hostname should match the PostgreSQL service name instead.

### 5. Apply database migrations

The project provides a TypeORM migration command:

```bash
npm run migration:run
```

Run migrations against the intended database before starting the application, provided the migration history and current schema are compatible.

### 6. Start the development server

```bash
npm run start:dev
```

### 7. Run E2E tests

Configure `.env.test` to point to the test database, then run:

```bash
npm run test:e2e
```

## ⚙️ Environment Variables

The application uses environment variables for database connectivity and Mercado Pago integration.

| Variable            | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `DB_USERNAME`       | PostgreSQL username.                                                    |
| `DB_PASSWORD`       | PostgreSQL password.                                                    |
| `DB_HOST`           | PostgreSQL hostname.                                                    |
| `DB_PORT`           | PostgreSQL port.                                                        |
| `DB_NAME`           | Database name.                                                          |
| `MP_ACCESS_TOKEN`   | Mercado Pago sandbox access token.                                      |
| `MP_WEBHOOK_SECRET` | Secret used for webhook verification, if configured by the application. |

Never commit `.env`, `.env.test`, access tokens, webhook secrets, or other credentials to version control.

## 🎯 Project Goals

Nexus Pay was developed as a backend engineering portfolio project to practice:

- Designing relational database schemas for financial workflows.
- Building REST APIs with NestJS and TypeScript.
- Managing database transactions with TypeORM and PostgreSQL.
- Integrating an external payment provider in a sandbox environment.
- Processing webhook events and updating payment states.
- Implementing refund workflows and financial movement tracking.
- Handling idempotent requests and concurrent operations.
- Writing automated tests for critical business logic.
- Investigating and resolving database locking issues.

## ⚠️ Disclaimer

Nexus Pay is an educational simulation. It is not a certified payment gateway and is not intended to process real customer funds. Production use would require additional security controls, reconciliation procedures, operational monitoring, and a broader review of financial and regulatory requirements.
