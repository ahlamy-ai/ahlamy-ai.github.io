# Ahlamy Universal AI — System Architecture

## 1. Vision
Ahlamy Universal AI is one centralized, multilingual AI platform serving businesses across different countries and industries.

The platform must support multiple companies without mixing their data.

## 2. Architecture Principles
- One central platform and shared AI engine.
- Multi-tenant architecture.
- Strict server-side tenant data isolation.
- Modular and scalable codebase.
- API-first design.
- Security and privacy by default.
- Human approval for sensitive operations.
- Monitoring, logging, backups, and automated testing.

## 3. Company Isolation
Every company must have a unique tenant ID.

Each tenant has independent:
- Company profile and settings.
- Users and permissions.
- Knowledge base and documents.
- AI configuration.
- Conversations and customer records.
- Products and services.
- Prices and availability.
- Orders and bookings.
- Branches and locations.
- Reports and integrations.

All database queries must enforce tenant authorization on the server.

A company must never access another company's private information.

## 4. Languages
The platform supports:
- Arabic with RTL layout.
- French.
- English.

The AI should detect the customer's language automatically and allow manual language selection.

## 5. Main Platform Modules
- Authentication and authorization.
- Tenant management.
- AI engine and conversation management.
- Company knowledge bases.
- Customer and lead management.
- Products and services.
- Orders and bookings.
- Payments through secure providers.
- Branches and smart locations.
- Notifications and follow-ups.
- Human support and escalation.
- Analytics and reporting.
- Administration dashboard.

## 6. Industry Support
The platform should be configurable for:
- E-commerce stores.
- Hotels and tourism.
- Real estate agencies.
- Restaurants.
- Education and training.
- SaaS and software companies.
- Marketing agencies.
- Professional services.
- Manufacturing and other industries.

Each company activates only the features it needs.

## 7. Smart Location
Support multiple branches per company.

Each branch can store:
- Name and address.
- Geographic coordinates.
- Phone number.
- Opening hours.
- Website.
- Services available at that branch.

Customers can view branch information and open directions through supported map services.

## 8. AI Operations
The AI must use verified company information.

It must never invent:
- Prices.
- Product availability.
- Property availability.
- Booking confirmations.
- Payment status.
- Business policies.

Sensitive actions require secure integrations and appropriate authorization.

Human approval is required where necessary.

## 9. Security
- Secure authentication.
- Role-based access control.
- Server-side tenant authorization.
- Encrypted communication.
- Protected secrets and API keys.
- Input validation.
- Rate limiting.
- Audit logs.
- Secure backups.
- Security testing.

## 10. Development Phases
Phase 1: Project structure and technical foundations.

Phase 2: Database design and tenant isolation.

Phase 3: Authentication and permissions.

Phase 4: Company dashboards and management.

Phase 5: AI engine and knowledge bases.

Phase 6: Products, services, branches, and locations.

Phase 7: Orders, bookings, and payment integrations.

Phase 8: Notifications, analytics, and automation.

Phase 9: Testing, security review, and deployment.

## 11. Tenant-Specific Website Assistant

Every new tenant receives a private AI widget configuration automatically when its tenant record is created.

- Each tenant has a unique public widget key and an explicit HTTPS origin allowlist.
- The public widget never accepts a tenant ID from the browser; the server resolves the tenant from the widget key.
- Browser chat sessions use random session tokens stored only as SHA-256 hashes in the database and expire after 24 hours.
- Public requests are origin-checked and rate-limited. The origin allowlist is a browser boundary, not a substitute for authentication or rate limiting.
- Customer messages are inserted and enqueued in the same database transaction. A queue failure rolls back the message insert rather than leaving an unprocessed message.
- The worker reads only the resolved tenant's company profile, knowledge documents, and products/services.
- Assistant completion is idempotent. Repeated queue delivery cannot create duplicate assistant replies.
- Failed jobs are retried and moved to a service-role-only dead-letter table after five attempts.
- Worker invocation uses a separate random token stored in Supabase Vault; the service-role key is never embedded in a public page or widget.

The widget is available to company owners in the dashboard as an embed snippet. The company must add its own website origin and place the snippet on its website; Ahlamy cannot automatically install code on a third-party website.

## 12. Existing Assets
Preserve the existing Ahlamy website and its GitHub Pages deployment.

Preserve the existing Botpress Ahlamy Lead Qualification bot.

Do not delete or replace existing assets without an approved migration plan.

## 13. Quality Requirements
Every phase must be tested before moving to the next phase.

The platform must be designed for reliability, scalability, maintainability, and security.

No system can be assumed to be error-free; monitoring and continuous testing are required.
