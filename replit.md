# Collaborative Whiteboard Application

## Overview

This is a full-stack collaborative whiteboard application built with React, Express, and WebSockets. It supports up to 10 users drawing together in real-time, with each user having their own color and cursor visibility. The application is fully functional and deployed.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### January 14, 2025
- ✅ **Completed**: Multi-user collaborative whiteboard application 
- ✅ **Fixed**: WebSocket connection issues and server configuration
- ✅ **Implemented**: Real-time drawing synchronization for up to 10 users
- ✅ **Added**: User presence indicators and live cursor tracking
- ✅ **Confirmed**: Application tested and working successfully
- ✅ **Added**: Google OAuth authentication with session management
- ✅ **Fixed**: OAuth callback URL configuration for Replit development environment
- ✅ **Integrated**: User authentication with whiteboard access control
- ✅ **Added**: Demo authentication system as fallback for OAuth issues
- ✅ **Confirmed**: Authentication system working with name-based demo login
- ✅ **Replaced**: Google/Apple OAuth with Replit Auth for seamless integration
- ✅ **Updated**: Database schema for Replit Auth compatibility
- ✅ **Created**: Landing and home pages for authenticated users
- ✅ **Confirmed**: Replit Auth working successfully with user authentication flow
- ✅ **Verified**: Real-time WebSocket connections established after authentication
- ✅ **Fixed**: Cursor positioning alignment with drawing coordinates
- ✅ **Simplified**: Coordinate system to use identical calculations for cursors and drawing
- ✅ **Confirmed**: Cursor dots now align perfectly with actual drawing positions
- ✅ **Implemented**: Session-based URL system for whiteboard sharing
- ✅ **Added**: Session creation with custom names from home page
- ✅ **Created**: Shareable URLs with unique session IDs
- ✅ **Added**: Share button with copy-to-clipboard functionality
- ✅ **Fixed**: WebSocket session awareness for proper multi-session isolation
- ✅ **Implemented**: Session-specific broadcasting and user tracking
- ✅ **Resolved**: Session sharing authentication flow for unauthenticated users
- ✅ **Added**: localStorage-based session redirect after authentication
- ✅ **Implemented**: Infinite canvas with viewport transformation system
- ✅ **Added**: Middle mouse wheel zoom functionality with zoom limits (0.1x - 5x)
- ✅ **Added**: Middle mouse button drag panning
- ✅ **Hidden**: All scrollbars globally for clean interface
- ✅ **Updated**: Coordinate system to handle world vs screen coordinates
- ✅ **Fixed**: User cursor positioning for zoomed/panned canvas
- ✅ **Added**: Zoom indicator with usage hints
- ✅ **Fixed**: Smooth zoom with 1% increments per scroll wheel step
- ✅ **Fixed**: Stable zoom centering to prevent canvas thrashing during zoom
- ✅ **Fixed**: Proportional zoom that centers around canvas center for consistent behavior
- ✅ **Fixed**: Viewport transformation to prevent drawing drift during zoom operations

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React hooks and context
- **Real-time Communication**: WebSockets with custom hook
- **HTTP Client**: Fetch API with React Query for caching
- **Routing**: Wouter for client-side routing

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Real-time**: WebSocket server for live collaboration
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for database operations
- **Session Management**: In-memory storage with fallback to database
- **Build Tool**: Vite for frontend, esbuild for backend

## Key Components

### Database Schema
- **users**: User authentication with Replit Auth integration
- **sessions**: PostgreSQL session storage for Replit Auth
- **whiteboard_sessions**: Named whiteboard sessions with unique IDs
- **whiteboard_users**: Active session users with cursor positions
- **drawing_strokes**: Persistent storage of drawing data

### Real-time Features
- **WebSocket Connection**: Automatic reconnection with exponential backoff
- **Live Cursor Tracking**: Real-time cursor position updates
- **Drawing Synchronization**: Stroke data broadcast to all connected users
- **User Presence**: Join/leave notifications with colored user indicators
- **Session Sharing**: Shareable URLs for collaborative sessions
- **Session Management**: Create, join, and share named whiteboard sessions

### Drawing Engine
- **Canvas API**: HTML5 Canvas for drawing operations
- **Tools**: Pen, eraser, and selection tools
- **Stroke Management**: Smooth line rendering with proper scaling
- **Responsive Design**: Mobile-first UI with touch support

## Data Flow

1. **User Connection**: WebSocket establishes connection, assigns color and name
2. **Drawing Events**: Mouse/touch events capture drawing data
3. **Real-time Broadcast**: Stroke data sent via WebSocket to all users
4. **Canvas Updates**: Other users' strokes rendered on local canvas
5. **Persistence**: Drawing data stored in PostgreSQL for session recovery

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver
- **drizzle-orm**: Type-safe database operations
- **ws**: WebSocket server implementation
- **@radix-ui/***: Headless UI components
- **@tanstack/react-query**: Server state management

### Development Tools
- **Vite**: Frontend build tool with HMR
- **TypeScript**: Type safety across the stack
- **Tailwind CSS**: Utility-first styling
- **esbuild**: Fast backend bundling

## Deployment Strategy

### Development
- **Scripts**: `npm run dev` starts both frontend and backend
- **Hot Reload**: Vite provides instant frontend updates
- **Environment**: Development server on Express with WebSocket support

### Production
- **Build Process**: `npm run build` creates optimized bundles
- **Static Assets**: Frontend built to `dist/public`
- **Server Bundle**: Backend bundled with esbuild to `dist/index.js`
- **Database**: PostgreSQL connection via environment variable

### Architecture Decisions

**WebSocket over HTTP**: Chosen for real-time collaboration requirements, enabling instant drawing updates and cursor tracking.

**Drizzle ORM**: Selected for type safety and PostgreSQL compatibility, with schema-first approach for better development experience.

**In-memory Storage**: Implemented for development with database fallback, allowing quick iteration while maintaining production readiness.

**Canvas API**: Used over SVG for better performance with complex drawings and easier stroke management.

**Mobile-first Design**: Responsive toolbar and touch-optimized drawing experience for cross-device compatibility.

The application prioritizes real-time collaboration, user experience, and type safety while maintaining a clean separation between frontend and backend concerns.