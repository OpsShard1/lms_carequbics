-- Insert Primary Curriculum with all topics

-- Step 1: Insert the main curriculum
INSERT INTO school_curriculums (name, grade_name, description, is_active) 
VALUES ('Primary Curriculum', 'Primary', 'Complete primary level curriculum covering Robotics, Drones, Electronics, 3D Design, 3D Printing, IoT, Scratch Coding, Artificial Intelligence, and Game Designing', true);

-- Get the curriculum ID (use LAST_INSERT_ID() in the same session)
SET @curriculum_id = LAST_INSERT_ID();

-- Step 2: Insert subjects/categories
INSERT INTO school_curriculum_subjects (curriculum_id, name, sort_order) VALUES
(@curriculum_id, 'Robotics', 1),
(@curriculum_id, 'Drone', 2),
(@curriculum_id, 'Electronics', 3),
(@curriculum_id, '3D Design', 4),
(@curriculum_id, '3D Printing', 5),
(@curriculum_id, 'IoT', 6),
(@curriculum_id, 'Scratch Coding', 7),
(@curriculum_id, 'Artificial Intelligence', 8),
(@curriculum_id, 'Game Designing', 9),
(@curriculum_id, 'Event Day', 10);

-- Get subject IDs
SET @robotics_id = (SELECT id FROM school_curriculum_subjects WHERE curriculum_id = @curriculum_id AND name = 'Robotics');
SET @drone_id = (SELECT id FROM school_curriculum_subjects WHERE curriculum_id = @curriculum_id AND name = 'Drone');
SET @electronics_id = (SELECT id FROM school_curriculum_subjects WHERE curriculum_id = @curriculum_id AND name = 'Electronics');
SET @design3d_id = (SELECT id FROM school_curriculum_subjects WHERE curriculum_id = @curriculum_id AND name = '3D Design');
SET @printing3d_id = (SELECT id FROM school_curriculum_subjects WHERE curriculum_id = @curriculum_id AND name = '3D Printing');
SET @iot_id = (SELECT id FROM school_curriculum_subjects WHERE curriculum_id = @curriculum_id AND name = 'IoT');
SET @scratch_id = (SELECT id FROM school_curriculum_subjects WHERE curriculum_id = @curriculum_id AND name = 'Scratch Coding');
SET @ai_id = (SELECT id FROM school_curriculum_subjects WHERE curriculum_id = @curriculum_id AND name = 'Artificial Intelligence');
SET @game_id = (SELECT id FROM school_curriculum_subjects WHERE curriculum_id = @curriculum_id AND name = 'Game Designing');
SET @event_id = (SELECT id FROM school_curriculum_subjects WHERE curriculum_id = @curriculum_id AND name = 'Event Day');

-- Step 3: Insert all projects/topics
INSERT INTO school_curriculum_projects (subject_id, name, sort_order) VALUES
-- Robotics (1-15, 33-38)
(@robotics_id, 'Intro to Robotics', 1),
(@robotics_id, 'Creating Cohorts & RC Car', 2),
(@robotics_id, 'Robotics Gripper', 3),
(@robotics_id, 'Simple Crane', 4),
(@robotics_id, 'Steering With Gears', 5),
(@robotics_id, 'Remote Controlled Pulley Crane', 6),
(@robotics_id, 'Human Construction', 7),
(@robotics_id, 'Say Hello! using display', 8),
(@robotics_id, 'Circle Drawing Robot', 9),
(@robotics_id, 'Use of delay to make precise movements', 10),
(@robotics_id, 'Creating Touch Sensor Robot', 11),
(@robotics_id, 'Robo Car', 12),
(@robotics_id, 'Bumper Car', 13),
(@robotics_id, 'Automatic Door Opener', 14),
(@robotics_id, 'Color Balls Separator', 15),
(@robotics_id, 'Ball Shooter', 33),
(@robotics_id, 'Grass Cutter', 34),
(@robotics_id, 'Ball Shooter', 35),
(@robotics_id, 'Self Driving Smart Robot', 36),
(@robotics_id, 'Smart Pick and Drop', 37),
(@robotics_id, 'Innovation Project 1', 38),
(@robotics_id, 'Innovation Project 2', 39),

-- Drone (16-18, 48-50)
(@drone_id, 'Introduction to Drones & Safety Considerations', 16),
(@drone_id, 'Assembly of the drone (DM002)', 17),
(@drone_id, 'Flying basics and testing', 18),
(@drone_id, 'Assembly of the Drone (XYQ)', 48),
(@drone_id, 'Flying Basics and Testing', 49),
(@drone_id, 'Flying Event', 50),

-- Electronics (19-23, 40-43)
(@electronics_id, 'LED Glow on Breadboard', 19),
(@electronics_id, 'Sound Buzzer', 20),
(@electronics_id, 'Blind Stick', 21),
(@electronics_id, 'Water Level Detector', 22),
(@electronics_id, 'Smart Night Lamp', 23),
(@electronics_id, 'Hand Following Car', 40),
(@electronics_id, 'Security System', 41),
(@electronics_id, 'Smart Gardening', 42),
(@electronics_id, 'Innovation Project 3', 43),

-- 3D Design (24-26, 51-53)
(@design3d_id, 'Keychain Making', 24),
(@design3d_id, 'Name Badge Design', 25),
(@printing3d_id, 'Intro to the printer & test printing', 26),
(@design3d_id, 'Making a Useful Item', 27),
(@printing3d_id, 'Design a Cartoon Character', 51),
(@printing3d_id, 'Design a House Architecture', 52),
(@printing3d_id, 'Design Your Room', 53),

-- IoT (28-30, 54-57)
(@iot_id, 'Understanding IoT', 28),
(@iot_id, 'Number Game', 29),
(@iot_id, 'Snake Game', 30),
(@iot_id, 'Logo Badge', 54),
(@iot_id, 'Countdown', 55),
(@iot_id, 'Dual Mode', 56),
(@iot_id, 'Innovation Project 5', 57),

-- Scratch Coding (31-32, 58-62)
(@scratch_id, 'Activity 5: Make a Quiz', 31),
(@scratch_id, 'Activity 9: Space Battle (Game)', 32),
(@scratch_id, 'Making a Fish Tank', 58),
(@scratch_id, 'Flying Butterfly', 59),
(@scratch_id, 'Activity: Making a Story', 60),
(@scratch_id, 'Activity 11: Make the Crab Change Its Costume', 61),
(@scratch_id, 'Activity 2: Ball Paddle Game', 62),

-- Artificial Intelligence (44-47)
(@ai_id, 'Emotion Detected on AMS (Facemesh)', 44),
(@ai_id, 'Shape Recognition Game', 45),
(@ai_id, 'AI Enabled Smart Dustbin', 46),
(@ai_id, 'Innovation Project 4', 47),

-- Game Designing (63)
(@game_id, 'Game Designing', 63),

-- Event Day (64)
(@event_id, 'Event Day', 64);

-- Verify the insertion
SELECT 
    sc.name as curriculum_name,
    scs.name as subject_name,
    COUNT(scp.id) as topic_count
FROM school_curriculums sc
LEFT JOIN school_curriculum_subjects scs ON sc.id = scs.curriculum_id
LEFT JOIN school_curriculum_projects scp ON scs.id = scp.subject_id
WHERE sc.id = @curriculum_id
GROUP BY sc.id, scs.id
ORDER BY scs.sort_order;

SELECT 'Primary Curriculum inserted successfully!' as message;
