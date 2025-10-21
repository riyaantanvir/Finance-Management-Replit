# Overview

This is a full-stack Finance CRM application built with React, Express, and TypeScript. The system provides comprehensive expense tracking and financial management capabilities with role-based access control. Users can manage expenses, view financial dashboards, and administrators can manage user accounts. The application now includes an **Advantix Agency Work Reports System** for time tracking and project management with secure role-based permissions. The application features a modern UI built with shadcn/ui components and Tailwind CSS for styling.

# Recent Changes (October 21, 2025)

## Planned Payment Manager - CSV Import/Export Feature
- **CSV Export**: Download current planned payments as properly formatted CSV with automatic field escaping
- **Sample Template**: Download pre-filled sample CSV demonstrating correct format with example data
- **CSV Import with Preview**: Upload CSV files and preview data in a table before submission
- **Validation & Error Display**: Real-time validation of uploaded data with inline error messages
- **Inline Editing**: Fix validation errors directly in the preview table before importing
- **Papa Parse Integration**: Robust CSV parsing that handles quoted fields, commas in values, and special characters
- **Error Handling**: Critical parse errors (unbalanced quotes, field mismatches) are detected and reported before data corruption
- **Round-trip Capability**: Exported CSVs can be re-imported without data loss or formatting issues

## Dashboard Planned Payments Bug Fix
- **Fixed Query Parameter Mismatch**: Resolved issue where "This Month" filter showed ৳0 for all planned amounts
- **Root Cause**: Frontend sent `this-month` (with hyphen) but backend expected `this_month` (with underscore)
- **Solution**: Added parameter normalization to convert hyphens to underscores automatically
- **Impact**: Dashboard now correctly displays planned payment amounts for all time period filters

## Previous Changes (October 17, 2025)

### UI/UX Improvements
- **Sidebar Navigation Restructured**: Admin Panel moved to bottom of sidebar with visual divider
- **User Profile Section**: Added profile section at bottom of sidebar with avatar, username, role display, and logout button
- **Dashboard Default Filter**: Dashboard now defaults to showing "this month" data instead of "all time"
- **Fund Management Overview**: Added "Account Balances Transactions" section displaying recent ledger entries from all accounts before "Recent Transfers"

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

- **Users Table**: Stores user credentials and role-based permissions (dashboard access, expense entry access, admin panel access)
- **Expenses Table**: Tracks financial transactions with date, type (income/expense), details, amount, tags, and payment methods
- **Work Reports Table**: Tracks time entries for Advantix Agency work with user assignments, dates, task details, hours worked, approval status, and comments
- **Schema Validation**: Zod schemas for runtime type checking and validation

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
- **Permissions**: Full access to all modules (dashboard, expense entry, admin panel, agency reports, investment management, fund management, subscriptions)

## Deployment
- **Deployment Type**: Autoscale (stateless web application)
- **Build Command**: `npm run build`
- **Run Command**: `npm start`
- **Configuration**: Managed via Replit deployment settings