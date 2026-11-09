# Ahlamy Universal AI — Security and Permissions

## 1. Security Principles
- Security must be built into every platform module.
- Protect every company's private data.
- Apply least-privilege access.
- Never trust data received directly from the browser.
- Keep secrets and API keys on the server.

## 2. Authentication
- Use secure authentication.
- Store passwords only as strong password hashes.
- Support secure password reset.
- Protect sessions and access tokens.
- Apply rate limits to login attempts.

## 3. User Roles

### Platform Super Admin
- Manage the entire platform.
- Manage tenant accounts.
- Monitor system health.
- Access company data only through authorized administrative procedures.

### Company Owner
- Manage their own company.
- Manage company users and permissions.
- Configure services and integrations.
- View their own company's reports.

### Company Manager
- Manage authorized company operations.
- Manage branches and customer support.

### Company Staff
- Access only assigned features and records.

### Customer
- Access only their own permitted information and interactions.

## 4. Tenant Isolation
- Every company has a unique tenant ID.
- Verify tenant ownership on the server for every request.
- Never rely only on frontend restrictions.
- Enforce database-level tenant isolation where supported.
- Prevent cross-company access to conversations, customers, products, orders, bookings, and documents.
- Test unauthorized access attempts.

## 5. API Security
- Validate all incoming data.
- Authenticate protected requests.
- Check permissions for every operation.
- Apply rate limiting.
- Use HTTPS.
- Protect against common web application vulnerabilities.
- Never expose private API keys to frontend code.

## 6. AI Safety
- Use only authorized company information.
- Do not invent prices, availability, policies, or confirmations.
- Do not allow one tenant's knowledge to appear in another tenant's answers.
- Treat uploaded documents and customer messages as untrusted input.
- Require authorization before sensitive actions.
- Escalate uncertain or sensitive cases to a human.

## 7. Payments and Bookings
- Use trusted payment providers.
- Never store raw card numbers or CVV codes.
- Verify payment status with the provider.
- Do not confirm bookings until availability and booking status are verified.
- Require explicit approval for sensitive financial operations.

## 8. Monitoring and Auditing
- Record important security events.
- Monitor failed login attempts.
- Monitor unusual access patterns.
- Protect audit logs from unauthorized changes.
- Alert administrators about critical incidents.

## 9. Backups and Recovery
- Maintain encrypted backups.
- Test restoration procedures.
- Define recovery objectives.
- Restrict backup access.
- Document incident response procedures.

## 10. Security Testing
Before production:
- Test authentication and permissions.
- Test tenant isolation.
- Test API security.
- Test file upload security.
- Test payment integration security.
- Review dependencies and vulnerabilities.
- Fix critical issues before launch.

## 11. Privacy
- Collect only necessary personal information.
- Define data retention periods.
- Support authorized data export and deletion.
- Follow applicable privacy laws in each operating market.
