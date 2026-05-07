# Deployment Guide for Render

This guide explains how to deploy the HireReady application (Frontend and Backend) on [Render](https://render.com/).

## Prerequisites

1.  A GitHub or GitLab account with the HireReady code pushed to a repository.
2.  A [Render](https://render.com/) account.
3.  A [Groq](https://console.groq.com/) API Key.

---

## Phase 1: Database Setup

HireReady uses PostgreSQL. You can use Render's managed PostgreSQL service.

1.  Log in to Render and click **New +** -> **PostgreSQL**.
2.  Name it `hireready-db`.
3.  Choose the **Free** tier (or higher if needed).
4.  Once created, copy the **Internal Database URL** (for the backend) and the **External Database URL** (if you need to access it from your local machine).
5.  **Important**: You will need the connection string for the next steps.

---

## Phase 2: Backend Deployment (Web Service)

1.  Click **New +** -> **Web Service**.
2.  Connect your GitHub/GitLab repository.
3.  Configure the service:
    *   **Name**: `hireready-api`
    *   **Root Directory**: `brutal-feedback-api`
    *   **Language**: `Node`
    *   **Build Command**: `npm install && npx prisma db push`
    *   **Start Command**: `node index.js`
4.  Add **Environment Variables**:
    *   `PORT`: `3001` (or leave default, Render usually provides one)
    *   `DATABASE_URL`: Your PostgreSQL connection string.
    *   `DIRECT_URL`: Same as `DATABASE_URL` (needed for Prisma migrations).
    *   `GROQ_API_KEY`: Your Groq API key.
    *   `JWT_SECRET`: A long random string for authentication.
    *   `FRONTEND_ORIGIN`: Your frontend URL (you'll get this in the next phase, e.g., `https://hireready.onrender.com`).
5.  Click **Deploy Web Service**.

---

## Phase 3: Frontend Deployment (Static Site)

1.  Click **New +** -> **Static Site**.
2.  Connect the same repository.
3.  Configure the site:
    *   **Name**: `hireready`
    *   **Root Directory**: `frontend`
    *   **Build Command**: `npm run build`
    *   **Publish Directory**: `dist`
4.  Add **Environment Variables**:
    *   `VITE_API_BASE`: The URL of your deployed backend (e.g., `https://hireready-api.onrender.com`).
5.  Click **Create Static Site**.

---

## Phase 4: Final Connection

1.  Copy your Frontend URL (e.g., `https://hireready.onrender.com`).
2.  Go back to your **Backend (Web Service)** settings.
3.  Update the `FRONTEND_ORIGIN` environment variable with your Frontend URL.
4.  Render will automatically re-deploy.

---

## Troubleshooting

*   **CORS Errors**: Ensure `FRONTEND_ORIGIN` in the backend exactly matches your frontend URL (no trailing slash).
*   **Database Errors**: Double-check the `DATABASE_URL`. The build command `npm install && npx prisma db push` should handle the schema automatically.
*   **Prisma Client Error**: If you see "Prisma Client could not be found", ensure the `postinstall` script is in `package.json`.
