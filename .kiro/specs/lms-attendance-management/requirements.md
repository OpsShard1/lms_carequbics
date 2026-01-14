# LMS Application - Complete Requirements Specification

## Overview
Build a Learning Management System (LMS) using Vite + React frontend with MySQL database backend, deployable on Hostinger. The app manages two distinct sections: **Schools** and **Centers**, each with different functionality and data management.

---

## Core Architecture

### Two-Section System
The application is divided into two independent sections:

1. **School Section** - Manages student attendance only (timetable-based)
2. **Center Section** - Manages attendance (manual) + student progress tracking (chapter-wise)

### Multi-Tenant Support
- Multiple schools and centers can exist in the system
- Users can be assigned to specific school(s) or center(s)
- If user has access to multiple entities, show a selector dropdown
- If user has access to only one entity, auto-select it (no dropdown needed)
- Section switcher available for users with access to both school and center sections

---

## Section-Specific Features

### School Section Features
1. **Attendance Management** (Timetable-based)
   - Attendance is marked based on pre-created timetable
   - Trainer marks attendance for scheduled periods
   - Calendar-like interface showing each day's scheduled students
   - Students appear based on their class timetable entries

2. **Timetable Creator**
   - Step 1: Enter number of periods per day
   - Step 2: Select days of week when classes occur
   - Step 3: For each selected day, assign:
     - Period numbers for classes
     - Room number
     - Which class comes at which time
   - Visual timetable grid output

3. **Class Management**
   - Create/manage classes (grade, section, room)
   - Assign students to classes
   - Assign teacher to class

### Center Section Features
1. **Attendance Management** (Manual/Flexible)
   - NO automatic attendance from timetable
   - Mark attendance on any custom date/time
   - Calendar interface to select date
   - List of center students to mark present/absent
   - Each attendance entry is independent (not tied to timetable)

2. **Student Progress Tracking**
   - Track chapter-wise progress for each student
   - Fields: chapter name, completion status, evaluation score, remarks
   - Trainer updates progress as student completes chapters

3. **Parent Progress View (Public Page)**
   - Simple lookup page (no login required)
   - Parent enters: Child's name + Date of birth
   - Shows: Attendance summary + Chapter progress + Remarks
   - Read-only view

---

## Student Registration

### School Students (Simple)
- First name, Last name
- Date of birth, Gender
- Class assignment
- Parent contact info

### Center Students (Detailed Form)
**Personal Information:**
- Student name (first, last)
- Age
- Date of birth
- Gender

**School Information:**
- Current class/grade
- School name (external - where they study)
- Center selection (which center to enroll in)

**Parent Information:**
- Parent name
- Contact number
- Alternate contact number
- Parent qualification
- Parent occupation
- Email
- Address

**Program Questions:**
- How did you hear about us? (text/dropdown)
- Which program to join?
  - Long-term course
  - Short-term course
  - Holiday program
  - Birthday events
- Has your child attended before? (Yes/No)
- Preferred class format:
  - Weekday
  - Weekend

---

## User Roles & Permissions

### 1. Developer (System Administrator)
**Access:** Full system access
**Can:**
- Manage all users and roles
- Access system settings
- Handle maintenance and security
- View and modify all data
- Access both school and center sections

### 2. Owner (Organization Owner)
**Access:** Full operational access
**Can:**
- Manage schools and centers
- Manage all users
- View all reports and dashboards
- Assign tasks to trainers and staff
- Overall control of the system
- Access both school and center sections

### 3. Trainer Head (Academic Manager)
**Access:** Center section primarily
**Can:**
- Manage trainers
- Assign tasks to trainers
- Review student attendance
- Review student performance
- Add internal remarks on students
- View reports

### 4. Principal (School Administrator)
**Access:** School section only (read-heavy)
**Can:**
- View student attendance
- View reports
- Monitor academic performance
- Add remarks
**Cannot:**
- Edit or delete data
- Create classes or timetables

### 5. School Teacher
**Access:** School section only
**Can:**
- Create and manage classes
- Add students to classes
- Create and manage class timetables
- View class attendance

### 6. Trainer
**Access:** Center section primarily
**Can:**
- Mark student attendance (center)
- Mark attendance for assigned school timetable slots
- Upload learning content
- Assign content to students
- Track and update student progress
- Log daily academic activities
- Complete assigned tasks

### 7. Parent
**Access:** Read-only, limited
**Can:**
- View child's attendance
- View child's progress summary
- Access assigned learning content
**Cannot:**
- Modify any data

---

## Attendance Interfaces

### School Attendance Interface
```
┌─────────────────────────────────────────────────────┐
│  School Attendance - [School Name]                  │
├─────────────────────────────────────────────────────┤
│  Date: [Calendar Picker]     Class: [Dropdown]      │
├─────────────────────────────────────────────────────┤
│  Today's Schedule (from Timetable):                 │
│  ┌─────────────────────────────────────────────┐    │
│  │ Period 1 (9:00-9:45) - Room 101             │    │
│  │ ☑ Student 1    ☑ Student 2    ☐ Student 3  │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │ Period 3 (11:00-11:45) - Room 102           │    │
│  │ ☑ Student 4    ☐ Student 5    ☑ Student 6  │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  [Save Attendance]                                  │
└─────────────────────────────────────────────────────┘
```

### Center Attendance Interface
```
┌─────────────────────────────────────────────────────┐
│  Center Attendance - [Center Name]                  │
├─────────────────────────────────────────────────────┤
│  Date: [Calendar Picker]    Time: [Time Picker]     │
├─────────────────────────────────────────────────────┤
│  All Center Students:                               │
│  ┌─────────────────────────────────────────────┐    │
│  │ ☑ Student A (Class 5, ABC School)           │    │
│  │ ☐ Student B (Class 7, XYZ School)           │    │
│  │ ☑ Student C (Class 4, PQR School)           │    │
│  │ ☑ Student D (Class 6, ABC School)           │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  [Mark Attendance]                                  │
└─────────────────────────────────────────────────────┘
```

---

## Timetable Creator Flow

### Step 1: Basic Setup
- Select school
- Select class
- Enter number of periods per day (e.g., 8)
- Enter period timings (start/end time for each period)

### Step 2: Select Active Days
- Checkboxes for: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
- Only selected days will have timetable entries

### Step 3: Assign Periods
For each selected day, create a grid:
```
┌──────────┬──────────┬──────────┬─────────┐
│ Period   │ Subject  │ Teacher  │ Room    │
├──────────┼──────────┼──────────┼─────────┤
│ 1        │ [Select] │ [Select] │ [Input] │
│ 2        │ [Select] │ [Select] │ [Input] │
│ 3        │ [Select] │ [Select] │ [Input] │
│ ...      │          │          │         │
└──────────┴──────────┴──────────┴─────────┘
```

### Output: Visual Timetable
Display a weekly grid showing all assigned periods with subjects, teachers, and rooms.

---

## Parent Progress Lookup (Public)

### Lookup Form
```
┌─────────────────────────────────────────────────────┐
│  Check Your Child's Progress                        │
├─────────────────────────────────────────────────────┤
│  Child's Name: [________________]                   │
│  Date of Birth: [Calendar Picker]                   │
│                                                     │
│  [View Progress]                                    │
└─────────────────────────────────────────────────────┘
```

### Progress Display
```
┌─────────────────────────────────────────────────────┐
│  Progress Report - [Student Name]                   │
├─────────────────────────────────────────────────────┤
│  Attendance Summary:                                │
│  - Total Classes: 45                                │
│  - Present: 42 (93%)                                │
│  - Absent: 3                                        │
├─────────────────────────────────────────────────────┤
│  Chapter Progress:                                  │
│  ┌─────────────────────────────────────────────┐    │
│  │ Ch 1: Introduction      ✓ Completed (95%)   │    │
│  │ Ch 2: Basics            ✓ Completed (88%)   │    │
│  │ Ch 3: Advanced          ◐ In Progress       │    │
│  │ Ch 4: Expert            ○ Not Started       │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  Trainer Remarks:                                   │
│  "Student is progressing well. Needs more          │
│   practice on chapter 3 concepts."                  │
└─────────────────────────────────────────────────────┘
```

---

## Database Tables Summary

1. **roles** - User role definitions
2. **schools** - School entities
3. **centers** - Center entities
4. **users** - All system users with role assignment
5. **user_assignments** - Links users to schools/centers
6. **classes** - School classes (grade, section, teacher)
7. **students** - Unified table for school and center students
8. **timetables** - Timetable metadata (school, class, periods/day)
9. **timetable_entries** - Individual period slots (day, time, subject, room)
10. **attendance** - Unified attendance (school=timetable-based, center=manual)
11. **student_progress** - Chapter-wise progress for center students

---

## Key Business Rules

1. **School attendance** MUST be linked to timetable entries
2. **Center attendance** is NEVER automatic - always manual entry
3. **Parent progress view** requires exact name + DOB match (case-insensitive)
4. **Users** can belong to multiple schools/centers via assignments
5. **Section access** determined by user's `section_type` field (school/center/both)
6. **Timetable** must be created before school attendance can be marked
7. **Progress tracking** is center-only feature
8. **Principal** has view-only access - cannot modify data

---

## Tech Stack

- **Frontend:** Vite + React + React Router
- **Backend:** Express.js + Node.js
- **Database:** MySQL (Hostinger compatible)
- **Auth:** JWT tokens + bcrypt password hashing
- **HTTP Client:** Axios
