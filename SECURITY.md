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
- Platform Super Admin: manages the platform.
- Company Owner: manages their own company.
- Company Manager: manages authorized operations.
- Company Staff: accesses assigned features only.
- Customer: accesses only their permitted information.

## 4. Tenant Isolation
- Every company has a unique tenant ID.
- Verify tenant ownership on the server for every request.
- Never rely only on frontend restrictions.
- Enforce database-level tenant isolation where supported.
- Prevent cross-company access to all private records.
- Test unauthorized access attempts.

## 5. API Security
- Validate all incoming data.
- Authenticate protected requests.
- Check permissions for every operation.
- Apply rate limiting.
- Use HTTPS.
- Never expose private API keys to frontend code.

## 6. AI Safety
- Use only authorized company information.
- Never invent prices, availability, policies, or confirmations.
- Prevent information leakage between companies.
- Treat uploaded documents and customer messages as untrusted input.
- Require authorization before sensitive actions.
- Escalate uncertain or sensitive cases to a human.

## 7. Payments and Bookings
- Use trusted payment providers.
- Never store raw card numbers or CVV codes.
- Verify payment status with the provider.
- Confirm bookings only after availability is verified.
- Require approval for sensitive financial operations.

## 8. Monitoring and Auditing
- Record important security events.
- Monitor failed login attempts.
- Monitor unusual access patterns.
- Protect audit logs.
- Alert administrators about critical incidents.

## 9. Backups and Recovery
- Maintain encrypted backups.
- Test restoration procedures.
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
