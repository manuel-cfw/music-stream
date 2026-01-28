# Unified Playlist Manager

A Progressive Web App (PWA) that connects and manages Spotify and SoundCloud playlists in one unified interface.

## Features

- 🎵 **Unified Playlists**: Combine tracks from Spotify and SoundCloud into custom playlists
- 🔄 **Sync**: Keep your playlists up-to-date across providers
- 📱 **PWA**: Install on Windows, macOS, or use in any modern browser
- 🔒 **Secure**: Standard OAuth 2.0 login for Spotify and SoundCloud, encrypted token storage
- 🎨 **Modern UI**: Drag & drop interface, responsive design
- 🔐 **Easy Login**: Direct login with your Spotify/SoundCloud account - no manual tokens required

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: NestJS + TypeScript + TypeORM
- **Database**: MariaDB
- **Authentication**: JWT + OAuth 2.0

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Spotify Developer Account
- SoundCloud Developer Account (optional)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/unified-playlist-manager.git
   cd unified-playlist-manager
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the development environment**
   ```bash
   docker-compose up -d
   ```

4. **Install dependencies and run migrations**
   ```bash
   # Backend
   cd backend
   npm install
   npm run migration:run
   npm run start:dev

   # Frontend (in another terminal)
   cd frontend
   npm install
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000/api/v1
   - API Documentation: http://localhost:3000/api/docs

## Project Structure

```
unified-playlist-manager/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── providers/      # Music provider integrations
│   │   ├── playlists/      # Playlist management
│   │   ├── unified/        # Unified playlist logic
│   │   ├── sync/           # Sync operations
│   │   └── common/         # Shared utilities
│   └── test/               # Tests
├── frontend/               # React PWA frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   └── store/          # State management
│   └── public/             # Static assets
├── docs/                   # Documentation
├── docker-compose.yml      # Development environment
└── docker-compose.prod.yml # Production environment
```

## Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DB_HOST` | Database host |
| `DB_PORT` | Database port |
| `DB_DATABASE` | Database name |
| `DB_USERNAME` | Database username |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | Secret for JWT signing |
| `ENCRYPTION_KEY` | Key for encrypting provider tokens |
| `SPOTIFY_CLIENT_ID` | Spotify OAuth client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify OAuth client secret |

See `.env.example` for all available options.

## How Authentication Works

### User Authentication
Users create an account with email/password or use magic link authentication to access the application.

### Provider Authentication (Spotify & SoundCloud)
- **OAuth 2.0 Flow**: The app uses the official OAuth 2.0 standard for authenticating with Spotify and SoundCloud
- **No Manual Tokens**: Users don't need to manually create or copy/paste any API tokens
- **Simple Login**: Click "Login & Connect" to be redirected to the official Spotify or SoundCloud login page
- **Secure**: Your provider credentials are never shared with our app - authentication happens directly with Spotify/SoundCloud
- **Automatic Token Management**: Access and refresh tokens are managed automatically and securely encrypted

This is the standard, recommended, and most secure way to integrate with music streaming services.

## API Documentation

API documentation is available at `/api/docs` when running the backend, powered by Swagger/OpenAPI.

For detailed API documentation, see [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md).

## Architecture

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Deployment

For deployment instructions, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Development

### Running Tests

```bash
# Backend tests
cd backend
npm run test
npm run test:e2e

# Frontend tests
cd frontend
npm run test
```

### Code Style

```bash
# Lint
npm run lint

# Format
npm run format
```

## MVP Roadmap

### Week 1-2: Foundation
- [x] Project setup
- [x] Database schema
- [x] Authentication (JWT + Magic Link)
- [x] Spotify OAuth integration
- [ ] Basic playlist fetching

### Week 2-3: Core Features
- [ ] SoundCloud integration
- [ ] Unified playlist CRUD
- [ ] Drag & drop reordering
- [ ] Track search

### Week 3-4: Polish
- [ ] Sync functionality
- [ ] Conflict resolution
- [ ] PWA setup
- [ ] Responsive design
- [ ] Testing

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs