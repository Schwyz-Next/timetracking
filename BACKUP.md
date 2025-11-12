# Database Backup & Restore Guide

This guide explains how to backup and restore your time tracking data to/from GitHub.

## 🔄 Automatic Backup to GitHub

Your database can be backed up to JSON files and committed to GitHub for version control and disaster recovery.

### Creating a Backup

Run the backup script:

```bash
pnpm db:backup
```

This will:
- Export all data from the database to JSON format
- Create a timestamped backup file: `backups/backup-YYYY-MM-DDTHH-MM-SS.json`
- Update `backups/latest.json` (tracked in git)
- Display statistics about the backed-up data

### What Gets Backed Up

- ✅ All projects with rates and quotas
- ✅ All categories
- ✅ All time entries
- ✅ All invoices and invoice items
- ⚠️ User accounts are NOT backed up (OAuth data is preserved)

### Committing Backups to GitHub

The `latest.json` file is tracked in git, so after running a backup:

```bash
git add backups/latest.json
git commit -m "Update database backup"
git push
```

**Note:** Timestamped backup files (`backup-*.json`) are excluded from git to avoid repository bloat. Only `latest.json` is committed.

## 📥 Restoring from Backup

### Restore from Latest Backup

```bash
pnpm db:restore
```

This uses `backups/latest.json` by default.

### Restore from Specific Backup

```bash
pnpm db:restore backup-2025-11-12T19-12-21-566Z.json
```

### ⚠️ Important Warnings

- **This will DELETE all existing data** (except user accounts)
- You have a 5-second countdown to cancel (Ctrl+C)
- User accounts are preserved to maintain OAuth authentication
- Foreign key relationships are respected during restore

## 🚨 Disaster Recovery Scenarios

### Scenario 1: Manus Project Corrupted

If your Manus project becomes corrupted:

1. Clone the repository from GitHub:
   ```bash
   git clone https://github.com/Schwyz-Next/timetracking.git
   cd timetracking
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Push database schema:
   ```bash
   pnpm db:push
   ```

4. Restore data from backup:
   ```bash
   pnpm db:restore
   ```

5. Start the application:
   ```bash
   pnpm dev
   ```

### Scenario 2: Accidental Data Deletion

If you accidentally delete important data:

1. Find the last good backup in `backups/` directory
2. Restore from that backup:
   ```bash
   pnpm db:restore backup-YYYY-MM-DDTHH-MM-SS.json
   ```

### Scenario 3: Rolling Back to Previous State

If you want to revert to a previous state:

1. Pull the old version from GitHub history:
   ```bash
   git checkout <commit-hash> -- backups/latest.json
   ```

2. Restore from that backup:
   ```bash
   pnpm db:restore
   ```

## 📋 Best Practices

### Regular Backups

Create a backup:
- **Daily** during active development
- **Before major changes** (schema updates, bulk imports)
- **Before deploying** to production
- **After completing invoices** for the month

### Backup Workflow

1. Run backup:
   ```bash
   pnpm db:backup
   ```

2. Commit to GitHub:
   ```bash
   git add backups/latest.json
   git commit -m "Backup: $(date +%Y-%m-%d)"
   git push
   ```

3. Optionally save the timestamped backup file elsewhere for extra safety

### Automation

You can automate daily backups with a cron job:

```bash
# Add to crontab (crontab -e)
0 2 * * * cd /path/to/timetracking && pnpm db:backup && git add backups/latest.json && git commit -m "Auto backup $(date +\%Y-\%m-\%d)" && git push
```

## 🔍 Inspecting Backups

Backup files are plain JSON, so you can inspect them:

```bash
cat backups/latest.json | jq '.stats'
```

This shows how many records of each type are in the backup.

## 🛡️ Data Safety

### What's Protected

- ✅ **Code**: Fully backed up on GitHub
- ✅ **Database Schema**: Defined in `drizzle/schema.ts`
- ✅ **Database Data**: Backed up in `backups/latest.json`
- ✅ **Manus Checkpoints**: Platform-level backups with full state

### What's NOT in GitHub

- ❌ Environment variables (DATABASE_URL, secrets)
- ❌ User OAuth tokens (managed by Manus platform)
- ❌ Timestamped backup files (only latest.json)

## 📞 Support

If you encounter issues with backup/restore:

1. Check that `DATABASE_URL` environment variable is set
2. Verify database connectivity
3. Ensure you have write permissions to the `backups/` directory
4. Review error messages for specific issues

---

**Remember:** Backups are only useful if you create them regularly! Make it part of your workflow.
