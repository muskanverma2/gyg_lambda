# Deploy this Express API to AWS Lambda (SAM)

## What changed
- Local dev still works with `npm run dev` / `npm start`
- Lambda entrypoint: `src/lambda.js` (exports `handler`)
- Mongo connection is cached across invocations
- AWS SAM template added: `template.yaml`

## Install
```bash
npm install
```

## Local dev (unchanged)
```bash
npm run dev
```

## Run locally as “Lambda”
1) Install AWS SAM CLI
2) Set `MONGO_URI` in your environment or a `.env` file
3) Start the local API Gateway emulator:

```bash
sam local start-api
```

Then open:
- `GET /`  (health)
- `GET /v1/...` (your existing routes)

## Deploy
```bash
sam build
sam deploy --guided
```

When prompted, set `MONGO_URI` (your MongoDB connection string).

