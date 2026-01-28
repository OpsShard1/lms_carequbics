require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('./connection');

async function seedTimetables() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🌱 Starting timetable seeding...');
    
    await connection.beginTransaction();

    // Get first school ID
    const [schools] = await connection.query('SELECT id FROM schools WHERE is_active = true LIMIT 1');
    if (schools.length === 0) {
      console.log('⚠️  No schools found. Please create a school first.');
      await connection.rollback();
      return;
    }
    const schoolId = schools[0].id;
    console.log(`📚 Using school ID: ${schoolId}`);

    // Check if timetable already exists for this school
    const [existing] = await connection.query(
      'SELECT id FROM school_timetables WHERE school_id = ? AND is_active = true',
      [schoolId]
    );

    if (existing.length > 0) {
      console.log('⚠️  Timetable already exists for this school. Skipping...');
      await connection.rollback();
      return;
    }

    // Create school timetable
    const [timetableResult] = await connection.query(
      'INSERT INTO school_timetables (school_id, name) VALUES (?, ?)',
      [schoolId, 'Main School Timetable']
    );
    const timetableId = timetableResult.insertId;
    console.log(`✅ Created timetable with ID: ${timetableId}`);

    // Create 6 periods with timings
    const periods = [
      { period_number: 1, start_time: '09:00:00', end_time: '09:45:00' },
      { period_number: 2, start_time: '09:45:00', end_time: '10:30:00' },
      { period_number: 3, start_time: '10:45:00', end_time: '11:30:00' },
      { period_number: 4, start_time: '11:30:00', end_time: '12:15:00' },
      { period_number: 5, start_time: '13:00:00', end_time: '13:45:00' },
      { period_number: 6, start_time: '13:45:00', end_time: '14:30:00' }
    ];

    for (const period of periods) {
      await connection.query(
        'INSERT INTO timetable_periods (timetable_id, period_number, start_time, end_time) VALUES (?, ?, ?, ?)',
        [timetableId, period.period_number, period.start_time, period.end_time]
      );
    }
    console.log(`✅ Created ${periods.length} periods`);

    // Create days (Monday to Friday)
    const days = [1, 2, 3, 4, 5]; // 1=Monday, 5=Friday
    for (const day of days) {
      await connection.query(
        'INSERT INTO timetable_days (timetable_id, day_of_week) VALUES (?, ?)',
        [timetableId, day]
      );
    }
    console.log(`✅ Created ${days.length} school days (Monday-Friday)`);

    // Get classes for this school
    const [classes] = await connection.query(
      'SELECT id FROM classes WHERE school_id = ? AND is_active = true LIMIT 3',
      [schoolId]
    );

    if (classes.length > 0) {
      console.log(`📝 Found ${classes.length} classes to schedule`);
      
      // Schedule some sample classes
      const schedules = [
        { class_id: classes[0].id, day_of_week: 1, period_number: 1 }, // Monday, Period 1
        { class_id: classes[0].id, day_of_week: 1, period_number: 2 }, // Monday, Period 2
        { class_id: classes[0].id, day_of_week: 3, period_number: 1 }, // Wednesday, Period 1
      ];

      if (classes.length > 1) {
        schedules.push(
          { class_id: classes[1].id, day_of_week: 2, period_number: 1 }, // Tuesday, Period 1
          { class_id: classes[1].id, day_of_week: 4, period_number: 2 }  // Thursday, Period 2
        );
      }

      if (classes.length > 2) {
        schedules.push(
          { class_id: classes[2].id, day_of_week: 1, period_number: 3 }, // Monday, Period 3
          { class_id: classes[2].id, day_of_week: 5, period_number: 1 }  // Friday, Period 1
        );
      }

      for (const schedule of schedules) {
        await connection.query(
          'INSERT INTO timetable_class_schedule (timetable_id, class_id, day_of_week, period_number) VALUES (?, ?, ?, ?)',
          [timetableId, schedule.class_id, schedule.day_of_week, schedule.period_number]
        );
      }
      console.log(`✅ Created ${schedules.length} class schedules`);
    } else {
      console.log('⚠️  No classes found. Timetable created but no classes scheduled.');
    }

    await connection.commit();
    console.log('✅ Timetable seeding completed successfully!');

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error seeding timetables:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run seeding
seedTimetables()
  .then(() => {
    console.log('🎉 Seeding finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
