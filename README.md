Side-MyProject — Car Articles Frontend + Backend

A small full-stack project (React + Vite frontend, Express backend, PostgreSQL) for publishing short car-related articles with comments and admin tools.

This README documents how to run the client and server locally, how the project is structured, and where to find the important pieces.

## Table of contents

- Project overview
- Tech stack
- Repo layout
- Local setup (Windows)
	- Prerequisites
	- Environment variables
	- Database setup
	- Run server
	- Run client
- Development notes
- Useful scripts
- Contact

## Project overview

The project contains a React frontend (Vite) and a Node/Express backend (server). Features include:

- Article listing and detail pages
- Commenting (with reply threads)
- Authentication (register / login / reset password)
- Admin routes for creating/editing articles and categories
- Image uploads (Cloudinary or local uploads depending on config)

## Tech stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express
- Database: PostgreSQL
- Auth: JWT-based
- Storage: Cloudinary (optional) or local uploads

## Repo layout

- `client/` — React app (Vite)
	- `src/` — React source files
	- `public/` — static assets
	- `package.json` — frontend scripts
- `server/` — Express backend
	- `routes/`, `apps/`, `middleware/` — API routes and helpers
	- `utils/database.js` — DB connection
	- `package.json` — server scripts
	- SQL setup scripts (e.g. `setup-tables.sql`)

## Local setup (Windows)

### Prerequisites

- Node.js (16+ recommended)
- npm or yarn
- PostgreSQL (psql)
- Optional: Cloudinary account (if you want image hosting)

Open two terminals (PowerShell recommended): one for the server and one for the client.

### Environment variables

Create `.env` files in both `server/` and `client/` if needed. Example values (populate with your secrets):

server/.env (example)

NODE_ENV=development
PORT=4000
DATABASE_URL=postgres://user:password@localhost:5432/side_myproject
JWT_SECRET=your_jwt_secret_here
CLOUDINARY_URL=cloudinary://key:secret@cloud_name    # optional

client/.env (example)

VITE_API_BASE_URL=http://localhost:4000
VITE_CLOUDINARY_URL=...   # optional

Make sure to restart the servers after changing environment variables.

### Database setup

1. Create the database in PostgreSQL (example PowerShell commands):

```powershell
# create database (replace names as needed)
createdb side_myproject
# or inside psql:
# CREATE DATABASE side_myproject;
```

2. Run the SQL setup scripts in `server/` to create tables and seed sample data. You can use psql to run the `.sql` files, e.g.:

```powershell
psql -d side_myproject -f .\server\setup-tables.sql
psql -d side_myproject -f .\server\setup-sample-articles.sql
```

Adjust filenames if you want to run specific setup scripts (users, comments, notifications, etc.).

### Run server

From the repo root:

```powershell
cd .\server
npm install
npm run dev
```

The server listens on `PORT` from `.env` (default `4000`).

### Run client

Open a second terminal:

```powershell
cd .\client
npm install
npm run dev
```

Vite serves the client (usually on http://localhost:5173). The client expects the API base URL in `VITE_API_BASE_URL`.

## Development notes

- The frontend uses Tailwind utility classes. Edit component files under `client/src/Components/` and page files under `client/src/pages/`.
- The backend routes live under `server/routes/`. API endpoints for articles, comments, categories, and notifications are grouped there.
- `server/utils/database.js` exports a Postgres client used across the server.
- Authentication middleware is in `server/middleware/auth.js`.
- File uploads are handled in `server/middleware/upload.js` and may use Cloudinary or a local `uploads/` folder.

## Useful scripts

From `client/`:

- `npm run dev` — start dev server (Vite)
- `npm run build` — build for production
- `npm run preview` — preview built app

From `server/`:

- `npm run dev` — start server in dev (nodemon)
- `npm start` — start server (production)

## Contact

If you need help, open an issue in the repository or contact the maintainer:

- Email: chayanon.kmutnb@gmail.com
- GitHub: https://github.com/Chayanon-Pond

---

If you'd like, I can also:

- Add a short `CONTRIBUTING.md` with dev setup and code style rules.
- Wire the README scripts to include quick one-liners for running both client + server concurrently.
- Add a VS Code launch config or tasks to start both sides.

Tell me which additions you want and I will update the README.
