# Images

## Local Build

```bash
cd pdfmanager
docker build -f docker/Dockerfile -t pdfmanager:local .

```

## Local Run

```bash
docker run --rm -p 8080:8080  -e APP_ACCESS_JWT_SECRET=local-secret -e APP_REFRESH_JWT_SECRET=local-secret pdfmanager:local
```
