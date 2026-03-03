# Checklist System - Complete Implementation

## ✅ System Overview

The checklist system tracks employee completion of daily opening, closing, and maintenance tasks with:
- **Automatic 8 AM reset** (before 8 AM shows yesterday's checklist)
- **User attribution** (who completed each task)
- **Historic tracking** (permanent database records)
- **Automatic database backups** at 8 AM daily

---

## 📊 Database Schema

### ChecklistTemplate
Stores the master list of tasks (15 total):
- 8 opening procedures
- 6 closing procedures  
- 1 maintenance task

Fields:
- `id` - Unique identifier
- `category` - opening/closing/maintenance
- `task_name` - Description of task
- `display_order` - Sort order
- `is_active` - Can disable tasks without deleting

### ChecklistCompletion
Records every time someone completes a task:
- `id` - Unique identifier
- `template_id` - Which task was completed
- `user_id` - Who completed it
- `completion_date` - Which day it was for (YYYY-MM-DD)
- `completed_at` - Exact timestamp
- `notes` - Optional notes

---

## 🔄 How It Works

### Daily Reset Logic (8:00 AM)
```
Current Time < 8:00 AM → Show yesterday's checklist
Current Time ≥ 8:00 AM → Show today's checklist
```

When the clock hits 8:00 AM:
1. Checklist automatically switches to new day
2. All checkboxes reset to unchecked
3. Previous day's completions stored permanently in database
4. **Automatic backup runs** (exports all data)

### Frontend Behavior
- Fetches checklist from `/api/checklist/today` every 60 seconds
- Shows 3 sections: Opening, Closing, Maintenance
- Checkboxes become checked and disabled when completed
- Shows ✓ and employee name next to completed items
- Strike-through styling for completed tasks

### Backend Behavior
- Prevents duplicate completions (same task + same date)
- Stores user who clicked checkbox
- Records exact timestamp
- Owners/managers can view historic completion data

---

## 📡 API Endpoints

### Get Today's Checklist
```
GET /api/checklist/today
Authorization: Bearer {jwt_token}
```

Returns array of checklist items with completion status:
```json
[
  {
    "id": 1,
    "category": "opening",
    "task_name": "Turn on light",
    "display_order": 1,
    "is_completed": true,
    "completed_by": "John Doe",
    "completed_at": "2026-03-02T07:30:15.123456",
    "notes": null
  }
]
```

### Mark Item Complete
```
POST /api/checklist/complete
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "template_id": 1,
  "completion_date": "2026-03-02",
  "notes": "Optional note"
}
```

### View History (Owner/Manager Only)
```
GET /api/checklist/history?start_date=2026-03-01&end_date=2026-03-31
Authorization: Bearer {jwt_token}
```

Returns completion history with user names for date range.

---

## 🎯 Employee Usage

1. **Open dashboard** at start of shift
2. **Check off tasks** as you complete them
3. **See completed items** turn green with checkmark
4. **Cannot uncheck** items once completed (prevents fraud)
5. **Managers can view** who completed what in history

---

## 📈 Manager/Owner Features

### View Completion History
Access historic data to see:
- Which employees completed which tasks
- Time stamps for accountability
- Patterns of incomplete tasks
- Sunday maintenance tracking

### Export Data
All checklist completions included in daily backups:
- CSV format for Excel analysis
- JSON format for custom reporting
- SQL format for database queries

### Modify Checklist
Owners/managers can:
- Add new tasks: `POST /api/checklist/templates`
- Edit tasks: `PATCH /api/checklist/templates/{id}`
- Disable tasks: Set `is_active: false`

---

## 🔐 Security

- **Authentication required**: All endpoints need valid JWT token
- **Role-based access**: Only owners/managers can view history
- **Audit trail**: Every completion permanently recorded
- **Cannot game system**: 
  - Can't complete same task twice for same date
  - Can't uncheck (only managers can delete records)
  - Timestamps prove when work was done

---

## 💾 Automatic Backups

At 8:00 AM daily (same time as checklist reset):

1. **Script runs**: `scripts/daily_backup.sh`
2. **Exports created**:
   - `backup_YYYYMMDD_HHMMSS.zip` (all CSVs)
   - `backup_YYYYMMDD_HHMMSS.json` (complete database)
   - `backup_YYYYMMDD_HHMMSS.sql` (SQL statements)
3. **Stored in**: `backups/` directory
4. **Retention**: Keeps last 30 days, auto-deletes older
5. **Includes**: ALL checklist completion history

### Setup Automated Backups

See `docs/BACKUP_SETUP.md` for complete instructions:

**Quick setup:**
```bash
# 1. Get your JWT token (login as owner, check localStorage)
echo 'your_jwt_token' > .backup_token
chmod 600 .backup_token

# 2. Test backup
./scripts/daily_backup.sh

# 3. Schedule with cron
crontab -e
# Add: 0 8 * * * /home/baxterkrug/Documents/Card\ Catalog\ POS/scripts/daily_backup.sh
```

---

## 📊 Reporting Examples

### Employee Performance Report
Query checklist completions by user:
```sql
SELECT 
  user.name,
  COUNT(*) as tasks_completed,
  DATE(completion_date) as date
FROM checklistcompletion
JOIN user ON checklistcompletion.user_id = user.id
WHERE completion_date >= '2026-03-01'
GROUP BY user_id, DATE(completion_date)
ORDER BY date DESC, user.name;
```

### Task Compliance Report
See which tasks are frequently skipped:
```sql
SELECT 
  template.task_name,
  COUNT(completion.id) as times_completed,
  DATE_PART('day', NOW() - MIN(template.created_at)) as days_active
FROM checklisttemplate template
LEFT JOIN checklistcompletion completion ON template.id = completion.template_id
WHERE template.is_active = true
GROUP BY template.id, template.task_name
ORDER BY times_completed ASC;
```

### Export via API
Get last 30 days as CSV:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/backup/export/csv/checklist_completions" \
  -o checklist_report.csv
```

---

## 🛠️ Maintenance

### Add New Task
```bash
curl -X POST http://localhost:8000/api/checklist/templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "opening",
    "task_name": "Check cash register",
    "display_order": 9,
    "is_active": true
  }'
```

### Disable Task (Don't Delete)
```bash
curl -X PATCH http://localhost:8000/api/checklist/templates/5 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

### Database Cleanup (If Needed)
Old completions never need deletion (they're historical data), but if needed:
```sql
-- Delete completions older than 1 year
DELETE FROM checklistcompletion 
WHERE completion_date < NOW() - INTERVAL '1 year';
```

---

## 🚀 Future Enhancements (Not Implemented)

Possible additions:
- Mobile app for checklist (React Native)
- Push notifications for incomplete tasks
- Photo attachments for maintenance tasks
- Recurring maintenance schedules (auto-create weekly/monthly tasks)
- Employee shift tracking integration
- Real-time dashboard showing who's working on what
- Google Drive sync for automatic cloud backup

---

## 📞 Quick Reference

| Task | Command/URL |
|------|-------------|
| View checklist | Dashboard → "Shift checklist" section |
| Check off task | Click checkbox (saves automatically) |
| View history | Owner/Manager → `/api/checklist/history` |
| Manual backup | `./scripts/daily_backup.sh` |
| Check backup log | `cat backups/backup.log` |
| Test API | http://localhost:8000/docs#/checklist |

---

## ✅ Verification Checklist

After setup, verify:
- [ ] Migration ran successfully (15 templates created)
- [ ] Dashboard shows checklist sections
- [ ] Can check off items (saves to database)
- [ ] Completed items show ✓ and user name
- [ ] Daily backup script runs successfully
- [ ] Backup files created in `backups/` directory
- [ ] JWT token stored securely
- [ ] Cron job scheduled for 8 AM
- [ ] Checklist resets at 8 AM (test by changing system time)

---

For detailed setup instructions, see:
- **Backup Setup**: `docs/BACKUP_SETUP.md`
- **Data Access**: `docs/DATA_ACCESS.md`
- **Architecture**: `docs/architecture.md`
