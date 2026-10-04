# Office Attendance

Full-stack office attendance application with React/Vite, Express, and MongoDB/Mongoose. Authentication, employee location verified punch-in, and late attendance email notifications are implemented. Broader HR workflows are not implemented.

## Project structure

```text
client/                 React frontend built with Vite
  src/                  Application entry point, UI, and styles
server/                 Express API
  src/config/            Environment and MongoDB setup
  src/routes/            API route modules
  .env.example           Backend environment variable template
package.json             Root scripts for running both apps
```

## Install

Install the root and application dependencies:

```sh
npm install
npm install --prefix client
npm install --prefix server
```

Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` to your MongoDB instance. The example values are local development defaults, not credentials.

## Run

Start the frontend and backend together from the repository root:

```sh
npm run dev
```

The frontend runs at `http://localhost:5173`; the API runs at `http://localhost:5000`. The client proxies `/api` requests to the API. You can also run them individually with `npm run dev:client` or `npm run dev:server`.

Check the API at `http://localhost:5000/api/health`.

## Backend environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | API listening port |
| `MONGODB_URI` | MongoDB connection string |
| `CLIENT_ORIGIN` | Frontend origin allowed by CORS |
| `JWT_SECRET` | Secret used to sign authentication tokens (at least 32 characters) |
| `JWT_EXPIRES_IN` | Token lifetime (defaults to `1d`) |
| `OFFICE_LATITUDE` | Office latitude used for server-side distance calculation |
| `OFFICE_LONGITUDE` | Office longitude used for server-side distance calculation |
| `OFFICE_RADIUS_METERS` | Allowed distance from the office in meters (defaults to `100`) |
| `EMAIL_USER` | Gmail account used to send notifications |
| `EMAIL_APP_PASSWORD` | Gmail App Password for Nodemailer SMTP authentication |
| `HR_EMAIL` | HR mailbox receiving late attendance notifications |

The API provides `POST /api/auth/register`, `POST /api/auth/login`, protected `GET /api/auth/me`, `GET /api/attendance/today`, and `POST /api/attendance/punch-in`. Attendance routes require an employee account. Punch-in coordinates come from browser geolocation, while distance and the 100 meter boundary are calculated and enforced by the backend. Attendance dates and displayed punch-in times use India Standard Time; punch-ins before 11:00 AM IST are marked Present, and punch-ins at or after 11:00 AM IST are marked Late. Late punches trigger an employee warning and an HR notification. A daily HTML attendance report is scheduled for 12:00 PM IST and includes Present, Late, and Absent employees. Successful reports are recorded per date to prevent duplicate sends. Email errors are logged without logging credential values, and do not roll back attendance. Tokens are held in browser local storage for this assignment; use HTTPS in deployed environments and consider an HttpOnly cookie design for production. Self-service registration creates employee accounts. HR accounts should be provisioned through a trusted administrative process.

For Gmail, copy `server/.env.example` to `server/.env`, then replace `EMAIL_USER`, `EMAIL_APP_PASSWORD`, and `HR_EMAIL` with your values. Put your Gmail App Password in `EMAIL_APP_PASSWORD` (not your normal Gmail password). Leave these placeholder values in place during a safe test; the email service recognizes them and skips the SMTP connection. `.env` is gitignored and must not be committed.

To manually trigger the same daily report job for development, run `npm run report:daily --prefix server` from the repository root. It uses the current IST date and the same per-date duplicate protection as the scheduled run. It will report a skipped result if today’s report was already sent, and can retry a previous failed send.

Keep secrets in `.env` files or a secret manager.
