# Complete System Documentation - AI-Powered Website Audit Platform

## Executive Summary

This is a comprehensive AI-powered website audit tool focused on LLM (Large Language Model) visibility analysis. The platform evaluates how well websites perform for ChatGPT, Gemini, Perplexity, and other AI search engines, rather than traditional SEO.

**Primary Use Case**: Embedded as iframe at https://revenueexperts.ai/getseenanalyzer/ for lead generation and client analysis.

## System Architecture Overview

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript  
- **Database**: PostgreSQL with Drizzle ORM
- **AI Engine**: Google Gemini 2.5 Pro
- **Web Scraping**: Puppeteer + Cheerio
- **UI Framework**: Radix UI + shadcn/ui + Tailwind CSS
- **Authentication**: Replit OpenID Connect
- **Email**: SendGrid for HTML reports
- **CRM**: HubSpot API integration

### Core Components Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Client  │────│  Express Server  │────│   PostgreSQL    │
│                 │    │                  │    │    Database     │
│ - Analysis Form │    │ - API Routes     │    │ - User Data     │
│ - Results View  │    │ - Auth Middleware│    │ - Analysis      │
│ - Admin Panel   │    │ - Rate Limiting  │    │   Results       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────┐           ┌─────────────┐         ┌─────────────┐
    │   UI    │           │   Services  │         │  External   │
    │ Components│          │             │         │  Services   │
    │         │           │ - Scraper   │         │             │
    │- Forms  │           │ - AI Engine │         │ - Gemini AI │
    │- Tables │           │ - Email     │         │ - SendGrid  │
    │- Charts │           │ - Storage   │         │ - HubSpot   │
    └─────────┘           └─────────────┘         └─────────────┘
```

## Core Features

### 1. Single-Page Analysis
- **URL Validation**: Real-time website accessibility checking
- **AI Analysis**: Comprehensive LLM visibility scoring using Gemini 2.5 Pro
- **5-Category Scoring**: AI/LLM Visibility (25%), Technical (20%), Content (25%), Accessibility (10%), Authority (20%)
- **Red Flag Detection**: Critical issues that block AI discovery
- **Quick Fixes**: Non-technical actionable recommendations
- **Caching**: 24-hour intelligent caching to reduce costs

### 2. Multi-Page Analysis
- **Password Protection**: "GeoSeo" password for advanced analysis
- **Session-Based Processing**: Real-time progress tracking via session polling
- **Domain Intelligence**: Calculates averages, best/worst pages, success rates
- **Cache Bypass**: Ensures accurate collective scoring across page combinations
- **Progress Indicators**: Real-time status updates every 3 seconds

### 3. Email Report System
- **HTML Reports**: Professional email templates with visual scoring
- **Lead Capture**: Integrated form with email validation
- **HubSpot Integration**: Automatic contact creation and activity logging
- **Multi-format Support**: Both single-page and multi-page analysis reports
- **Unsubscribe Compliance**: Proper email footer with unsubscribe options

### 4. Admin Dashboard
- **Analytics**: Usage metrics, score distributions, geographic data
- **Session Management**: Secure admin authentication with concurrent session limits
- **Data Management**: Analysis filtering, search, and deletion capabilities
- **Auto-refresh**: Optional 30-second dashboard updates
- **IP Tracking**: Real client IP detection through proxy headers

## Detailed Component Documentation

### Frontend Architecture (`client/src/`)

#### Key Components:
1. **AnalysisForm** (`components/analysis-form.tsx`)
   - URL validation with regex patterns
   - Real-time website accessibility checking
   - Multi-stage error handling with specific user guidance

2. **ResultsSection** (`components/results-section.tsx`)
   - 5-category score visualization with color coding
   - Intelligent red flag detection by category
   - Accordion-based report organization
   - Quick Fixes display with step-by-step instructions

3. **MultiPageAnalysis** (`pages/multi-page-analysis.tsx`)
   - Password-protected advanced analysis
   - Real-time progress tracking with session polling
   - Domain-level insights and recommendations

4. **AdminDashboard** (`pages/admin.tsx`)
   - Comprehensive analytics with charts
   - Session-based authentication
   - Real-time data filtering and search

### Backend Architecture (`server/`)

#### Core Services:

1. **Web Scraping Engine** (`services/scraper.ts`)
   - **Anti-Bot Detection**: 5-tier progressive fallback strategy
   - **Rate Limiting**: Domain-based throttling (3 requests/minute)
   - **Browser Fingerprinting**: Randomized device characteristics
   - **Fallback Strategy**: From stealth browser simulation to minimal headers

2. **AI Analysis Engine** (`services/gemini.ts`)
   - **Prompt Engineering**: 1000+ line specialized LLM visibility prompt
   - **Scoring Algorithm**: Weighted 5-category system with penalty enforcement
   - **Timeout Management**: 90-second analysis with race conditions
   - **Error Handling**: Specific categorization for different failure modes

3. **Analysis Orchestrator** (`services/seo-analyzer.ts`)
   - **Pipeline Coordination**: Data extraction → validation → AI processing
   - **Quality Validation**: Content availability, error page detection
   - **Timeout Strategy**: 60s scraping, 90s AI analysis
   - **Error Categorization**: Network, access, AI service, validation errors

#### API Endpoints (`routes.ts`):

**Public Endpoints:**
- `POST /api/analyze` - Single-page analysis
- `POST /api/multi-page-analyze` - Multi-page analysis with password
- `POST /api/validate-url` - Website accessibility validation
- `POST /api/send-report` - Email report generation
- `POST /api/capture-lead` - Lead capture with HubSpot integration

**Admin Endpoints:**
- `POST /api/admin/login` - Session-based authentication
- `GET /api/admin/analytics` - Usage analytics and metrics
- `GET /api/admin/storage` - Analysis data management
- `DELETE /api/admin/analysis/:id` - Analysis deletion

**Session Management:**
- `GET /api/session/:sessionId` - Multi-page progress tracking
- Session-based real-time progress updates
- In-memory session storage with cleanup

### Database Schema (`shared/schema.ts`)

#### Core Tables:
1. **users** - User authentication (required for Replit Auth)
2. **sessions** - Session storage (required for Replit Auth)  
3. **analyses** - Analysis results with JSON storage
4. **adminSessions** - Admin session management

#### Key Fields:
- **Analysis Results**: JSON field with flexible schema
- **Status Tracking**: pending, completed, failed states
- **Metadata**: IP tracking, user agents, timestamps
- **Scores**: Individual category scores and overall score

## AI Analysis System

### Scoring Algorithm

**Mathematical Formula:**
```
Overall Score = (AI/LLM Visibility × 0.25) + (Technical × 0.20) + (Content × 0.25) + (Accessibility × 0.10) + (Authority × 0.20)
```

**Penalty System:**
- Missing robots.txt for AI bots: -2.5 Technical points
- No FAQ sections: -4 Content points
- No author info: -4 Authority points  
- Generic content: -4 Content points
- Slow loading (>3s): -2 Technical points
- Missing structured data: -2.5 Technical points

**Realistic Score Distribution:**
- Most websites: 15-35/100 (Poor - no AI optimization)
- Average business: 25-45/100 (Below Average - basic content)
- Well-built sites: 45-65/100 (Average - some optimization)
- AI-optimized: 65-80/100 (Good - purposeful LLM preparation)
- Industry leaders: 80-95/100 (Excellent - comprehensive optimization)

### Red Flag Detection

**Critical AI Visibility Blockers:**
1. **No robots.txt allowing AI bots** (GPTBot, ClaudeBot, CCBot blocked)
2. **No FAQ sections for AI citation** (Missing Q&A format)
3. **No author/expertise info** (Lacks E-A-T signals)
4. **Generic content with no quotable value** (Not structured for citation)
5. **No structured data** (Schema markup missing)
6. **Slow loading (>3 seconds)** (AI crawlers may timeout)

## Security & Performance

### Security Measures
- **API Key Protection**: Secure wrapper with sanitization
- **Rate Limiting**: Endpoint-specific limits (15 requests/15min for analysis)
- **Input Sanitization**: Comprehensive data validation
- **Session Security**: Secure session management with expiration
- **DDOS Protection**: Multi-layer protection (currently disabled for development)

### Performance Optimizations
- **Intelligent Caching**: 24-hour cache for single-page, bypass for multi-page
- **Timeout Management**: Aggressive timeouts prevent resource exhaustion
- **Progressive Fallbacks**: Multiple strategies prevent analysis failures
- **Database Optimization**: Efficient queries with pagination

## Deployment & Environment

### Production Environment
- **URL**: https://rex-geo-seo-analyzer.replit.app
- **Embedded**: https://revenueexperts.ai/getseenanalyzer/ (iframe)
- **Database**: PostgreSQL via DATABASE_URL
- **Node Environment**: Production mode required for proper API handling

### Environment Variables
- `GEMINI_API_KEY` - Google AI API access
- `SENDGRID_API_KEY` - Email service
- `HUBSPOT_API_KEY` - CRM integration
- `DATABASE_URL` - PostgreSQL connection
- `SESSION_SECRET` - Session encryption
- `ADMIN_API_KEY` - Admin authentication

## Integration Points

### WordPress Integration
- **Iframe Embedding**: Responsive design for various screen sizes
- **Block Editor**: Custom HTML block integration
- **Shortcode Support**: [iframe] shortcode implementation
- **Plugin Alternative**: Custom WordPress plugin development option

### HubSpot CRM Integration
- **Contact Creation**: Automatic lead capture with email validation
- **Activity Logging**: Analysis completion tracking
- **Custom Properties**: Score tracking and analysis metadata
- **Follow-up Tasks**: Automated task creation for sales team

### Email Integration (SendGrid)
- **HTML Templates**: Professional email design with score visualization
- **Multi-format Reports**: Single-page and multi-page analysis reports
- **Compliance**: Unsubscribe functionality and footer compliance
- **Delivery Tracking**: Send success/failure monitoring

## Development Guidelines

### Code Quality Standards
- **TypeScript**: Strict typing throughout codebase
- **JSDoc Comments**: Comprehensive documentation for complex functions
- **Error Handling**: Specific error messages with user guidance
- **Testing**: Manual testing with real websites (no mock data)

### Maintenance Requirements
- **API Key Rotation**: Regular key updates for security
- **Database Maintenance**: Analysis cleanup and optimization
- **Performance Monitoring**: Response time and error rate tracking
- **Content Updates**: Prompt engineering refinements based on AI model updates

## Future Roadmap

### Planned Enhancements
1. **Payment Integration**: Stripe payment for multi-page analysis
2. **Advanced Analytics**: Deeper insights and trend analysis  
3. **API Access**: Third-party developer API with authentication
4. **White-label Solutions**: Branded versions for agencies
5. **Competitive Analysis**: Side-by-side website comparisons
6. **Performance Monitoring**: Automated website monitoring service

## Critical Success Metrics

### Business Metrics
- **Lead Generation**: Email captures and HubSpot contact creation
- **Analysis Completion Rate**: Percentage of successful analysis requests
- **User Engagement**: Time spent reviewing analysis results
- **Conversion Tracking**: Analysis to consultation conversion rates

### Technical Metrics
- **Response Time**: Analysis completion under 3 minutes
- **Error Rate**: Less than 5% analysis failures
- **Uptime**: 99%+ availability for embedded iframe
- **Cache Hit Rate**: 70%+ cache utilization for cost optimization

---

*This documentation represents the complete system as of January 19, 2025. For the most current information, refer to the replit.md file and recent git commits.*