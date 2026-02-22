# Environment Variables Documentation

This document provides detailed information about all environment variables used in the Discreet Chat backend application.

## Table of Contents

- [Quick Setup](#quick-setup)
- [Required Variables](#required-variables)
- [Optional Variables](#optional-variables)
- [Generating Values](#generating-values)
- [Security Best Practices](#security-best-practices)

## Quick Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Generate required secrets (see [Generating Values](#generating-values))

3. Configure Supabase credentials from your Supabase dashboard

4. Update `.env` with your actual values

## Required Variables

### Server Configuration

#### `PORT`
- **Description**: Port number for the Express server
- **Default**: `3000`
- **Example**: `3000`
- **Requirements**: N/A

#### `FRONTEND_URL`
- **Description**: Frontend URL for CORS configuration
- **Development**: `http://localhost:5173`
- **Production**: Your deployed frontend domain
- **Example**: `https://your-app.vercel.app`
- **Requirements**: N/A

### Authentication

#### `PASSWORD_A_HASH`
- **Description**: Bcrypt hashed password for Identity A
- **Requirements**: 14.1
- **Format**: Bcrypt hash string (starts with `$2b$`)
- **Example**: `$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`
- **Generate**: See [Generating Password Hashes](#generating-password-hashes)
- **Security**: Never store plaintext passwords

#### `PASSWORD_B_HASH`
- **Description**: Bcrypt hashed password for Identity B
- **Requirements**: 14.1
- **Format**: Bcrypt hash string (starts with `$2b$`)
- **Example**: `$2b$10$K8pq7vMNlPjdhgx3ZNSPaOjKaBdgm8q93meHxbe69MKAeM18miXYu`
- **Generate**: See [Generating Password Hashes](#generating-password-hashes)
- **Security**: Use a different password than Identity A

#### `JWT_SECRET`
- **Description**: Secret key for JWT token signing and verification
- **Requirements**: 14.2
- **Format**: Random string, minimum 32 characters (64+ recommended)
- **Example**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`
- **Generate**: See [Generating JWT Secret](#generating-jwt-secret)
- **Security**: Must be kept secret, never expose in frontend

#### `HASH_SALT`
- **Description**: Salt for bcrypt password hashing
- **Requirements**: 14.3
- **Format**: Bcrypt salt string (starts with `$2b$`)
- **Example**: `$2b$10$abcdefghijklmnopqrstuv`
- **Generate**: See [Generating Hash Salt](#generating-hash-salt)
- **Security**: Used for password verification

### Supabase Configuration

#### `SUPABASE_URL`
- **Description**: Supabase project URL
- **Requirements**: 14.4
- **Format**: `https://<project-id>.supabase.co`
- **Example**: `https://abcdefghijklmnop.supabase.co`
- **Find**: Supabase Dashboard → Project Settings → API → Project URL
- **Security**: Public value, safe to expose

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Description**: Supabase service role key with full database access
- **Requirements**: 14.4
- **Format**: JWT token string
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Find**: Supabase Dashboard → Project Settings → API → service_role key
- **Security**: **CRITICAL** - Keep secret, never expose in frontend code

## Optional Variables

### Push Notifications (PWA Feature)

These variables are only required if implementing PWA push notifications (Task 19).

#### `VAPID_PUBLIC_KEY`
- **Description**: VAPID public key for push notification subscriptions
- **Requirements**: 14.5
- **Format**: Base64 URL-safe string
- **Example**: `BAbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_ABCDEFGHIJKLMNOPQRSTUVWXYZ`
- **Generate**: See [Generating VAPID Keys](#generating-vapid-keys)
- **Security**: Public value, can be exposed in frontend

#### `VAPID_PRIVATE_KEY`
- **Description**: VAPID private key for sending push notifications
- **Requirements**: 14.5
- **Format**: Base64 URL-safe string
- **Example**: `abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG`
- **Generate**: See [Generating VAPID Keys](#generating-vapid-keys)
- **Security**: **CRITICAL** - Keep secret, never expose in frontend code

## Generating Values

### Generating Password Hashes

To generate a bcrypt hash for passwords:

```bash
node -e "const bcrypt = require('bcrypt'); const salt = bcrypt.genSaltSync(10); console.log(bcrypt.hashSync('your_password_here', salt));"
```

Replace `'your_password_here'` with your actual password. Run this command twice with different passwords for Identity A and Identity B.

**Example**:
```bash
# Generate hash for Identity A
node -e "const bcrypt = require('bcrypt'); const salt = bcrypt.genSaltSync(10); console.log(bcrypt.hashSync('SecurePasswordA123!', salt));"

# Generate hash for Identity B
node -e "const bcrypt = require('bcrypt'); const salt = bcrypt.genSaltSync(10); console.log(bcrypt.hashSync('SecurePasswordB456!', salt));"
```

### Generating JWT Secret

To generate a secure random JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'));"
```

This generates a 128-character hexadecimal string.

### Generating Hash Salt

To generate a bcrypt salt:

```bash
node -e "console.log(require('bcrypt').genSaltSync(10));"
```

The number `10` is the salt rounds (cost factor). Higher values are more secure but slower.

### Generating VAPID Keys

To generate VAPID keys for push notifications:

```bash
npx web-push generate-vapid-keys
```

This will output both public and private keys. Copy them to your `.env` file.

**Note**: You need to install `web-push` first:
```bash
npm install web-push
```

## Security Best Practices

### Critical Security Rules

1. **Never commit `.env` to version control**
   - Add `.env` to `.gitignore`
   - Only commit `.env.example` with placeholder values

2. **Keep secrets secret**
   - Never expose `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `HASH_SALT`, or `VAPID_PRIVATE_KEY` in frontend code
   - Never log these values in production
   - Never share these values in public channels

3. **Use strong passwords**
   - Use unique, complex passwords for Identity A and B
   - Minimum 12 characters with mixed case, numbers, and symbols
   - Never reuse passwords from other services

4. **Rotate secrets regularly**
   - Change JWT_SECRET periodically (will invalidate all sessions)
   - Update passwords if compromised
   - Regenerate VAPID keys if exposed

5. **Environment-specific values**
   - Use different secrets for development, staging, and production
   - Never use production secrets in development

### Deployment Considerations

#### Development
- Use `.env` file for local development
- Keep development secrets separate from production

#### Production
- Use environment variables provided by your hosting platform:
  - **Render**: Dashboard → Environment → Environment Variables
  - **Railway**: Dashboard → Variables
  - **Fly.io**: `fly secrets set KEY=value`
  - **Heroku**: `heroku config:set KEY=value`
- Never store production secrets in code or version control

#### CI/CD
- Use encrypted secrets in GitHub Actions, GitLab CI, etc.
- Limit access to production secrets to authorized personnel only

## Troubleshooting

### Common Issues

#### "Invalid JWT secret"
- Ensure `JWT_SECRET` is at least 32 characters long
- Check for extra whitespace or newlines in the value

#### "Authentication failed" for valid passwords
- Verify `PASSWORD_A_HASH` and `PASSWORD_B_HASH` are correct bcrypt hashes
- Ensure `HASH_SALT` matches the salt used to generate the hashes
- Check that passwords are being hashed correctly in the auth service

#### "Supabase connection failed"
- Verify `SUPABASE_URL` is correct and accessible
- Check `SUPABASE_SERVICE_ROLE_KEY` is the service role key, not the anon key
- Ensure your Supabase project is active

#### "Push notifications not working"
- Verify both `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are set
- Ensure keys were generated using `web-push generate-vapid-keys`
- Check browser console for subscription errors

### Validation Script

Create a script to validate your environment variables:

```javascript
// validate-env.js
const required = [
  'PORT',
  'FRONTEND_URL',
  'PASSWORD_A_HASH',
  'PASSWORD_B_HASH',
  'JWT_SECRET',
  'HASH_SALT',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const optional = [
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY'
];

console.log('Validating environment variables...\n');

let hasErrors = false;

required.forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ Missing required variable: ${key}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${key} is set`);
  }
});

optional.forEach(key => {
  if (!process.env[key]) {
    console.warn(`⚠️  Optional variable not set: ${key}`);
  } else {
    console.log(`✅ ${key} is set`);
  }
});

if (hasErrors) {
  console.error('\n❌ Environment validation failed');
  process.exit(1);
} else {
  console.log('\n✅ Environment validation passed');
}
```

Run with:
```bash
node validate-env.js
```

## Reference

### Requirements Mapping

| Variable | Requirements | Description |
|----------|-------------|-------------|
| `PASSWORD_A_HASH` | 14.1 | Identity A authentication |
| `PASSWORD_B_HASH` | 14.1 | Identity B authentication |
| `JWT_SECRET` | 14.2 | JWT token signing |
| `HASH_SALT` | 14.3 | Password hashing |
| `SUPABASE_URL` | 14.4 | Database connection |
| `SUPABASE_SERVICE_ROLE_KEY` | 14.4 | Database authentication |
| `VAPID_PUBLIC_KEY` | 14.5 | Push notifications (optional) |
| `VAPID_PRIVATE_KEY` | 14.5 | Push notifications (optional) |

### Related Documentation

- [Supabase Documentation](https://supabase.com/docs)
- [JWT.io](https://jwt.io/)
- [Bcrypt Documentation](https://www.npmjs.com/package/bcrypt)
- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)
- [VAPID Specification](https://tools.ietf.org/html/rfc8292)
