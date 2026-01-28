import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import '../../styles/timetable.css';

const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' }
];

const SchoolTimetable = () => {
  const { selectedSchool, user } = useAuth();
  const isTrainer = ['trainer', 'trainer_head'].includes(user?.role_name);
  const canEdit = ['developer', 'owner', 'school_teacher'].includes(user?.role_name);
  
  const [timetableData, setTimetableData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Create wizard state
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [numPeriods, setNumPeriods] = useState(6);
  const [periods, setPeriods] = useState([]);
  const [selectedDays, setSelectedDays] = useState([]);
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [draggedClass, setDraggedClass] = useState(null);
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    if (selectedSchool) {
      loadTimetable();
      loadClasses();
    }
  }, [selectedSchool]);

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const endpoint = isTrainer 
        ? `/timetables/school/${selectedSchool.id}/consolidated`
        : `/timetables/school/${selectedSchool.id}`;
      const res = await api.get(endpoint);
      setTimetableData(res.data);
      if (res.data) {
        setSchedule(res.data.schedule || []);
      }
    } catch (err) {
      console.error('Failed to load timetable:', err);
      setTimetableData(null);
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const res = await api.get(`/classes/school/${selectedSchool.id}`);
      setClasses(res.data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const startCreateWizard = () => {
    setShowCreateWizard(true);
    setWizardStep(1);
    setNumPeriods(6);
    setPeriods([]);
    setSelectedDays([]);
  };

  const initializePeriods = () => {
    const newPeriods = [];
    let startHour = 9;
    for (let i = 1; i <= numPeriods; i++) {
      const startTime = `${String(startHour).padStart(2, '0')}:00`;
      const endTime = `${String(startHour).padStart(2, '0')}:45`;
      newPeriods.push({ period_number: i, start_time: startTime, end_time: endTime });
      startHour++;
    }
    setPeriods(newPeriods);
  };

  const updatePeriod = (index, field, value) => {
    const newPeriods = [...periods];
    newPeriods[index][field] = value;
    setPeriods(newPeriods);
  };

  const toggleDay = (dayValue) => {
    setSelectedDays(prev => 
      prev.includes(dayValue) ? prev.filter(d => d !== dayValue) : [...prev, dayValue]
    );
  };

  const nextStep = () => {
    if (wizardStep === 1) {
      initializePeriods();
      setWizardStep(2);
    } else if (wizardStep === 2) {
      setWizardStep(3);
    }
  };

  const prevStep = () => {
    setWizardStep(wizardStep - 1);
  };

  const createTimetable = async () => {
    try {
      await api.post('/timetables', {
        school_id: selectedSchool.id,
        name: `${selectedSchool.name} Timetable`,
        periods,
        days: selectedDays
      });
      setShowCreateWizard(false);
      loadTimetable();
      alert('Timetable created successfully!');
    } catch (err) {
      console.error('Failed to create timetable:', err);
      alert(err.response?.data?.error || 'Failed to create timetable');
    }
  };

  const deleteTimetable = async () => {
    if (!confirm('Are you sure you want to delete this timetable?')) return;
    try {
      await api.delete(`/timetables/${timetableData.timetable.id}`);
      setTimetableData(null);
      setSchedule([]);
      alert('Timetable deleted successfully');
    } catch (err) {
      console.error('Failed to delete timetable:', err);
      alert('Failed to delete timetable');
    }
  };

  const startEdit = () => {
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setSchedule(timetableData.schedule || []);
  };

  const saveSchedule = async () => {
    try {
      await api.put(`/timetables/${timetableData.timetable.id}/schedule`, { schedule });
      setEditMode(false);
      loadTimetable();
      alert('Schedule updated successfully!');
    } catch (err) {
      console.error('Failed to save schedule:', err);
      alert('Failed to save schedule');
    }
  };

  const handleDragStart = (e, classItem) => {
    setDraggedClass(classItem);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e, dayOfWeek, periodNumber) => {
    e.preventDefault();
    if (!draggedClass) return;

    // Check if class already exists in this slot
    const exists = schedule.some(s => 
      s.class_id === draggedClass.id && 
      s.day_of_week === dayOfWeek && 
      s.period_number === periodNumber
    );

    if (exists) {
      alert('This class is already scheduled in this slot');
      return;
    }

    // Add to schedule
    setSchedule(prev => [...prev, {
      class_id: draggedClass.id,
      day_of_week: dayOfWeek,
      period_number: periodNumber,
      class_name: draggedClass.name,
      grade: draggedClass.grade,
      section: draggedClass.section
    }]);

    setDraggedClass(null);
  };

  const removeClass = (classId, dayOfWeek, periodNumber) => {
    setSchedule(prev => prev.filter(s => 
      !(s.class_id === classId && s.day_of_week === dayOfWeek && s.period_number === periodNumber)
    ));
  };

  const getClassesForSlot = (dayOfWeek, periodNumber) => {
    return schedule.filter(s => s.day_of_week === dayOfWeek && s.period_number === periodNumber);
  };

  if (!selectedSchool) {
    return <div className="no-data"><p>Please select a school first.</p></div>;
  }

  // Trainer View
  if (isTrainer) {
    return (
      <div className="timetable-page">
        <div className="page-header">
          <h2>Class Schedule</h2>
          <p className="subtitle">View which classes come at which times</p>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : !timetableData ? (
          <div className="no-timetable">
            <p>No timetable has been created yet.</p>
          </div>
        ) : (
          <div className="timetable-view">
            <h3>{timetableData.timetable.name}</h3>
            
            <div className="timetable-grid">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    {timetableData.days.map(day => (
                      <th key={day.day_of_week}>
                        {DAYS.find(d => d.value === day.day_of_week)?.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timetableData.periods.map(period => (
                    <tr key={period.period_number}>
                      <td className="period-cell">
                        <div>Period {period.period_number}</div>
                        <div className="period-time">{period.start_time} - {period.end_time}</div>
                      </td>
                      {timetableData.days.map(day => {
                        const classesInSlot = getClassesForSlot(day.day_of_week, period.period_number);
                        return (
                          <td key={day.day_of_week} className={classesInSlot.length > 0 ? 'has-classes' : 'empty-slot'}>
                            {classesInSlot.length > 0 ? (
                              <div className="classes-list">
                                {classesInSlot.map((cls, idx) => (
                                  <div key={idx} className="class-chip">
                                    {cls.class_name} (Grade {cls.grade})
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="no-class">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Teacher/Admin View
  return (
    <div className="timetable-page">
      <div className="page-header">
        <h2>Timetable Management</h2>
        <p className="subtitle">Manage school master timetable</p>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : !timetableData ? (
        <div className="no-timetable">
          <p>No timetable exists for this school yet.</p>
          {canEdit && (
            <button onClick={startCreateWizard} className="btn-primary btn-large">
              Create Timetable
            </button>
          )}
        </div>
      ) : (
        <div className="timetable-view">
          <div className="timetable-header">
            <h3>{timetableData.timetable.name}</h3>
            {canEdit && !editMode && (
              <div className="header-actions">
                <button onClick={startEdit} className="btn-primary">Edit Schedule</button>
                <button onClick={deleteTimetable} className="btn-danger">Delete Timetable</button>
              </div>
            )}
            {editMode && (
              <div className="header-actions">
                <button onClick={saveSchedule} className="btn-primary">Save Changes</button>
                <button onClick={cancelEdit} className="btn-secondary">Cancel</button>
              </div>
            )}
          </div>

          {editMode && (
            <div className="classes-panel">
              <h4>Available Classes (Drag to schedule)</h4>
              <div className="classes-list-drag">
                {classes.map(cls => (
                  <div
                    key={cls.id}
                    className="class-item-draggable"
                    draggable
                    onDragStart={(e) => handleDragStart(e, cls)}
                  >
                    {cls.name} - Grade {cls.grade} {cls.section}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="timetable-grid">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>Period</th>
                  {timetableData.days.map(day => (
                    <th key={day.day_of_week}>
                      {DAYS.find(d => d.value === day.day_of_week)?.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timetableData.periods.map(period => (
                  <tr key={period.period_number}>
                    <td className="period-cell">
                      <div>Period {period.period_number}</div>
                      <div className="period-time">{period.start_time} - {period.end_time}</div>
                    </td>
                    {timetableData.days.map(day => {
                      const classesInSlot = getClassesForSlot(day.day_of_week, period.period_number);
                      return (
                        <td 
                          key={day.day_of_week} 
                          className={`${classesInSlot.length > 0 ? 'has-classes' : 'empty-slot'} ${editMode ? 'droppable' : ''}`}
                          onDragOver={editMode ? handleDragOver : undefined}
                          onDrop={editMode ? (e) => handleDrop(e, day.day_of_week, period.period_number) : undefined}
                        >
                          {classesInSlot.length > 0 ? (
                            <div className="classes-list">
                              {classesInSlot.map((cls, idx) => (
                                <div key={idx} className="class-chip">
                                  {cls.class_name} (Grade {cls.grade})
                                  {editMode && (
                                    <button 
                                      className="remove-class"
                                      onClick={() => removeClass(cls.class_id, day.day_of_week, period.period_number)}
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="no-class">{editMode ? 'Drop here' : '—'}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Wizard */}
      {showCreateWizard && (
        <div className="modal-overlay">
          <div className="modal-content wizard-modal">
            <div className="wizard-progress">
              <div className={`step ${wizardStep >= 1 ? 'active' : ''}`}>
                <span className="step-number">1</span>
                Periods
              </div>
              <div className={`step-connector ${wizardStep > 1 ? 'active' : ''}`}></div>
              <div className={`step ${wizardStep >= 2 ? 'active' : ''}`}>
                <span className="step-number">2</span>
                Timings
              </div>
              <div className={`step-connector ${wizardStep > 2 ? 'active' : ''}`}></div>
              <div className={`step ${wizardStep >= 3 ? 'active' : ''}`}>
                <span className="step-number">3</span>
                Days
              </div>
            </div>

            {wizardStep === 1 && (
              <div className="wizard-step">
                <h3>How many periods per day?</h3>
                <div className="form-group">
                  <label>Number of Periods</label>
                  <input 
                    type="number" 
                    value={numPeriods} 
                    onChange={(e) => setNumPeriods(parseInt(e.target.value) || 1)}
                    min="1" 
                    max="12" 
                  />
                </div>
                <div className="wizard-actions">
                  <button onClick={() => setShowCreateWizard(false)} className="btn-secondary">Cancel</button>
                  <button onClick={nextStep} className="btn-primary">Next</button>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="wizard-step">
                <h3>Set Period Timings</h3>
                <div className="period-timings">
                  {periods.map((period, idx) => (
                    <div key={idx} className="timing-row">
                      <span>Period {period.period_number}</span>
                      <input 
                        type="time" 
                        value={period.start_time}
                        onChange={(e) => updatePeriod(idx, 'start_time', e.target.value)}
                      />
                      <span>to</span>
                      <input 
                        type="time" 
                        value={period.end_time}
                        onChange={(e) => updatePeriod(idx, 'end_time', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div className="wizard-actions">
                  <button onClick={prevStep} className="btn-secondary">Back</button>
                  <button onClick={nextStep} className="btn-primary">Next</button>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="wizard-step">
                <h3>Select School Days</h3>
                <div className="days-selector">
                  {DAYS.map(day => (
                    <button
                      key={day.value}
                      className={`day-btn ${selectedDays.includes(day.value) ? 'selected' : ''}`}
                      onClick={() => toggleDay(day.value)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <div className="wizard-actions">
                  <button onClick={prevStep} className="btn-secondary">Back</button>
                  <button 
                    onClick={createTimetable} 
                    className="btn-primary"
                    disabled={selectedDays.length === 0}
                  >
                    Create Timetable
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolTimetable;
