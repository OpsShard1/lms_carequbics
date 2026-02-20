# Bulk Upload Setup Instructions

## Required NPM Packages

Install the following packages for CSV/Excel file parsing:

```bash
cd lms-backend
npm install multer csv-parser xlsx
```

## Package Details:
- **multer**: Handles file uploads
- **csv-parser**: Parses CSV files
- **xlsx**: Parses Excel files (.xlsx, .xls)

## Create Uploads Directory

```bash
mkdir uploads
```

## Restart Backend Server

After installing packages:
```bash
pm2 restart lms-backend
# or
npm run dev
```

## CSV Template Format

The CSV file should have these columns (in this exact order):
```
first_name,last_name,date_of_birth,gender,parent_name,parent_contact
```

### Example:
```csv
first_name,last_name,date_of_birth,gender,parent_name,parent_contact
John,Doe,2010-05-15,Male,Jane Doe,1234567890
Mary,Smith,2011-03-20,Female,Robert Smith,0987654321
```

## Validation Rules:
- **first_name**: Required, cannot be empty
- **last_name**: Required, cannot be empty
- **date_of_birth**: Required, format: YYYY-MM-DD
- **gender**: Required, must be "Male", "Female", or "Other"
- **parent_name**: Required, cannot be empty
- **parent_contact**: Required, must be 10 digits

## Features:
- Supports CSV and Excel (.xlsx, .xls) files
- Validates all data before inserting
- Shows which students failed validation and why
- Updates existing students if found (by name + DOB)
- Creates new students if not found
- Maximum file size: 5MB
