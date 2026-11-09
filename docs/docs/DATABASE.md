# Ahlamy Universal AI — Database Design

## 1. Database Principles
- Use a reliable relational database.
- Support multiple companies (multi-tenancy).
- Every company has a unique tenant ID.
- Enforce tenant isolation at database and server levels.
- Use migrations to manage database changes.
- Maintain backups and audit logs.

## 2. Core Tables

### Tenants
Stores company accounts:
- id
- name
- country
- industry
- preferred_language
- subscription_plan
- status
- created_at

### Users
Stores platform users:
- id
- tenant_id
- name
- email
- password_hash
- role
- status
- created_at

### Branches
Stores company branches:
- id
- tenant_id
- name
- address
- latitude
- longitude
- phone
- opening_hours
- status

### Knowledge Documents
Stores company knowledge:
- id
- tenant_id
- title
- content
- language
- document_type
- created_at
- updated_at

### Conversations
Stores AI conversations:
- id
- tenant_id
- customer_id
- channel
- language
- status
- created_at

### Messages
Stores conversation messages:
- id
- tenant_id
- conversation_id
- sender_type
- content
- created_at

### Customers
Stores customer information:
- id
- tenant_id
- name
- email
- phone
- preferred_language
- created_at

### Products and Services
Stores company offerings:
- id
- tenant_id
- branch_id
- name
- description
- price
- currency
- availability_status

### Orders
Stores customer orders:
- id
- tenant_id
- customer_id
- status
- total_amount
- currency
- created_at

### Bookings
Stores reservations and appointments:
- id
- tenant_id
- customer_id
- branch_id
- booking_type
- start_time
- end_time
- status

### Payments
Stores payment references:
- id
- tenant_id
- order_id
- provider
- provider_reference
- amount
- currency
- status
- created_at

### Audit Logs
Tracks important actions:
- id
- tenant_id
- user_id
- action
- resource_type
- resource_id
- created_at

## 3. Data Isolation Rules
- Every tenant-owned record must contain tenant_id.
- The server must verify tenant access on every request.
- Never trust tenant_id supplied by the browser alone.
- Use database-level security policies where supported.
- Prevent cross-tenant reads, writes, updates, and deletes.
- Test isolation between different companies.

## 4. Relationships
- One tenant can have many users.
- One tenant can have many branches.
- One tenant can have many customers.
- One tenant can have many knowledge documents.
- One customer can have many conversations.
- One conversation can have many messages.
- One customer can have many orders and bookings.
- Orders can have payment records.

## 5. Security and Privacy
- Never store plain-text passwords.
- Do not store raw card numbers or CVV codes.
- Use trusted payment providers.
- Protect personal information.
- Apply access permissions by role.
- Record sensitive administrative actions.
- Define data retention and deletion policies.

## 6. Future Expansion
The database should support:
- Multiple currencies.
- Multiple countries and time zones.
- Arabic, French, and English.
- Industry-specific features.
- External integrations.
- Subscription management.
- Analytics and reporting.
