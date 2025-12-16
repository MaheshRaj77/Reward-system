# Family Reward System

A comprehensive Progressive Web App (PWA) built with Next.js that helps parents manage their children's tasks and rewards through a gamified system. Parents can create tasks, assign rewards, track progress, and maintain family engagement through a secure, offline-capable application.

## 🖥️ Cross-Platform Compatibility

This application is designed to run seamlessly on:

- **macOS** (10.15+)
- **Windows** (10+)
- **Linux** (Ubuntu 18.04+, CentOS 7+, etc.)
- **Docker** (cross-platform containerized deployment)

All development tools, scripts, and configurations are cross-platform compatible. The project includes:

- **`.gitattributes`**: Ensures consistent line endings across platforms
- **Comprehensive `.gitignore`**: Excludes platform-specific files and build artifacts
- **Cross-platform dependencies**: All packages work on macOS, Windows, and Linux

## ✨ Features

### 👨‍👩‍👧‍👦 Family Management

- **Parent Dashboard**: Central hub for managing children, tasks, and rewards
- **Child Profiles**: Individual accounts for each child with avatars and progress tracking
- **Family Code**: Secure 8-character code for child device access
- **Subscription Management**: Tiered plans with different limits

### 🎯 Task & Reward System

- **Task Creation**: Parents can create custom tasks with star rewards
- **Reward Economy**: Star-based system with redeemable rewards
- **Progress Tracking**: Real-time monitoring of task completion and streaks
- **Approval System**: Parent oversight for reward redemptions

### 💬 Communication

- **In-App Chat**: Direct messaging between parents and children
- **Notifications**: Real-time updates on task completions and approvals

### 📱 PWA Features

- **Installable App**: Add to home screen on mobile devices
- **Offline Support**: Core functionality works without internet
- **Push Notifications**: Stay updated even when app is closed
- **Responsive Design**: Optimized for all screen sizes

### 🔒 Security & Privacy

- **Firebase Authentication**: Secure user authentication
- **PIN Protection**: 4-digit PINs for child accounts
- **Data Encryption**: All data stored securely in Firestore
- **Email Integration**: Automated notifications via SMTP

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Analytics)
- **Email**: Nodemailer with SMTP
- **PWA**: Service Worker, Web App Manifest
- **Icons**: Lucide React
- **Package Manager**: pnpm
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

⚠️ **This project uses PNPM exclusively. NPM and Yarn are not supported.**

- Node.js 18+
- **pnpm 9.0.0+** ([Install pnpm](https://pnpm.io/installation))
- Docker and Docker Compose (optional, for containerized deployment)
- Firebase project
- SMTP email service (Gmail recommended)

## 🚀 Installation

1. **Install pnpm** (if not already installed)

   ```bash
   npm install -g pnpm
   ```

   Verify installation:

   ```bash
   pnpm --version
   ```

2. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd reward-system
   ```

3. **Install dependencies**

   ```bash
   pnpm install
   ```

   > **Note**: Only use `pnpm install`. Using `npm install` or `yarn install` will fail intentionally to ensure consistency.

4. **Environment Setup**

   ```bash
   cp .env.example .env.local
   ```

   Configure your environment variables in `.env.local`:

   **Firebase Configuration:**

   - `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase API key
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain (e.g., `project.firebaseapp.com`)
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
   - `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase app ID

   **App Configuration:**

   - `NEXT_PUBLIC_APP_URL` - Application URL (default: `http://localhost:3000`)

   **SMTP Email Configuration:**

   - `SMTP_HOST` - SMTP server hostname (default: `smtp.gmail.com`)
   - `SMTP_PORT` - SMTP port (default: `587`)
   - `SMTP_USER` - Email address for sending notifications
   - `SMTP_PASSWORD` - App-specific password (not your regular password)
   - `SMTP_FROM_EMAIL` - From email address for notifications
   - `SMTP_SECURE` - Use TLS (default: `false` for port 587)

   > **Tip**: For Gmail, generate an [App Password](https://myaccount.google.com/apppasswords) and use it in `SMTP_PASSWORD`.

5. **Firebase Setup**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable these services:
     - **Authentication**: Enable Email/Password provider
     - **Firestore Database**: Create in production mode
     - **Analytics**: Enable to track usage (optional)
   - Copy your configuration values from Firebase console to `.env.local`

## 🐳 Docker Setup (Alternative)

The application can also be run using Docker for easier deployment and development.

### Prerequisites

- Docker and Docker Compose installed
- Environment variables configured in `.env.local`

### Development with Docker

```bash
# Build and run in development mode with hot reloading
docker-compose -f docker-compose.dev.yml up --build
```

### Production with Docker

```bash
# Build and run production container
docker-compose up --build -d
```

### Docker Commands

```bash
# Stop containers
docker-compose down

# View logs
docker-compose logs -f

# Rebuild after code changes
docker-compose up --build
```

## 🏃‍♂️ Running the Application

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Production Build

```bash
pnpm build
pnpm start
```

## 📱 PWA Installation

The app supports PWA installation on supported devices:

1. Open the app in a supported browser (Chrome, Safari, Edge)
2. Look for the "Install" prompt or button
3. Follow the installation instructions
4. The app will appear on your home screen like a native app

## 📚 Documentation

Comprehensive documentation for different aspects of the project:

- [Requirements](REQUIREMENTS.md) - Complete requirements specification
- [PWA Quick Start](PWA_QUICK_START.md) - Quick guide to PWA features and family code setup
- [PWA Features](PWA_FEATURES.md) - Detailed PWA capabilities
- [PWA Implementation](PWA_IMPLEMENTATION.md) - Technical implementation details
- [Parent Dashboard](PARENT_DASHBOARD.md) - Parent dashboard features and usage
- [Subscription System](SUBSCRIPTION_SYSTEM.md) - Subscription plans and tier limits
- [PNPM Only](PNPM_ONLY.md) - Package manager requirements and setup

## 🔧 Development

### Code Quality

```bash
pnpm lint
```

### Building for Production

```bash
pnpm build
```

## 🚨 Important: Package Manager Enforcement

This project uses **pnpm exclusively** for package management. The project is configured to reject npm and yarn installations:

- ✅ Use: `pnpm install`, `pnpm add`, `pnpm remove`, `pnpm dev`
- ❌ Don't use: `npm install`, `yarn install`

**Why?** PNPM provides:

- Faster installation speeds
- Efficient disk space usage (hard links)
- Strict dependency resolution
- Better monorepo support
- Improved security

If you accidentally run `npm install` or `yarn install`, the `preinstall` script will automatically prevent installation and guide you to use pnpm instead.

## 🚀 Deployment

### Vercel (Recommended)

The easiest way to deploy is using Vercel:

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Configure environment variables in Vercel dashboard:
   - Copy all variables from your `.env.local` file
   - Make sure to use `NEXT_PUBLIC_*` prefix for public variables
4. Deploy!

### Docker Deployment

For production deployment with Docker:

```bash
# Build and run production container
docker-compose up --build -d

# View logs
docker-compose logs -f reward-system

# Stop containers
docker-compose down
```

### Manual Deployment

For self-hosted servers:

```bash
pnpm install
pnpm build
pnpm start
```

> **Note**: Set `NODE_ENV=production` environment variable before starting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run code quality checks: `pnpm lint`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature/your-feature`
7. Submit a pull request

**Important**: Please ensure your code passes linting before submitting a PR.

## 📄 License

This project is private and proprietary.

## 🆘 Troubleshooting

### Installation Issues

**Q: "This project uses pnpm exclusively"**

- A: Use `pnpm install` instead of `npm install` or `yarn install`

**Q: "pnpm command not found"**

- A: Install pnpm globally: `npm install -g pnpm@latest`

**Q: Environment variables not loading**

- A: Ensure `.env.local` exists with all required variables from `.env.example`

**Q: Firebase authentication failing**

- A: Verify Firebase project settings and that Authentication is enabled

### Runtime Issues

**Q: PWA installation not available**

- A: Ensure app is accessed via HTTPS (works automatically on Vercel)

**Q: Email notifications not sending**

- A: Check SMTP settings and verify app password is set correctly (not regular password)

**Q: Docker build fails**

- A: Clear cache and rebuild: `docker-compose down -v && docker-compose up --build`

For more issues, check the [Requirements](REQUIREMENTS.md) or [PNPM Only](PNPM_ONLY.md) documentation.

## 📞 Support

For support, questions, or issues:

1. Check the [Requirements](REQUIREMENTS.md) documentation
2. Review [PNPM Only](PNPM_ONLY.md) for package manager issues
3. Check [PWA Quick Start](PWA_QUICK_START.md) for PWA-related questions
4. Contact the development team for other issues
