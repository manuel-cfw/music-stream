# Deployment Guide

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Docker and Docker Compose installed
- Domain name with DNS configured
- SSL/TLS certificate (Let's Encrypt recommended)

## Coolify Deployment (Recommended)

[Coolify](https://coolify.io/) is a self-hosted platform that simplifies deploying applications. It automatically handles SSL certificates, reverse proxy configuration, and environment variables management.

### 1. Prerequisites

- A running Coolify instance (v4.x recommended)
- A server connected to Coolify
- Domain name with DNS pointing to your server

### 2. Create New Application in Coolify

1. Log in to your Coolify dashboard
2. Navigate to your Project → Environment
3. Click **"+ New"** and select **"Docker Compose"**
4. Choose **"Public Repository"** and enter your repository URL
5. Set the branch to deploy (e.g., `main`)

### 3. Configure Environment Variables

In Coolify's **Environment Variables** section, add all the following variables:

```env
# Application
NODE_ENV=production
APP_URL=https://yourdomain.com
API_URL=https://yourdomain.com/api/v1
VITE_API_URL=https://yourdomain.com/api/v1
VITE_APP_NAME=Unified Playlist Manager

# Database
DB_DATABASE=unified_playlist
DB_USERNAME=your_db_user
DB_PASSWORD=your_secure_password
DB_ROOT_PASSWORD=your_root_password

# JWT Authentication
JWT_SECRET=your-very-long-random-secret-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption (generate with: openssl rand -hex 16)
ENCRYPTION_KEY=your-32-char-hex-encryption-key

# Spotify OAuth (from https://developer.spotify.com/dashboard)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://yourdomain.com/api/v1/providers/spotify/callback

# SoundCloud OAuth (from https://soundcloud.com/you/apps)
SOUNDCLOUD_CLIENT_ID=your_soundcloud_client_id
SOUNDCLOUD_CLIENT_SECRET=your_soundcloud_client_secret
SOUNDCLOUD_REDIRECT_URI=https://yourdomain.com/api/v1/providers/soundcloud/callback

# Email (SMTP for magic links)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=noreply@yourdomain.com

# Rate Limiting (optional)
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Logging (optional)
LOG_LEVEL=info
```

### 4. Configure Docker Compose

1. In Coolify, set the **Docker Compose Location** to `docker-compose.prod.yml`
2. Configure domain settings:
   - For the **frontend** service, set your main domain (e.g., `yourdomain.com`)
   - For the **backend** service, set API path (e.g., `yourdomain.com` with `/api` path prefix)

### 5. Deploy

1. Click **Deploy** to start the deployment
2. Coolify will:
   - Clone the repository
   - Build the Docker images
   - Start all services
   - Configure SSL certificates automatically
   - Set up the reverse proxy

### 6. Generate Secrets

Use these commands to generate secure secrets:

```bash
# Generate JWT secret (32+ characters)
openssl rand -hex 32

# Generate encryption key (16 bytes = 32 hex chars)
openssl rand -hex 16

# Generate database password
openssl rand -base64 24
```

### 7. Post-Deployment

1. **Run database migrations** (first deployment only):
   - SSH into your server or use Coolify's terminal
   - Run: `docker exec unified-playlist-api npm run migration:run`

2. **Verify deployment**:
   - Visit your frontend URL: `https://yourdomain.com`
   - Check API health: `https://yourdomain.com/api/v1/health`

### Coolify Tips

- **Environment Variables**: All variables are managed through Coolify's UI. No need to create `.env` files on the server.
- **Secrets**: Mark sensitive variables (passwords, secrets) as "Secret" in Coolify for security.
- **Auto-Deploy**: Enable auto-deploy to automatically redeploy when you push to your repository.
- **Logs**: Use Coolify's built-in log viewer to debug issues.
- **Backups**: Configure Coolify's backup feature for automatic database backups.

---

## Manual Production Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Create app user
sudo useradd -m -s /bin/bash unified-playlist
sudo usermod -aG docker unified-playlist
```

### 2. Clone Repository

```bash
sudo su - unified-playlist
git clone https://github.com/your-org/unified-playlist-manager.git
cd unified-playlist-manager
```

### 3. Configure Environment

```bash
cp .env.example .env.production
nano .env.production
```

Required environment variables:

```env
# Application
NODE_ENV=production
APP_URL=https://yourdomain.com
API_URL=https://yourdomain.com/api

# Database
DB_HOST=mariadb
DB_PORT=3306
DB_DATABASE=unified_playlist
DB_USERNAME=your_db_user
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your-very-long-random-secret-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=32-byte-hex-string-for-aes-256-gcm

# Spotify
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://yourdomain.com/api/v1/providers/spotify/callback

# SoundCloud
SOUNDCLOUD_CLIENT_ID=your_soundcloud_client_id
SOUNDCLOUD_CLIENT_SECRET=your_soundcloud_client_secret
SOUNDCLOUD_REDIRECT_URI=https://yourdomain.com/api/v1/providers/soundcloud/callback

# Email (for magic links)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=noreply@yourdomain.com
```

### 4. Generate Secrets

```bash
# Generate JWT secret
openssl rand -hex 32

# Generate encryption key
openssl rand -hex 16
```

### 5. Docker Compose for Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  mariadb:
    image: mariadb:10.11
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_DATABASE}
      MYSQL_USER: ${DB_USERNAME}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mariadb_data:/var/lib/mysql
    networks:
      - internal
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    restart: always
    env_file:
      - .env.production
    depends_on:
      mariadb:
        condition: service_healthy
    networks:
      - internal
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`yourdomain.com`) && PathPrefix(`/api`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=3000"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
      args:
        VITE_API_URL: https://yourdomain.com/api/v1
    restart: always
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.frontend.loadbalancer.server.port=80"

  traefik:
    image: traefik:v2.10
    restart: always
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--certificatesresolvers.letsencrypt.acme.email=your@email.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt:/letsencrypt
    networks:
      - web

volumes:
  mariadb_data:
  letsencrypt:

networks:
  internal:
  web:
```

### 6. Deploy

```bash
# Build and start services
docker compose -f docker-compose.prod.yml up -d --build

# Run database migrations
docker compose -f docker-compose.prod.yml exec backend npm run migration:run

# Check logs
docker compose -f docker-compose.prod.yml logs -f
```

### 7. Nginx Alternative (without Traefik)

If using Nginx instead of Traefik:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Frontend
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Backup Strategy

### Database Backup

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR=/backups/unified-playlist
DATE=$(date +%Y%m%d_%H%M%S)

docker compose -f docker-compose.prod.yml exec -T mariadb \
  mysqldump -u${DB_USERNAME} -p${DB_PASSWORD} ${DB_DATABASE} \
  | gzip > ${BACKUP_DIR}/db_${DATE}.sql.gz

# Keep only last 7 days
find ${BACKUP_DIR} -type f -mtime +7 -delete
```

Add to crontab:
```
0 2 * * * /home/unified-playlist/backup.sh
```

## Monitoring

### Health Check Endpoint

The backend exposes `/api/v1/health` for monitoring:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### Recommended Monitoring Tools

1. **Uptime Monitoring:** UptimeRobot, Pingdom
2. **Application Monitoring:** PM2 Plus, New Relic
3. **Log Aggregation:** Loki + Grafana, ELK Stack

## Scaling

### Horizontal Scaling

For high traffic:

1. Add more backend instances
2. Use Redis for session storage
3. Use a load balancer
4. Consider database read replicas

### Example with Redis

```yaml
services:
  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
    networks:
      - internal

  backend:
    environment:
      - REDIS_URL=redis://redis:6379
```

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check MariaDB is running: `docker compose logs mariadb`
   - Verify credentials in `.env`

2. **OAuth callback errors**
   - Verify redirect URIs in Spotify/SoundCloud developer console
   - Check `APP_URL` matches domain

3. **SSL certificate issues**
   - Check Traefik logs: `docker compose logs traefik`
   - Verify DNS is properly configured

4. **Memory issues**
   - Increase Docker memory limits
   - Enable swap if needed

### Useful Commands

```bash
# View all logs
docker compose -f docker-compose.prod.yml logs -f

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend

# Enter backend container
docker compose -f docker-compose.prod.yml exec backend sh

# Database shell
docker compose -f docker-compose.prod.yml exec mariadb mysql -u${DB_USERNAME} -p${DB_PASSWORD} ${DB_DATABASE}
```
