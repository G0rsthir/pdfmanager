# PDF Manager

Simple PDF manager - nothing more.

## Overview

### Features

* Annotations - Comments, highlights, and labels on any page (full-text searchable)
* Library organization - nested collections/folders, tags, and favorites. File state tracking
* Authentication - Local accounts plus SSO via OIDC
* Multi-user - very user has their own library
* Sharing - Invite other users to any collection (with permission management)
* Search - file metadata, page content, annotation bodies, and labels

### Examples

![Library](docs/media/library.png)

![Viewer](docs/media/viewer.png)

## Getting Started

### Quick test

```bash
docker run -e APP_ACCESS_JWT_SECRET='change_me' -e APP_REFRESH_JWT_SECRET='change_me' -p 8080:8080 --rm ghcr.io/g0rsthir/pdfmanager:latest
```

App is accessible at <http://localhost:8080/>

### Docker compose

```yaml
services:
  app:
    restart: always
    image: ghcr.io/g0rsthir/pdfmanager:latest
    volumes:
      - app-storage:/app/storage
    env_file:
      - .env
    environment:
      - APP_ACCESS_JWT_SECRET=${JWT_SECRET?Variable not set}
      - APP_REFRESH_JWT_SECRET=${JWT_SECRET?Variable not set}
    ports:
      - 8080:8080
volumes:
  app-storage:
```

App is accessible at <http://localhost:8080/>
