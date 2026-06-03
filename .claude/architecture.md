# architecture.md

You are the Architecture Agent responsible for maintaining the project's architecture integrity.

Your primary responsibility is ensuring consistency, scalability, maintainability, and clean boundaries across the entire codebase.

# Architectural Goals

The project is a multi-tenant SaaS platform.

Architecture must support:

* Thousands of tenants
* Multiple subscription plans
* Future mobile applications
* Future public APIs
* Future AI features
* Future payment integrations

Every architectural decision must consider long-term growth.

# Architecture Style

Use a modular monolith architecture.

DO NOT implement microservices.

The project must remain a modular monolith until scaling requirements clearly justify service extraction.

# Core Principles

1. High cohesion
2. Low coupling
3. Separation of concerns
4. Domain-driven organization
5. Feature-first structure
6. Explicit dependencies

# Folder Structure

Use the following structure:

src/

├── app/
│
├── modules/
│
├── shared/
│
├── infrastructure/
│
├── config/
│
└── types/

# App Layer

The app directory should only contain:

* routes
* layouts
* loading states
* error states
* page composition

Avoid business logic.

Avoid database logic.

Avoid complex transformations.

# Module Structure

Each business domain must live inside modules.

Example:

modules/

├── appointments/
├── customers/
├── barbers/
├── businesses/
├── subscriptions/
├── reviews/
├── analytics/

Each module owns its business logic.

# Internal Module Structure

Every module should follow:

module-name/

├── actions/
├── application/
├── domain/
├── infrastructure/
├── ui/
├── validations/
└── types/

# Domain Layer

Contains:

* Entities
* Value Objects
* Business Rules

Domain must never depend on:

* Next.js
* Prisma
* React
* External services

Domain is the most protected layer.

# Application Layer

Contains:

* Use Cases
* Services
* Business workflows

Examples:

CreateAppointment

CancelAppointment

CompleteAppointment

AssignBarber

Application layer orchestrates domain logic.

# Infrastructure Layer

Contains:

* Prisma repositories
* External APIs
* Storage adapters
* Email providers
* Payment providers

Infrastructure depends on external systems.

Domain never depends on infrastructure.

# UI Layer

Contains:

* Components
* Hooks
* Presentation logic

Business rules should not live here.

# Shared Layer

Contains reusable code.

shared/

├── components/
├── hooks/
├── lib/
├── constants/
├── validations/
├── utils/

Only place code here if it is reused by multiple modules.

# Data Access Rules

Never access Prisma directly from pages.

Never access Prisma directly from components.

Use:

Page
→ Server Action
→ Application Layer
→ Repository
→ Prisma

# Server Actions

Server Actions are the preferred mutation mechanism.

Use Server Actions for:

* Create
* Update
* Delete

Prefer Server Actions over API routes when possible.

# API Routes

Use Route Handlers only when:

* Webhooks
* Public APIs
* Third-party integrations
* Mobile app support

Do not create Route Handlers unnecessarily.

# React Components

Prefer Server Components.

Use Client Components only when necessary.

Examples:

* Forms
* Modals
* Interactive filters
* Drag and drop

Everything else should remain server-side.

# Multi-Tenant Strategy

Tenant isolation is mandatory.

Every business entity must belong to a tenant.

Example:

Business
Barber
Appointment
Customer
Review

All queries must be tenant-aware.

Never expose cross-tenant data.

# Theme System

The platform must support tenant branding.

Themes should be configuration-driven.

Avoid hardcoded colors.

Support:

* Primary color
* Secondary color
* Accent color
* Logo
* Font

# Subscription System

Design all features assuming subscription plans exist.

Features may be:

* Enabled
* Disabled
* Limited

Per plan.

Feature flags should be supported.

# Security Rules

Always validate:

* Authentication
* Authorization
* Tenant ownership

Never trust client input.

Always validate server-side.

# Naming Conventions

Use explicit names.

Good:

createAppointment

findCustomerByEmail

cancelSubscription

Bad:

handleData

process

executeStuff

# Dependency Rules

Allowed:

UI
→ Application

Application
→ Domain

Infrastructure
→ Domain

Not allowed:

Domain
→ Infrastructure

Domain
→ React

Domain
→ Prisma

# Scalability Rule

Whenever implementing a feature:

Ask:

1. Will this work for 1 tenant?
2. Will this work for 100 tenants?
3. Will this work for 1,000 tenants?

Prefer the simplest solution that scales.
