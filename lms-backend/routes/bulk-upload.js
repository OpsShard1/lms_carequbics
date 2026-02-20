const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const pool = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Simple storage configuration - we'll handle folder organization in the route handler
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join('uploads', 'temp');
    
    // Create directories if they don't exist
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads');
    }
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `temp_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv'];
    
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.csv$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV files are allowed.'));
    }
  }
});

// Validate student data
const validateStudentData = (data, row) => {
  const errors = [];
  
  if (!data.first_name || String(data.first_name).trim() === '') {
    errors.push('First name is required');
  }
  
  if (!data.last_name || String(data.last_name).trim() === '') {
    errors.push('Last name is required');
  }
  
  // Normalize date format
  const normalizedDate = normalizeDate(data.date_of_birth);
  if (!normalizedDate) {
    errors.push('Date of birth is required and must be in DD-MM-YYYY or YYYY-MM-DD format');
  } else {
    const dob = new Date(normalizedDate);
    if (isNaN(dob.getTime())) {
      errors.push('Invalid date of birth');
    }
  }
  
  if (!data.gender || !['Male', 'Female', 'Other', 'male', 'female', 'other'].includes(String(data.gender).trim())) {
    errors.push('Gender must be Male, Female, or Other');
  }
  
  if (!data.parent_name || String(data.parent_name).trim() === '') {
    errors.push('Parent name is required');
  }
  
  if (!data.parent_contact || String(data.parent_contact).trim() === '') {
    errors.push('Parent contact is required');
  } else {
    const normalizedPhone = normalizePhoneNumber(data.parent_contact);
    const digitsOnly = normalizedPhone.replace(/\D/g, '');
    
    // Accept 10 digits (without country code) or 12 digits (with country code like 91)
    if (digitsOnly.length !== 10 && digitsOnly.length !== 12) {
      errors.push('Parent contact must be a valid 10-digit phone number');
    }
  }
  
  return errors;
};

// Parse CSV file
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv({
        mapHeaders: ({ header }) => header.toLowerCase().replace(/-/g, '_').trim()
      }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

// Normalize date format to YYYY-MM-DD (CSV only - no Excel serial numbers)
const normalizeDate = (dateStr) => {
  if (!dateStr) return null;
  
  const str = String(dateStr).trim();
  
  // Try parsing DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try parsing YYYY-MM-DD or YYYY/MM/DD (already correct format)
  const yyyymmddMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
};

// Normalize phone number - handle country codes
const normalizePhoneNumber = (phone) => {
  if (!phone) return '';
  
  const str = String(phone).trim();
  
  // Remove all non-digit characters except +
  let cleaned = str.replace(/[^\d+]/g, '');
  
  // If it starts with +91, keep it as is
  if (cleaned.startsWith('+91')) {
    return cleaned;
  }
  
  // If it starts with 91 (without +), add the +
  if (cleaned.startsWith('91') && cleaned.length > 10) {
    return '+' + cleaned;
  }
  
  // If it's a 10-digit number, add +91
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return '+91' + digitsOnly;
  }
  
  // If it has other country code format, keep as is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Default: add +91 to whatever digits we have
  return '+91' + digitsOnly;
};

// Bulk upload students - validation only (preview)
router.post('/students/bulk-upload/validate', authenticate, authorize('developer', 'school_teacher', 'trainer_head', 'owner'), upload.single('file'), async (req, res) => {
  const { classId, schoolId } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  if (!classId || !schoolId) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Class ID and School ID are required' });
  }
  
  let finalFilePath = req.file.path;
  
  try {
    // Get school and class info for organized storage
    const [schools] = await pool.query('SELECT name FROM schools WHERE id = ?', [schoolId]);
    if (schools.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'School not found' });
    }
    
    const [classes] = await pool.query('SELECT name, grade, section FROM classes WHERE id = ?', [classId]);
    if (classes.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Prepare organized folder structure
    const schoolName = schools[0].name.replace(/[^a-z0-9]/gi, '_');
    const className = classes[0].name.replace(/[^a-z0-9]/gi, '_');
    const grade = classes[0].grade;
    const section = classes[0].section ? `_${classes[0].section}` : '';
    
    const targetDir = path.join('uploads', 'school_student_data', schoolName);
    
    // Create directories
    if (!fs.existsSync(path.join('uploads', 'school_student_data'))) {
      fs.mkdirSync(path.join('uploads', 'school_student_data'));
    }
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Determine file number
    const baseFileName = `Grade_${grade}${section}_${className}`;
    const existingFiles = fs.readdirSync(targetDir).filter(f => f.startsWith(baseFileName));
    
    let fileNumber = 1;
    if (existingFiles.length > 0) {
      const numbers = existingFiles.map(f => {
        const match = f.match(/_(\d+)\./);
        return match ? parseInt(match[1]) : 0;
      });
      fileNumber = Math.max(...numbers) + 1;
    }
    
    // Create final filename
    const ext = path.extname(req.file.originalname);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const finalFileName = `${baseFileName}_${fileNumber}_${timestamp}${ext}`;
    finalFilePath = path.join(targetDir, finalFileName);
    
    // Move file from temp to organized location
    fs.renameSync(req.file.path, finalFilePath);
    
    // Parse file - CSV only
    let students;
    if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
      students = await parseCSV(finalFilePath);
    } else {
      fs.unlinkSync(finalFilePath);
      return res.status(400).json({ error: 'Only CSV files are supported' });
    }
    
    const validatedStudents = [];
    
    // Validate each student
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const row = i + 2;
      
      const validationErrors = validateStudentData(student, row);
      const normalizedDate = normalizeDate(student.date_of_birth);
      const normalizedGender = student.gender ? String(student.gender).trim() : '';
      const capitalizedGender = normalizedGender ? normalizedGender.charAt(0).toUpperCase() + normalizedGender.slice(1).toLowerCase() : '';
      const normalizedPhone = normalizePhoneNumber(student.parent_contact);
      
      validatedStudents.push({
        row,
        original: student,
        normalized: {
          first_name: student.first_name ? String(student.first_name).trim() : '',
          last_name: student.last_name ? String(student.last_name).trim() : '',
          date_of_birth: normalizedDate || '',
          gender: capitalizedGender,
          parent_name: student.parent_name ? String(student.parent_name).trim() : '',
          parent_contact: normalizedPhone
        },
        errors: validationErrors,
        isValid: validationErrors.length === 0
      });
    }
    
    res.json({
      filePath: finalFilePath,
      fileName: finalFileName,
      students: validatedStudents,
      validCount: validatedStudents.filter(s => s.isValid).length,
      invalidCount: validatedStudents.filter(s => !s.isValid).length
    });
  } catch (error) {
    console.error('Bulk upload validation error:', error);
    
    if (fs.existsSync(finalFilePath)) {
      fs.unlinkSync(finalFilePath);
    }
    
    res.status(500).json({ error: 'Failed to process file: ' + error.message });
  }
});

// Bulk upload students - confirm and save
router.post('/students/bulk-upload/confirm', authenticate, authorize('developer', 'school_teacher', 'trainer_head', 'owner'), async (req, res) => {
  const { classId, schoolId, students } = req.body;
  
  if (!classId || !schoolId || !students || !Array.isArray(students)) {
    return res.status(400).json({ error: 'Invalid request data' });
  }
  
  const results = {
    success: [],
    errors: []
  };
  
  try {
    // Process each student
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      
      try {
        // Check if student already exists (by name and DOB)
        const [existing] = await pool.query(
          'SELECT id FROM students WHERE first_name = ? AND last_name = ? AND date_of_birth = ? AND school_id = ?',
          [student.first_name, student.last_name, student.date_of_birth, schoolId]
        );
        
        if (existing.length > 0) {
          // Update existing student's class
          await pool.query(
            'UPDATE students SET class_id = ?, parent_name = ?, parent_contact = ?, gender = ? WHERE id = ?',
            [classId, student.parent_name, student.parent_contact, student.gender, existing[0].id]
          );
          
          results.success.push({
            action: 'updated',
            name: `${student.first_name} ${student.last_name}`
          });
        } else {
          // Insert new student
          await pool.query(
            `INSERT INTO students (
              first_name, last_name, date_of_birth, gender, 
              parent_name, parent_contact, school_id, class_id, 
              student_type, is_active, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'school', true, NOW())`,
            [
              student.first_name,
              student.last_name,
              student.date_of_birth,
              student.gender,
              student.parent_name,
              student.parent_contact,
              schoolId,
              classId
            ]
          );
          
          results.success.push({
            action: 'created',
            name: `${student.first_name} ${student.last_name}`
          });
        }
      } catch (dbError) {
        console.error('Database error for student:', student, dbError);
        results.errors.push({
          message: 'Database error: ' + dbError.message,
          student: student
        });
      }
    }
    
    res.json(results);
  } catch (error) {
    console.error('Bulk upload confirm error:', error);
    res.status(500).json({ error: 'Failed to save students: ' + error.message });
  }
});

module.exports = router;
