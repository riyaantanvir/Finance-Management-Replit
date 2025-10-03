# Overview

This is a full-stack Finance CRM application built with React, Express, and TypeScript. The system provides comprehensive expense tracking and financial management capabilities with role-based access control. Users can manage expenses, view financial dashboards, and administrators can manage user accounts. The application includes:
- **Advantix Agency Work Reports System** for time tracking and project management with secure role-based permissions
- **Cryptocurrency Management System** for tracking coins, market alerts via Telegram, crypto news with sentiment analysis, and portfolio management using free APIs (CoinGecko, CryptoNews, Telegram Bot)
The application features a modern UI built with shadcn/ui components and Tailwind CSS for styling.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Client-side routing with Wouter for navigation between pages
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Authentication**: Client-side auth state management using localStorage

## Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API structure with dedicated route handlers
- **Data Layer**: In-memory storage implementation with interface-based design for future database integration
- **Development**: Vite middleware integration for hot reloading in development

## Database Schema
The application uses Drizzle ORM with PostgreSQL schema definitions:

- **Users Table**: Stores user credentials and role-based permissions (dashboard access, expense entry access, admin panel access, crypto access)
- **Expenses Table**: Tracks financial transactions with date, type (income/expense), details, amount, tags, and payment methods
- **Work Reports Table**: Tracks time entries for Advantix Agency work with user assignments, dates, task details, hours worked, approval status, and comments
- **Crypto API Settings Table**: Stores CoinGecko API key, CryptoNews API key, and Telegram bot credentials (bot token, chat ID)
- **Crypto Watchlist Table**: User-specific cryptocurrency watchlist with unique constraint (userId + coinId)
- **Crypto Alerts Table**: Price and percentage change alerts with notification preferences (Telegram/email)
- **Crypto Portfolio Table**: User cryptocurrency holdings with buy prices, quantities, and dates
- **Schema Validation**: Zod schemas for runtime type checking and validation
- **Foreign Key Cascades**: All crypto tables use ON DELETE CASCADE for automatic cleanup when users are deleted

## Authentication & Authorization
- **Simple Authentication**: Username/password based login system
- **Role-Based Access**: Granular permissions system controlling access to different application features
- **Session Management**: Client-side session handling with localStorage persistence
- **Work Reports Security**: Server-side session validation with middleware for work reports API routes
- **Default Admin**: Pre-configured admin user (username: "Admin", password: "Admin")

### Work Reports Security Model
- **Session-based Authentication**: Server-side session validation for work reports routes
- **Role-based Authorization**: Non-admin users can only access their own work reports; admin users can access all reports
- **Authentication Middleware**: Centralized security validation before work reports operations
- **Access Control**: Proper 401/403 HTTP status codes for authentication and authorization failures

### Crypto Access Security Model
- **Permission-based Access**: Users must have `cryptoAccess` permission enabled to access crypto features
- **Session-based Authentication**: Server-side session validation with `requireCryptoAccess` middleware
- **User Data Isolation**: Users can only access their own crypto watchlist, alerts, and portfolio
- **API Key Security**: Crypto API keys stored in database, accessible only to users with crypto access
- **Cascading Deletes**: All user crypto data automatically deleted when user is removed

## Data Storage
- **Current Implementation**: PostgreSQL database using Drizzle ORM with DatabaseStorage implementation
- **Database Provider**: Replit PostgreSQL database (managed database service)
- **Migration Support**: Database schema management using Drizzle Kit (`npm run db:push`)
- **Connection**: Uses @neondatabase/serverless driver with DATABASE_URL environment variable

## Component Architecture
- **Layout Components**: Reusable header and sidebar components with responsive design
- **Feature Components**: Modular components for expense management, user administration, and dashboard functionality
- **UI Components**: Consistent design system using shadcn/ui components
- **Form Handling**: React Hook Form integration with Zod validation

# External Dependencies

## Core Framework Dependencies
- **React**: Frontend framework with hooks and modern patterns
- **Express**: Backend web framework for API routes
- **TypeScript**: Type safety across frontend and backend
- **Vite**: Build tool and development server

## Database & ORM
- **Drizzle ORM**: Type-safe database operations and schema management
- **Drizzle Kit**: Database migration and schema generation tools
- **@neondatabase/serverless**: PostgreSQL database driver for Neon DB

## UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Headless UI component primitives
- **shadcn/ui**: Pre-built component library
- **Lucide React**: Icon library for consistent iconography

## State Management & Data Fetching
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state management and validation
- **Wouter**: Lightweight client-side routing

## Validation & Type Safety
- **Zod**: Runtime schema validation and type inference
- **@hookform/resolvers**: Form validation integration

## Development Tools
- **Replit Plugins**: Development environment integration for hot reloading and error handling
- **ESBuild**: Fast JavaScript bundler for production builds

# Replit Environment Setup

## Running the Application
- **Development**: Run `npm run dev` or use the "Start application" workflow
- **Production Build**: Run `npm run build` to build both frontend and backend
- **Production Start**: Run `npm start` to serve the built application
- **Server Port**: Always runs on port 5000 (only non-firewalled port in Replit)
- **Host Configuration**: Server binds to 0.0.0.0:5000 with `allowedHosts: true` to support Replit proxy

## Database Setup
- **Database**: Replit-managed PostgreSQL database
- **Schema Migration**: Run `npm run db:push` to push schema changes to database
- **Force Push**: Use `npm run db:push --force` if data-loss warnings appear
- **Environment Variables**: DATABASE_URL, PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE are auto-configured

## Default Credentials
- **Username**: Admin
- **Password**: Admin
- **Permissions**: Full access to all modules (dashboard, expense entry, admin panel, agency reports, investment management, fund management, subscriptions, crypto access)

# Cryptocurrency Management System

## Features
The crypto system provides comprehensive cryptocurrency tracking and management capabilities:

### API Configuration (Admin Panel → Crypto API)
- **CoinGecko API**: Configure API key for cryptocurrency price data and market information (13M+ tokens, 100 calls/min free tier)
- **CryptoNews API**: Configure API key for crypto news with sentiment analysis (100 calls/month free tier)
- **Telegram Bot**: Configure bot token and chat ID for push notifications (unlimited free notifications)

### Crypto World Main Menu
- **Dashboard**: Overview of watchlist, active alerts, portfolio performance, and recent news
- **Watchlist**: Track selected cryptocurrencies with real-time prices and price changes
- **Alerts**: Set price target alerts and percentage change alerts with Telegram/email notifications
- **Portfolio**: Manage cryptocurrency holdings with buy prices, quantities, profit/loss tracking
- **News**: View crypto news feed with sentiment analysis (positive/negative/neutral)

## Crypto API Stack (Free Tier - $0/month)
- **CoinGecko API** (`https://api.coingecko.com/api/v3/`): Cryptocurrency prices, market data, historical charts
- **CryptoNews API** (`https://cryptonews-api.com/`): News articles with sentiment analysis
- **Telegram Bot API** (`https://api.telegram.org/bot{token}/`): Push notifications for price alerts

## Backend API Routes
All crypto routes require session authentication and `cryptoAccess` permission:

### Crypto Settings
- `GET /api/crypto/settings` - Get API configuration
- `PUT /api/crypto/settings` - Update API configuration

### Watchlist
- `GET /api/crypto/watchlist` - Get user's watchlist
- `POST /api/crypto/watchlist` - Add coin to watchlist
- `DELETE /api/crypto/watchlist/:id` - Remove from watchlist

### Alerts
- `GET /api/crypto/alerts` - Get user's alerts
- `POST /api/crypto/alerts` - Create new alert
- `PUT /api/crypto/alerts/:id` - Update alert
- `DELETE /api/crypto/alerts/:id` - Delete alert

### Portfolio
- `GET /api/crypto/portfolio` - Get user's portfolio
- `POST /api/crypto/portfolio` - Add portfolio entry
- `PUT /api/crypto/portfolio/:id` - Update portfolio entry
- `DELETE /api/crypto/portfolio/:id` - Delete portfolio entry

## Deployment
- **Deployment Type**: Autoscale (stateless web application)
- **Build Command**: `npm run build`
- **Run Command**: `npm start`
- **Configuration**: Managed via Replit deployment settings