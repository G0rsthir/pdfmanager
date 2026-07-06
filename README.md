<p align="center">
  <img src="docs/media/logo.svg" alt="PDF Manager logo" width="400" />
</p>

<p align="center">
Simple PDF manager - nothing more
</p>

## Features

- Annotations - Comments, highlights, and labels on any page (full-text searchable)
- Library organization - nested collections/folders, tags, and favorites. File state tracking
- Authentication - Local accounts plus SSO via OIDC
- Multi-user - very user has their own library
- Sharing - Invite other users to any collection (with permission management)
- Search - file metadata, page content, annotation bodies, and labels

<table align="center">
  <tr>
    <td align="center" valign="top" width="50%">
      <b>Collections</b><br>Files organized into nested collections, with tags, favorites and reading-state tracking
      <br><br><img src="docs/media/library.png" alt="Collections" />
    </td>
    <td align="center" valign="top" width="50%">
      <b>Annotations</b><br>Mark PDFs with highlights, comments and labels on any page - all full-text searchable
      <br><br><img src="docs/media/viewer.png" alt="Annotations" />
    </td>
  </tr>
</table>

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
    restart: unless-stopped
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
