# OmniGPT

A responsive ChatGPT-style website with a real AI backend.

## Project files

- `public/index.html` — page structure
- `public/styles.css` — responsive dark interface
- `public/app.js` — chat UI and browser-side history
- `server.js` — secure Node.js backend and OpenAI API connection
- `.env.example` — environment-variable template

## Requirements

- Node.js 20 or newer
- An OpenAI API key with API access and billing/credits configured

ChatGPT subscriptions and API usage are billed separately. API use may cost money.

## Run locally

1. Install Node.js.
2. Open a terminal in this project folder.
3. Run `npm install`.
4. Copy `.env.example` to a new file named `.env`.
5. Open `.env` and replace the placeholder with your private API key.
6. Run `npm start`.
7. Open `http://localhost:3000` in your browser.

Do not share your `.env` file, publish it, or paste your API key into frontend files.

## Deploy

Deploy this project to a hosting service that supports Node.js server applications. Set these environment variables in the host dashboard:

- `OPENAI_API_KEY` — your private API key
- `OPENAI_MODEL` — optional; defaults to `gpt-6.2-astra`
- `PORT` — usually supplied automatically by the host

Use the host's HTTPS URL to open the website.

## How it works

The browser sends recent chat messages to `/api/chat`. The Node.js server calls the OpenAI Responses API and returns the answer. The API key is only read by the server from an environment variable. Chat history is stored in the visitor's browser local storage.

## Before sharing publicly

This is a starter project, not a production-hardened public service. Add user accounts, server-side per-user quotas, abuse monitoring, durable database storage, and stricter deployment controls before opening it to the public. The included IP rate limit is only a basic safeguard.
