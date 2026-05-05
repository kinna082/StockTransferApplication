# Frontend Setup

## Run

From `frontend`:

1. `npm install`
2. `npm run dev`

Optional:

- Create `.env` and set `VITE_API_BASE_URL=http://localhost:5080/api` if your backend URL is different.
- Access token refresh is automatic using refresh token rotation.

## Routes

- `/login` - login page
- `/manager/transfers/new` - create stock transfer
- `/manager/transfers` - manager dashboard
- `/admin/transfers` - admin dashboard
