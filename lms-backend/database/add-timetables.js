import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function addTimetables() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('Connected to database');

  // Get classes
  const [classes] = await conn.query('SELECT id, school_id, name FROM classes ORDER BY id LIMIT 5');
  console.log('Classes:', classes.map(c => `${c.id}: ${c.name}`));
  
  if (classes.length < 3) {
    console.log('Not enough classes');
    await conn.end();
    return;
  }

  const schoolId = classes[0].school_id;

  // Check existing timetables
  const [existing] = await conn.query('SELECT class_id FROM timetables WHERE is_active = true');
  const existingClassIds = existing.map(t => t.class_id);
  console.log('Existing timetable class IDs:', existingClassIds);

  // Add timetable for Class 1-B if not exists
  if (!existingClassIds.includes(classes[1].id)) {
    const [tt2] = await conn.query(
      'INSERT INTO timetables (school_id, class_id, name, periods_per_day) VALUES (?, ?, ?, 6)', 
      [schoolId, classes[1].id, 'Class 1-B Timetable']
    );
    await conn.query(`
      INSERT INTO timetable_entries (timetable_id, day_of_week, period_number, start_time, end_time, subject, room_number) VALUES
      (?, 'monday', 1, '09:00', '09:45', 'Electronics', 'Lab 2'),
      (?, 'monday', 3, '11:00', '11:45', 'Robotics', 'Lab 2'),
      (?, 'tuesday', 1, '09:00', '09:45', 'Coding', 'Lab 2'),
      (?, 'wednesday', 1, '09:00', '09:45', 'Drone', 'Lab 2'),
      (?, 'friday', 1, '09:00', '09:45', 'Electronics', 'Lab 2')
    `, [tt2.insertId, tt2.insertId, tt2.insertId, tt2.insertId, tt2.insertId]);
    console.log('✅ Added Class 1-B timetable');
  } else {
    console.log('Class 1-B timetable already exists');
  }

  // Add timetable for Class 2-A if not exists
  if (!existingClassIds.includes(classes[2].id)) {
    const [tt3] = await conn.query(
      'INSERT INTO timetables (school_id, class_id, name, periods_per_day) VALUES (?, ?, ?, 6)', 
      [schoolId, classes[2].id, 'Class 2-A Timetable']
    );
    await conn.query(`
      INSERT INTO timetable_entries (timetable_id, day_of_week, period_number, start_time, end_time, subject, room_number) VALUES
      (?, 'monday', 1, '09:00', '09:45', 'Coding', 'Lab 3'),
      (?, 'monday', 2, '10:00', '10:45', 'Robotics', 'Lab 3'),
      (?, 'wednesday', 1, '09:00', '09:45', 'AI Basics', 'Lab 3'),
      (?, 'friday', 1, '09:00', '09:45', 'Project Work', 'Lab 3')
    `, [tt3.insertId, tt3.insertId, tt3.insertId, tt3.insertId]);
    console.log('✅ Added Class 2-A timetable');
  } else {
    console.log('Class 2-A timetable already exists');
  }

  console.log('\n🎉 Done! Overlapping periods:');
  console.log('   - Monday Period 1: Multiple classes');
  console.log('   - Wednesday Period 1: Multiple classes');
  console.log('   - Friday Period 1: Multiple classes');
  
  await conn.end();
}

addTimetables().catch(console.error);
