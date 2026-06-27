# Packivo ERP — Smart Packaging Factory Management

**Packivo ERP** is a comprehensive, multi-tenant cloud ERP solution built specifically for packaging manufacturers and carton box factories. It simplifies factory operations from raw material inward to finished goods dispatch, providing real-time stock tracking, order scheduling, and operational visibility.

## Project Structure

This monorepo contains the following components:

- **`lanidng page`**: The customer-facing marketing website. Built using **Next.js 15 (App Router)** and styled with custom **Vanilla CSS**, featuring premium hardware-accelerated animations powered by **Framer Motion**.
- **`tenant-app`**: The application used by packaging factories to manage raw materials, kraft rolls, production jobs (3-ply, 5-ply, 7-ply), dispatches, challans, and roles. Built on **Next.js**.
- **`super-admin-app`**: The platform administration portal to manage tenants, subscriptions, and platform-wide configurations. Built on **Next.js**.
- **`backend`**: The robust core API backend built with Node.js and **Prisma ORM**, powering database operations and data synchronizations.

---

## Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### Installation

Install dependencies for all workspaces from the project root:

```bash
# Install root and backend dependencies
npm install

# Install landing page dependencies
cd "lanidng page"
npm install

# Install tenant app dependencies
cd "../tenant-app"
npm install

# Install super admin dependencies
cd "../super-admin-app"
npm install
```

### Running Locally

To run the apps in development mode:

#### Marketing Landing Page
```bash
cd "lanidng page"
npm run dev
```
Runs the landing page locally at `http://localhost:3000`.

#### Tenant Application
```bash
cd tenant-app
npm run dev
```

#### Super Admin Application
```bash
cd super-admin-app
npm run dev
```

#### Backend API
```bash
cd backend
npm run dev
```

---

## Features (Landing Page)

- **AI-powered Forecasting Info**: Interactive banner highlighting production forecasts.
- **Interactive Billing Toggle**: Real-time pricing calculations showing monthly vs. annual subscription models.
- **Subscription pricing starts at ₹299/month** (Starter Plan).
- **Responsive Navigation**: Full mobile support with fluid transitions.
- **Scroll-triggered Animations**: Feature grids, steps, and cards animate smoothly into view using Framer Motion.
- **Interactive FAQ Accordion**: Dropdown answers with smooth height transitions.
- **Logos Strip & Testimonials**: Social proof of trusted packaging companies across India.
