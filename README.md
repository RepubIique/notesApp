# Discreet Chat Application

A secure, private 2-person chat application with password-based authentication.

## Project Structure

```
.
├── backend/                 # Express API server
│   ├── config/             # Configuration files (Supabase)
│   ├── middleware/         # Express middleware (auth)
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic services
│   ├── .env.example        # Environment variables template
│   ├── package.json        # Backend dependencies
│   └── server.js           # Express server entry point
│
├── frontend/               # React + Vite application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # React context providers
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions (API client)
│   │   ├── App.jsx        # Main app component
│   │   ├── main.jsx       # React entry point
│   │   └── index.css      # Global styles
│   ├── .env.example       # Environment variables template
│   ├── index.html         # HTML template
│   ├── package.json       # Frontend dependencies
│   └── vite.config.js     # Vite configuration
│
└── .kiro/specs/discreet-chat/  # Specification documents
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Basic knowledge of environment variables

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and configure the following required variables:

   **Authentication Variables:**
   - Generate password hashes:
     ```bash
     node -e "const bcrypt = require('bcrypt'); const salt = bcrypt.genSaltSync(10); console.log(bcrypt.hashSync('your_password_here', salt));"
     ```
   - Generate JWT secret:
     ```bash
     node -e "console.log(require('crypto').randomBytes(64).toString('hex'));"
     ```
   - Generate hash salt:
     ```bash
     node -e "console.log(require('bcrypt').genSaltSync(10));"
     ```

   **Supabase Variables:**
   - Get `SUPABASE_URL` from: Supabase Dashboard → Project Settings → API → Project URL
   - Get `SUPABASE_SERVICE_ROLE_KEY` from: Supabase Dashboard → Project Settings → API → service_role key

   See `backend/ENV_VARIABLES.md` for detailed documentation.

5. Set up Supabase database:
   - Run the SQL migrations in `backend/migrations/` in order:
     - `001_create_messages_table.sql`
     - `002_create_reactions_table.sql`
     - `003_create_push_subscriptions_table.sql` (optional)
   - Create the storage bucket as described in `backend/migrations/004_create_storage_bucket.md`

6. Start the development server:
   ```bash
   npm run dev
   ```

   The backend will run on `http://localhost:3000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and set:
   - `VITE_API_URL`: Backend API URL (default: `http://localhost:3000`)
   - `VITE_QUICK_EXIT_URL`: Optional quick exit URL (default: `https://www.google.com`)

5. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:5173`

### Verify Setup

1. Open `http://localhost:5173` in your browser
2. You should see the login page
3. Enter one of your configured passwords to authenticate
4. You should be redirected to the chat interface

### Running Tests

**Backend tests:**
```bash
cd backend
npm test
```

**Frontend tests:**
```bash
cd frontend
npm test
```

## Technology Stack

### Backend
- Node.js with Express
- JWT for authentication
- bcrypt for password hashing
- Supabase (Postgres + Storage)
- express-rate-limit for brute-force protection
- multer for file uploads

### Frontend
- React 18
- Vite for build tooling
- React Router for navigation
- Axios for API requests

## Environment Variables

### Backend Variables

| Variable | Required | Description | Requirement |
|----------|----------|-------------|-------------|
| `PORT` | Yes | Express server port | - |
| `FRONTEND_URL` | Yes | Frontend URL for CORS | - |
| `PASSWORD_A_HASH` | Yes | Bcrypt hash for Identity A password | 14.1 |
| `PASSWORD_B_HASH` | Yes | Bcrypt hash for Identity B password | 14.1 |
| `JWT_SECRET` | Yes | Secret for JWT signing | 14.2 |
| `HASH_SALT` | Yes | Salt for password hashing | 14.3 |
| `SUPABASE_URL` | Yes | Supabase project URL | 14.4 |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key | 14.4 |
| `VAPID_PUBLIC_KEY` | No | VAPID public key for push notifications | 14.5 |
| `VAPID_PRIVATE_KEY` | No | VAPID private key for push notifications | 14.5 |

See `backend/ENV_VARIABLES.md` for detailed documentation and generation instructions.

### Frontend Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API URL |
| `VITE_QUICK_EXIT_URL` | No | URL for quick exit button |

## Security Notes

- Never commit `.env` files to version control
- Keep `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and `VAPID_PRIVATE_KEY` secret
- Use strong, unique passwords for Identity A and B
- Rotate secrets regularly in production
- Use different secrets for development and production environments

## Next Steps

Follow the implementation tasks in `.kiro/specs/discreet-chat/tasks.md` to build out the application features.
