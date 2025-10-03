# Factory Gauge Monitoring System

## Overview

This is a full-stack web application for monitoring and tracking factory station gauges. It allows users to view real-time gauge readings from various factory stations, input new readings, track reading history, and get alerts when readings are out of acceptable ranges.

The application uses a React-based frontend with a Node.js/Express backend and relies on Drizzle ORM for database operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and uses the following key technologies:

- **React**: UI library for building the component-based interface
- **Wouter**: Lightweight router for navigation between pages
- **TanStack Query**: For data fetching, caching, and state management
- **Shadcn/UI**: Component library with a well-designed UI system
- **Tailwind CSS**: Utility-first CSS framework for styling

The frontend follows a component-based architecture with reusable UI components. The main pages include:
- Dashboard: Overview of stations with their current gauge readings
- History: Historical record of all gauge readings

### Backend Architecture

The backend is built with:

- **Node.js/Express**: For handling API requests and serving the application
- **Drizzle ORM**: For database operations with type safety
- **Zod**: For schema validation

The API follows RESTful principles with endpoints organized around resources (stations, gauges, readings).

### Data Storage

The application uses a PostgreSQL database (or will use it when fully configured) with Drizzle ORM for database operations. The schema includes:

- **Stations**: Factory stations that house gauges
- **Gauges**: Monitoring instruments with specific min/max values
- **Readings**: Historical readings from gauges
- **Staff**: Personnel who take gauge readings

## Key Components

### Frontend Components

1. **Dashboard Page**: Main view showing all stations and their gauges
   - StatusOverview: Summary of system status
   - QuickJumpNav: Quick navigation to specific stations
   - StationsList: List of all stations with expandable details

2. **History Page**: Shows historical readings with filtering options

3. **Station Components**:
   - StationCard: Displays a station with its gauges
   - GaugeInputCard: Interface for entering new gauge readings
   - ReadingHistoryTable: Table displaying reading history

4. **Layout Components**:
   - Header: App header with navigation and refresh option
   - Footer: App footer with copyright information
   - NavigationTabs: Tab navigation between main app sections

### Backend Components

1. **API Routes**:
   - `/api/stations`: Get all stations with gauges
   - `/api/stations/:id`: Get a specific station
   - `/api/stations/:id/readings`: Get readings for a station
   - (More endpoints for creating readings, etc.)

2. **Data Storage Layer**:
   - Interface for interacting with the database
   - Functions for CRUD operations on stations, gauges, readings, etc.

## Data Flow

1. **Fetching Station Data**:
   - Frontend makes request to `/api/stations`
   - Backend retrieves stations and gauges from database
   - Frontend displays stations and gauges in UI

2. **Recording New Readings**:
   - User inputs reading value through GaugeInputCard
   - Frontend sends POST request to record the reading
   - Backend validates and stores the reading
   - UI refreshes to show updated data

3. **Viewing Reading History**:
   - Frontend requests reading history from the appropriate endpoint
   - Backend retrieves and returns readings
   - Frontend displays readings in a sortable, filterable table

## External Dependencies

### Frontend Dependencies
- React and React DOM for UI rendering
- TanStack Query for data fetching and state management
- Wouter for routing
- Shadcn/UI components (Radix UI primitives)
- Tailwind CSS for styling
- Various utility libraries (clsx, cva, etc.)

### Backend Dependencies
- Express for the web server
- Drizzle ORM for database operations
- Zod for schema validation
- Vite for development and production builds

## Deployment Strategy

The application is configured to be deployed on Replit with the following setup:

1. **Development Mode**:
   - Uses Vite's development server for HMR
   - Backend serves the API and proxies to Vite for frontend assets

2. **Production Mode**:
   - Frontend is built using Vite
   - Backend is bundled using esbuild
   - Express serves both the API and static frontend assets

3. **Database**:
   - Uses PostgreSQL provided by Replit
   - Database URL is expected to be available in the environment variables

## Getting Started

1. The frontend and backend are developed together in this monorepo
2. The PostgreSQL database should be provisioned and the DATABASE_URL environment variable set
3. Run `npm run dev` to start the development server
4. Run `npm run build` to build for production
5. Run `npm run start` to start the production server
6. Use `npm run db:push` to synchronize the database schema

## Recent Changes

**October 3, 2025:**
- CRITICAL PERFORMANCE FIX: Resolved N+1 query problem in History page data loading
- Optimized database queries from ~100 individual queries to just 5 bulk queries per request
- Changed from fetching related data per-reading to bulk fetching with lookup maps
- Reduced default pagination limit from 100 to 25 readings per request
- Performance improvement: History page load time reduced from 4-5 minutes to seconds
- Optimized for better performance on Windows PC with large datasets

**October 2, 2025:**
- CRITICAL FIX: Resolved "Invalid string length" error on Windows when loading History page with large datasets
- Fixed security vulnerability: Removed password hash logging from enrichReadingWithDetails method
- Optimized database queries: Only fetch username instead of full user object to reduce data transfer
- Added pagination support to /api/readings endpoint (default: 100 records per request, later reduced to 25)
- Updated History page to handle paginated API response format
- Performance improvement: Dramatically reduced response payload size for large reading datasets

**September 25, 2025:**
- COMPATIBILITY FIX: Resolved Windows compatibility issue with Vite plugins
- Fixed error: "ENOENT: no such file or directory, open 'D:\proc\self\environ'"
- Created Windows-specific development scripts (dev-windows.ps1, dev-windows.bat)
- Updated WINDOWS_SETUP_GUIDE.md with comprehensive solutions for Windows users
- Windows users can now run development server without Linux plugin compatibility errors

**September 9, 2025:**
- LAYOUT IMPROVEMENT: Fixed machine card layout in Dashboard to handle long machine names
- Restructured machine cards to use two-tier vertical layout preventing text overlap
- Machine icon and name now display horizontally in top section with dedicated space
- Machine Status and Gauge Status sections moved to separate bottom grid
- Layout is fully responsive and works perfectly with any machine name length

**January 18, 2025:**
- IMPROVEMENT: Enhanced machine sorting logic in Dashboard to handle various naming patterns
- Fixed machine ordering to work with MACH01, ACH03, and custom machine names
- Machine sorting now uses machineNo field as primary sort key with multiple fallback patterns
- Ensures consistent machine display order regardless of naming convention

**July 18, 2025:**
- CRITICAL FIX: Resolved real-time data update issues across the application
- Fixed Dashboard gauge cards to show immediate updates after reading entry
- Fixed Settings > Manage Machine to show immediate machine status updates
- Enhanced cache invalidation strategy with both invalidateQueries and refetchQueries
- Fixed Settings page local state management to watch data content changes, not just length changes
- All data updates now reflect immediately in the UI without requiring page navigation

**July 17, 2025:**
- Updated machine status label from "Require Morning Check" to "To Check" for better mobile display
- Changed status throughout all files: schema types, database operations, UI components, and scheduler
- Shortened status text to improve readability in mobile and compact interfaces

**July 5, 2025:**
- CRITICAL FIX: Resolved image embedding issue in report exports
- Fixed Excel export to properly handle base64 data URI images from database
- Fixed PDF export to properly handle base64 data URI images from database
- Added automatic image type detection from data URI headers
- Images now embed properly in both Excel cells and PDF documents
- Enhanced export functionality with comprehensive error handling and debugging

**July 4, 2025:**
- CRITICAL FIX: Resolved data integrity issue where new readings corrupted historical status data
- Added condition column to readings table to preserve historical accuracy
- Implemented numerical value mapping (0=Normal, 1=Alert) for condition-based gauges
- Updated History page status calculation to use reading values instead of current gauge condition
- Migration script `migrate_add_condition_column.sql` created for local database updates

**July 2, 2025:**
- Fixed critical authentication bug in reading creation by removing duplicate API endpoints
- Readings now properly capture and display logged-in user information
- Fixed station sorting in History tab to display in correct numerical order (1, 2, 3, 4, 5)
- Fixed gauge sorting within stations in Dashboard to display in proper numerical sequence
- Implemented dynamic gauge filtering in History tab based on selected station
- Removed broken TypeScript files that were preventing frontend compilation

## Development Notes

- The database schema is defined in `shared/schema.ts`
- Frontend types are defined in `client/src/lib/types.ts`
- The API endpoints are defined in `server/routes.ts`
- Frontend pages are in `client/src/pages/`
- UI components are in `client/src/components/`
- Migration script `migrate_local_database_staff_removal.sql` available for local database updates