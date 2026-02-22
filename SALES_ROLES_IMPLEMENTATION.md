# Sales Roles Implementation

## Overview
This document describes the implementation of two new user roles in the LMS application: `sales_head` and `sales`.

## New Roles

### 1. Sales Head (`sales_head`)
- **Access Level**: View-only access to ALL schools in the system
- **Permissions**:
  - Can view all school data (dashboard, classes, students, attendance, etc.)
  - Can view and manage sales users
  - Can assign sales users to schools
  - Cannot edit any school data
  - No access to centers

### 2. Sales (`sales`)
- **Access Level**: View-only access to ASSIGNED schools only
- **Permissions**:
  - Can view data only for schools assigned to them
  - Can view school dashboard, classes, students, attendance, etc.
  - Cannot edit any school data
  - Cannot manage users
  - No access to centers

## Implementation Details

### Backend Changes

#### 1. Database Migration
- **File**: `lms-backend/migrations/add_sales_roles.sql`
- Adds two new roles to the `roles` table: `sales_head` and `sales`
- Run this SQL script in your database to add the roles

#### 2. User Management (`lms-backend/routes/users.js`)
- Updated role hierarchy permissions to include sales roles
- `sales_head` can create and manage `sales` users
- Higher roles (super_admin, developer, admin, owner) can create both sales roles
- Added `sales_head` to authorized roles for user management endpoints

#### 3. School Assignments (`lms-backend/routes/school-assignments.js`)
- Added endpoint to get available sales users: `GET /school-assignments/available-sales`
- Updated school assignments query to include sales users
- Added `sales_head` to authorized roles for assignment management
- Sales users are assigned to schools via the `user_assignments` table (same as teachers/principals)

#### 4. Schools Route (`lms-backend/routes/schools.js`)
- Updated `GET /schools` endpoint to filter schools for sales users
- Sales users only see schools assigned to them
- Sales head sees all schools

#### 5. Authorization Middleware (`lms-backend/middleware/auth.js`)
- No changes needed - existing middleware handles new roles automatically

### Frontend Changes

#### 1. Schools Management Page (`lms-frontend/src/pages/admin/Schools.jsx`)
- Added sales user assignment functionality
- New state for sales users: `salesUsers`, `showAssignSalesModal`
- Added functions: `openAssignSalesModal()`, `confirmAssignSales()`, `getUnassignedSales()`
- New UI section in assignment modal to display and manage assigned sales users
- Sales users can be assigned/unassigned just like teachers and principals

#### 2. Authentication Context (`lms-frontend/src/context/AuthContext.jsx`)
- Added handling for `sales_head` role:
  - Loads all schools (read-only)
  - No center access
  - Auto-selects first school
- Added handling for `sales` role:
  - Loads only assigned schools via `/teacher-assignments/my-schools`
  - No center access
  - Auto-selects first assigned school

#### 3. Layout Component (`lms-frontend/src/components/Layout.jsx`)
- Added `sales_head` and `sales` to school menu item roles
- Added `sales_head` to admin menu items (Users, Schools)
- Added `sales_head` and `sales` to Help menu
- Updated `needsAssignment()` to include sales roles
- Sales users need at least one school assignment to access the system

#### 4. Users Management Page (`lms-frontend/src/pages/admin/Users.jsx`)
- Updated `getRoleCategories()` to include sales roles
- `sales_head` can see and manage sales users
- Higher roles can see and manage both sales roles

## Usage Instructions

### 1. Database Setup
Run the migration script to add the new roles:
```sql
-- Run this in your MySQL database
source lms-backend/migrations/add_sales_roles.sql
```

Or manually execute:
```sql
INSERT INTO roles (name) VALUES ('sales_head'), ('sales')
ON DUPLICATE KEY UPDATE name = name;
```

### 2. Creating Sales Users

#### As Super Admin, Developer, Admin, or Owner:
1. Navigate to Admin > Users
2. Click "Add User"
3. Select role: "sales_head" or "sales"
4. Fill in user details
5. Create the user

#### As Sales Head:
1. Navigate to Admin > Users
2. Click "Add User"
3. Select role: "sales" (only option available)
4. Fill in user details
5. Create the user

### 3. Assigning Sales Users to Schools

#### As Super Admin, Developer, Owner, Trainer Head, or Sales Head:
1. Navigate to Admin > Schools
2. Click on a school row to open the assignment modal
3. Scroll to the "Assigned Sales" section
4. Click "Assign Sales" button
5. Select a sales user from the dropdown
6. Click "Assign to [School Name]"

### 4. Removing Sales Assignments
1. Navigate to Admin > Schools
2. Click on a school row
3. In the "Assigned Sales" section, click "Remove" next to the sales user
4. Confirm the removal

## Access Control Summary

| Feature | Sales Head | Sales |
|---------|-----------|-------|
| View all schools | ✅ | ❌ |
| View assigned schools | ✅ | ✅ |
| Edit school data | ❌ | ❌ |
| View school dashboard | ✅ | ✅ |
| View classes | ✅ | ✅ |
| View students | ✅ | ✅ |
| View attendance | ✅ | ✅ |
| View curriculum | ✅ | ❌ |
| Manage users | ✅ (sales only) | ❌ |
| Assign sales to schools | ✅ | ❌ |
| Access centers | ❌ | ❌ |

## Technical Notes

### Role Hierarchy
```
super_admin
├── admin
├── developer
├── owner
│   ├── trainer_head
│   │   ├── school_teacher
│   │   ├── trainer
│   │   ├── principal
│   │   └── registrar
│   └── sales_head
│       └── sales
```

### Database Schema
- No new tables required
- Uses existing `user_assignments` table for school assignments
- `user_assignments.school_id` links sales users to schools
- `user_assignments.user_id` references the sales user

### API Endpoints Used
- `GET /schools` - Returns all schools for sales_head, assigned schools for sales
- `GET /school-assignments` - Returns school assignments including sales
- `GET /school-assignments/available-sales` - Returns unassigned sales users
- `POST /school-assignments` - Assigns sales user to school
- `DELETE /school-assignments/:id` - Removes sales assignment
- `GET /users` - Sales head can view sales users
- `POST /users` - Sales head can create sales users

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Sales_head user can be created
- [ ] Sales user can be created
- [ ] Sales_head can create sales users
- [ ] Sales_head can view all schools
- [ ] Sales user can only view assigned schools
- [ ] Sales users can be assigned to schools
- [ ] Sales assignments can be removed
- [ ] Sales users cannot edit any data
- [ ] Sales users cannot access centers
- [ ] Sales_head appears in Users page
- [ ] Sales users appear in Schools assignment modal
- [ ] Navigation works correctly for both roles
- [ ] Unassigned sales users see "no assignments" screen

## Future Enhancements

Potential improvements for sales roles:
1. Sales activity tracking and reporting
2. Lead management features
3. Sales-specific dashboard with metrics
4. School visit scheduling
5. Sales performance analytics
6. Custom permissions for specific sales operations
7. Sales territory management
8. Integration with CRM systems
