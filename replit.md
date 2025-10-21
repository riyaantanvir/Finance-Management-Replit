# Overview

This is a full-stack Finance CRM application built with React, Express, and TypeScript. The system provides comprehensive expense tracking and financial management capabilities with role-based access control. Users can manage expenses, view financial dashboards, and administrators can manage user accounts. The application now includes an **Advantix Agency Work Reports System** for time tracking and project management with secure role-based permissions. The application features a modern UI built with shadcn/ui components and Tailwind CSS for styling.

# Recent Changes (October 21, 2025)

## Major Design System Overhaul - Visual & Performance Improvements
- **Modern Color Palette**: Updated primary blue to vibrant `hsl(217, 91%, 60%)` with better contrast throughout
- **Subtle Background Gradient**: Changed from pure white to `hsl(210, 20%, 98%)` reducing harsh white space
- **Improved Shadows**: Added proper depth with realistic shadow values for cards and components
- **Spacing System**: Implemented consistent spacing tokens (xs/sm/md/lg/xl) for uniform layouts
- **Reduced Padding**: Tightened dashboard spacing from `p-6` to `p-3 md:p-4` for more compact, modern feel
- **Typography Hierarchy**: Better font weights and sizing for improved readability

## Loading States & Animations
- **Skeleton Screens**: Created specialized loading components (CardSkeleton, TableSkeleton, ChartSkeleton, DashboardSkeleton)
- **Smooth Animations**: Added fade-in and slide-in animations for page transitions
- **Card Hover Effects**: Interactive hover states with shadow and lift effects (`.card-hover` class)
- **Button Micro-interactions**: Scale animations on hover/click for better feedback
- **Animation Keyframes**: Implemented fadeIn, slideIn, and shimmer animations

## Dashboard Enhancements
- **Stat Cards Redesign**:
  - Colored left borders (green/red/primary/purple) for visual categorization
  - Icon backgrounds in circular containers with matching colors
  - Hover effects with shadow and subtle lift
  - Reduced padding from `p-4 md:p-6` to `p-4` for compact layout
  - Larger, bolder numbers with improved hierarchy
  
- **Budget Summary Cards**: Same modern treatment with colored borders and hover effects
- **Responsive Grid**: Tighter gaps (`gap-3 md:gap-4` instead of `gap-4 md:gap-6`)
- **Better Visual Hierarchy**: Consistent font weights and sizes across all cards

## Sidebar Modernization
- **Compact Design**: More efficient use of space with tighter padding
- **Modern Styling**: Gradient header with primary color accent
- **Better Navigation States**: Clear active states with primary background and shadow
- **Smooth Transitions**: 300ms transitions for all state changes
- **Improved Colors**: Uses design system tokens (sidebar-primary, sidebar-accent)
- **Mobile Optimized**: Smoother slide-in animation for mobile view

## Component Library Additions
- **Loading States Component** (`loading-states.tsx`): Reusable skeleton loaders for consistent UX
- **Utility Classes**: Added button-hover, tag-card-interactive, and transition-smooth classes
- **Animation Framework**: Complete set of CSS animations ready for use across the app

## Performance & Best Practices
- **Consistent Design Tokens**: All colors, spacing, and shadows use CSS custom properties
- **Dark Mode Ready**: Updated dark mode colors to match new palette
- **Animation Performance**: Hardware-accelerated transforms for smooth 60fps animations
- **Reduced File Size**: More compact component code with consistent utility classes

## Delete All Expenses Feature
- **Bulk Delete Functionality**: Added "Delete All" button in expense table header for one-click removal of all expenses
- **Confirmation Dialog**: Two-step confirmation process with warning dialog showing exact count of entries to be deleted
- **Safety Measures**: Button is disabled when no expenses exist or during deletion operation
- **Visual Alerts**: Uses destructive red styling and AlertCircle icon to emphasize irreversible nature
- **Cache Invalidation**: Automatically refreshes expense list and dashboard statistics after deletion
- **User Feedback**: Toast notifications confirm successful deletion or report errors
- **Backend Integration**: Leverages existing `/api/expenses` DELETE endpoint that safely removes ledger entries before deleting expenses

## Dashboard Budget Summary Cards
- **Total Planned Budget**: Shows sum of all planned payments for the selected period with blue color coding
- **Total Actual Spending**: Displays total expenses with purple color and percentage usage indicator
- **Over/Under Budget Status**: Smart card that shows red alert for overspending or green for remaining budget
- **Filter-Responsive**: All budget cards automatically update based on selected time period (this week/month/year/all)
- **Conditional Display**: Budget summary only appears when planned payment data exists
- **Visual Indicators**: Uses Target, TrendingUp, and AlertTriangle icons for quick recognition

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