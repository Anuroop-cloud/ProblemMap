# Overview

CollectiveProblems is a crowd-sourced, AI-powered platform that collects real-world problems from both Reddit API and direct user submissions. The application uses Google's Gemini AI to analyze, summarize, and categorize problems, then displays them in an organized feed where entrepreneurs can discover validated startup opportunities. Users can vote on problems, explore problem clusters, and connect with entrepreneurs interested in specific domains.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side is built with React and TypeScript, using a modern component-based architecture:

- **UI Framework**: React with TypeScript, using Vite for build tooling and development
- **Styling**: Tailwind CSS with a dark theme design system, using CSS custom properties for theming
- **Component Library**: Radix UI primitives with custom shadcn/ui components for consistent design
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

## Backend Architecture
The server follows a REST API pattern with Express.js:

- **Framework**: Express.js with TypeScript for type safety
- **Database Layer**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful endpoints for problems, votes, and entrepreneurs
- **Middleware**: Custom logging middleware for API request tracking
- **Error Handling**: Centralized error handling with proper HTTP status codes

## Data Storage
PostgreSQL database with Drizzle ORM for schema management:

- **Primary Database**: PostgreSQL via Neon serverless connection
- **ORM**: Drizzle ORM with migrations support
- **Schema**: Three main tables - problems, votes, and entrepreneurs with proper relationships
- **Data Types**: Support for arrays (keywords, expertise), JSON fields, and UUID primary keys

## AI Integration
Google Gemini API for problem analysis and clustering:

- **Problem Analysis**: Automatic summarization, keyword extraction, and categorization
- **Structured Output**: JSON schema validation for consistent AI responses
- **Categories**: Pre-defined categories including Healthcare, Technology, Environment, Education, Governance, Traffic, and Other
- **Clustering**: AI-powered problem clustering to identify recurring themes and innovation gaps

## Authentication & Authorization
Currently designed for anonymous usage with optional user identification:

- **User Identification**: Optional user identifiers for vote tracking
- **Anonymous Submissions**: Support for anonymous problem submissions
- **Vote Tracking**: Basic voting system with user identifier tracking

# External Dependencies

## Third-Party Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Google Gemini AI**: Problem analysis, summarization, and categorization service
- **Reddit API**: Automated data collection from specified subreddits for problem discovery

## Development Tools
- **Replit Integration**: Custom Replit plugins for development environment
- **Vite**: Frontend build tool with hot module replacement
- **TypeScript**: Type checking across frontend, backend, and shared schemas

## UI Libraries
- **Radix UI**: Headless component primitives for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide Icons**: Icon library for consistent iconography
- **React Hook Form**: Form state management and validation

## Data Fetching & State
- **TanStack Query**: Server state management, caching, and synchronization
- **Drizzle Kit**: Database migrations and schema management
- **Zod**: Runtime type validation for API requests and responses