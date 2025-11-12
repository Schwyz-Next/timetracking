# Schwyz Next Time Tracker - TODO

## Database Schema & Models
- [x] Design and implement Projects table (name, hourly_rate, vat_type, total_quota_hours, warning_threshold, year, status)
- [x] Design and implement Categories table (code, name, description)
- [x] Design and implement TimeEntries table (date, start_time, end_time, duration_hours, project_id, category_id, description, kilometers, user_id)
- [x] Design and implement Invoices table (invoice_number, month, year, recipient_name, recipient_address, total_amount, status)
- [x] Design and implement InvoiceItems table (invoice_id, project_id, hours, rate, amount)
- [x] Add user relationship to time entries for multi-user support

## Project Management Features
- [x] Create project management page with CRUD operations
- [x] Add form to create/edit projects with all fields (name, rate, VAT type, quota, warning threshold, year)
- [x] Display project list with quota usage progress bars
- [x] Add visual indicators for quota warnings (80% or custom threshold)
- [x] Add project status toggle (active/archived)
- [x] Add project filtering by year and status
- [x] Add ability to clone projects for new years

## Category Management
- [x] Create category management interface
- [x] Pre-populate default categories (GF, NRP, IC, IS, TP, SE, KI, SU)
- [x] Allow custom category creation

## Time Entry Features
- [x] Create time entry form with date picker
- [x] Add start/end time pickers with automatic duration calculation
- [x] Add manual hour entry option (alternative to start/end times)
- [x] Add project dropdown selection
- [x] Add category dropdown selection
- [x] Add description text field for each entry
- [x] Add optional kilometers field
- [ ] Implement validation to prevent overlapping time entries
- [ ] Show real-time quota warning when entering time for projects near limit
- [x] Create time entry list/calendar view
- [x] Add edit and delete functionality for time entries
- [x] Add filtering by date range, project, category, and user

## Multi-User Support
- [x] Implement user authentication and authorization
- [ ] Add user profile management
- [x] Add role-based access control (admin vs regular user)
- [x] Filter time entries by logged-in user
- [x] Add admin view to see all users' time entries

## Invoice Generation
- [x] Create invoice generation interface (select month/year)
- [x] Implement automatic grouping of time entries by project
- [x] Calculate totals per project with correct rates
- [x] Apply VAT handling (inclusive/exclusive) per project type
- [x] Generate invoice number automatically (sequential)
- [ ] Create professional PDF invoice template
- [x] Add invoice recipient configuration (name, address)
- [x] Display invoice preview before generation
- [x] Save generated invoices to database
- [x] Add invoice status tracking (draft/sent/paid)
- [x] Add invoice list view with search and filter

## Reporting & Analytics
- [x] Create dashboard with current month summary
- [x] Add project quota usage visualization (progress bars/charts)
- [ ] Display year-to-date totals
- [ ] Show revenue breakdown by project type
- [ ] Create monthly timesheet report
- [ ] Create project-specific reports
- [ ] Add multi-year comparison view

## Data Import/Export
- [ ] Create Excel import functionality for existing 2025 data
- [ ] Add data export to Excel format
- [ ] Add data export to CSV format
- [ ] Add PDF export for reports
- [x] Implement full database backup/restore
- [x] Create backup script (pnpm db:backup)
- [x] Create restore script (pnpm db:restore)
- [x] Configure git to track latest backup
- [x] Document backup/restore workflow

## UI/UX Enhancements
- [x] Design clean, professional interface following Swiss quality standards
- [x] Ensure mobile-responsive design
- [x] Add loading states and error handling
- [x] Add success/error notifications
- [x] Implement form validation with helpful error messages
- [ ] Add keyboard shortcuts for quick time entry
- [ ] Add dark mode support (optional)

## Testing & Quality
- [ ] Test all CRUD operations
- [ ] Test quota warning system
- [ ] Test invoice generation with sample data
- [ ] Import and verify existing Excel data
- [ ] Test multi-user scenarios
- [ ] Test data export functionality
- [ ] Verify all calculations are accurate (no formula errors)

## Documentation & Deployment
- [ ] Create user guide for time entry workflow
- [ ] Document invoice generation process
- [ ] Create admin guide for project management
- [ ] Save checkpoint for deployment
- [ ] Deploy application

## User Management (Admin Only)
- [x] Create user management page (admin only)
- [x] Display list of all users with their roles
- [x] Add ability to change user roles (admin/user)
- [x] Add ability to deactivate/delete users
- [x] Show user statistics (total hours, projects, entries)
- [x] Add user invitation system (via OAuth auto-creation)
- [x] Implement role-based access control for user management
- [x] Add Users menu item (visible only to admins)
- [x] Prevent admins from demoting/deleting themselves

## Local Authentication System
- [x] Add password field to users table
- [x] Implement password hashing with bcrypt
- [x] Create local login endpoint (username/password)
- [x] Create user creation form for admins (username/password)
- [x] Add password reset functionality (admin can reset user passwords)
- [x] Create custom login page with username/password form and OAuth button
- [ ] Distinguish between OAuth users and local users in UI
- [x] Add password change functionality for local users

## Activity Logging & Audit Trail
- [x] Create audit_logs table (user_id, action, entity_type, entity_id, old_value, new_value, ip_address, timestamp)
- [x] Log user role changes
- [x] Log user creation/deletion
- [x] Log time entry creation/modification/deletion
- [x] Log project creation/modification
- [ ] Log invoice generation
- [x] Create audit log viewer page (admin only)
- [x] Add filtering by user, action type, date range
- [ ] Add export audit logs to CSV

## Data Import
- [x] Import September 2025 time entries from user-provided data
- [x] Import October 2025 time entries from user-provided data
- [x] Seed all default Swiss categories (GF, NRP, IC, IS, TP, SE, KI, SU)

## Dashboard Enhancements
- [x] Update quota color coding: green (within quota), orange (warning threshold), red (over quota with overage amount)
- [x] Add month-by-month chart visualization
- [x] Add last 3 months overview boxes
- [x] Add annual overview summary box

## Time Entries Filtering
- [x] Add month/year filter to Time Entries page

## Bug Fixes
- [x] Fix month filter showing September 30 entries in October filter (timezone issue resolved)

## Time Entries Page Enhancements
- [x] Add monthly summary section showing hours per project for selected month
- [x] Fix quota indicator bar to show green when at quota but not over by more than 1h

## UI Cleanup
- [ ] Remove "Made with Manus" badge from bottom right (Note: Badge appears to be injected by Manus platform, not in codebase)
- [x] Change OAuth button text to "Sign in with OAuth" on login page
