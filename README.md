# Schwyz Next Time Tracker

A professional time tracking and invoicing application built for Schwyz Next to manage project hours, track time entries across multiple years, and generate monthly invoices in Swiss Francs.

![Schwyz Next Logo](client/public/schwyznextlogo.jpg)

## Features

### 📊 Project Management
- Create and manage multiple projects with different hourly rates
- Set project quotas with customizable warning thresholds
- Track VAT types (inclusive/exclusive) per project
- Monitor project usage with visual progress bars
- Archive completed projects while maintaining historical data
- Clone projects for new fiscal years

### ⏱️ Time Entry Tracking
- Log time entries with date, project, and category
- Support for both manual hour entry and start/end time calculation
- Add descriptions and kilometers to each entry
- Categorize entries with predefined Swiss categories (GF, NRP, IC, IS, TP, SE, KI, SU)
- Filter and search time entries by date range, project, category, and user
- Multi-year data storage

### 💰 Invoice Generation
- Automatically generate monthly invoices from time entries
- Group entries by project with correct hourly rates
- Sequential invoice numbering (YYYY-MM-XXX format)
- Track invoice status (draft, sent, paid)
- Preview invoice totals before generation
- Store recipient information for each invoice

### 👥 Multi-User Support
- Role-based access control (admin/user)
- Each user tracks their own time entries
- Admins can view all users' data
- Secure authentication via Manus OAuth

### 📈 Dashboard & Analytics
- Real-time overview of monthly hours and active projects
- Project quota warnings when approaching limits
- Monthly summary statistics
- Visual progress indicators for project quotas

## Tech Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS 4
- **Backend:** Express 4 + tRPC 11
- **Database:** MySQL/TiDB with Drizzle ORM
- **Authentication:** Manus OAuth
- **UI Components:** shadcn/ui
- **Date Handling:** date-fns

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- MySQL or TiDB database

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Schwyz-Next/timetracking.git
cd timetracking
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
The application uses Manus platform environment variables which are automatically injected. For local development, ensure you have:
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Session signing secret
- OAuth configuration (provided by Manus platform)

4. Push database schema:
```bash
pnpm db:push
```

5. Start the development server:
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
├── client/                 # Frontend React application
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable UI components
│   │   ├── lib/           # tRPC client setup
│   │   └── const.ts       # App constants (logo, title)
├── server/                # Backend Express + tRPC
│   ├── routers/           # tRPC route handlers
│   │   ├── projects.ts    # Project management
│   │   ├── timeEntries.ts # Time entry tracking
│   │   ├── categories.ts  # Category management
│   │   └── invoices.ts    # Invoice generation
│   ├── db.ts              # Database helpers
│   └── _core/             # Framework plumbing
├── drizzle/               # Database schema
│   └── schema.ts          # Table definitions
└── shared/                # Shared types and constants
```

## Usage

### 1. Initial Setup

1. Navigate to **Settings** and click "Seed Defaults" to populate standard Swiss categories
2. Go to **Projects** and create your first project with hourly rate and quota
3. Start tracking time in **Time Entries**

### 2. Tracking Time

- Click "Add Time Entry" from the dashboard or Time Entries page
- Select project and category
- Enter time using either:
  - Manual hours input (e.g., 2.5 hours)
  - Start and end times (automatically calculated)
- Add description and optional kilometers
- Save to record the entry

### 3. Generating Invoices

- Navigate to **Invoices**
- Click "Generate Invoice"
- Select month and year
- Preview the grouped time entries by project
- Enter recipient information
- Generate to create the invoice
- Update status as needed (draft → sent → paid)

## Database Schema

### Main Tables

- **users** - User accounts with OAuth integration
- **projects** - Project definitions with rates and quotas
- **categories** - Time entry categories
- **timeEntries** - Individual time logs
- **invoices** - Generated invoices
- **invoiceItems** - Line items for each invoice

## Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm db:push` - Push schema changes to database
- `pnpm db:studio` - Open Drizzle Studio for database management

### Key Design Decisions

1. **Time Storage:** Hours are stored as integers (multiplied by 100) to avoid floating-point precision issues
2. **Currency:** All amounts in Swiss Francs, stored as integers (multiplied by 100)
3. **Invoice Numbering:** Sequential format YYYY-MM-XXX ensures unique, sortable invoice numbers
4. **Multi-Year Support:** No data archiving - all historical data remains accessible

## Customization

### Branding

Update the logo by replacing `client/public/schwyznextlogo.jpg` and modifying `APP_LOGO` in `client/src/const.ts`.

### Categories

Default Swiss categories are provided but can be customized in Settings. Add, edit, or remove categories as needed for your workflow.

## Deployment

The application is designed to be deployed on the Manus platform with built-in:
- Database provisioning
- OAuth authentication
- Environment variable management
- Automatic SSL/TLS

For deployment:
1. Save a checkpoint in the Manus UI
2. Click "Publish" to deploy to production
3. Configure custom domain if desired

## Roadmap

- [ ] PDF invoice export with Swiss formatting
- [ ] Excel data import for existing time entries
- [ ] Enhanced reporting (yearly summaries, project profitability)
- [ ] Email invoice delivery
- [ ] Recurring project templates
- [ ] Mobile-responsive optimizations
- [ ] Dark mode support

## Contributing

This is a private project for Schwyz Next. For questions or support, contact the development team.

## License

Proprietary - All rights reserved by Schwyz Next

## Author

**darkn8t** (Vikram Bhatnagar)  
Email: vikram@vikram.io

---

Built with ❤️ for Schwyz Next
