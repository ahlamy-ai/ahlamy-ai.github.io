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

## 11. Existing Assets
Preserve the existing Ahlamy website and its GitHub Pages deployment.

Preserve the existing Botpress Ahlamy Lead Qualification bot.

Do not delete or replace existing assets without an approved migration plan.

## 12. Quality Requirements
Every phase must be tested before moving to the next phase.

The platform must be designed for reliability, scalability, maintainability, and security.

No system can be assumed to be error-free; monitoring and continuous testing are required.
