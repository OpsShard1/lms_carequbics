import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import '../../styles/timetable.css';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', 
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday'
};

const SchoolTimetable = () => {
  const { selectedSchool } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [periodsPerDay, setPeriodsPerDay] = useState(8);
  const [periodTimings, setPeriodTimings] = useState([]);
  const [selectedDays, setSelectedDays] = useState([]);
  const [entries, setEntries] = useState({});

  useEffect(() => {
    if (selectedSchool) loadClasses();
  }, [selectedSchool]);

  useEffect(() => {
    if (selectedClass) loadTimetable();
  }, [selectedClass]);

  const loadClasses = async () => {
    try {
      const res = await api.get(`/classes/school/${selectedSchool.id}`);
      setClasses(res.data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/timetables/class/${selectedClass}`);
      setTimetable(res.data);
    } catch (err) {
      console.error('Failed to load timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  const initializePeriodTimings = () => {
    const timings = [];
    let startHour = 9;
    for (let i = 1; i <= periodsPerDay; i++) {
      const startTime = `${String(startHour).padStart(2, '0')}:00`;
      const endTime = `${String(startHour).padStart(2, '0')}:45`;
      timings.push({ period: i, start_time: startTime, end_time: endTime });
      startHour++;
    }
    setPeriodTimings(timings);
  };

  const updatePeriodTiming = (index, field, value) => {
    const newTimings = [...periodTimings];
    newTimings[index][field] = value;
    setPeriodTimings(newTimings);
  };

  const toggleDay = (day) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const initializeEntries = () => {
    const newEntries = {};
    selectedDays.forEach(day => {
      newEntries[day] = periodTimings.map(pt => ({
        period_number: pt.period,
        start_time: pt.start_time,
        end_time: pt.end_time,
        subject: '',
        room_number: '',
        is_active: false
      }));
    });
    setEntries(newEntries);
  };

  const togglePeriodActive = (day, periodIndex) => {
    setEntries(prev => {
      const newEntries = { ...prev };
      newEntries[day] = [...newEntries[day]];
      newEntries[day][periodIndex] = {
        ...newEntries[day][periodIndex],
        is_active: !newEntries[day][periodIndex].is_active
      };
      return newEntries;
    });
  };

  const updateEntry = (day, periodIndex, field, value) => {
    setEntries(prev => {
      const newEntries = { ...prev };
      newEntries[day] = [...newEntries[day]];
      newEntries[day][periodIndex] = {
        ...newEntries[day][periodIndex],
        [field]: value
      };
      return newEntries;
    });
  };

  const startWizard = () => {
    setShowWizard(true);
    setWizardStep(1);
    setPeriodsPerDay(8);
    setPeriodTimings([]);
    setSelectedDays([]);
    setEntries({});
  };

  const nextStep = () => {
    if (wizardStep === 1) {
      initializePeriodTimings();
      setWizardStep(2);
    } else if (wizardStep === 2) {
      setWizardStep(3);
    } else if (wizardStep === 3) {
      initializeEntries();
      setWizardStep(4);
    }
  };

  const prevStep = () => {
    if (wizardStep === 2) {
      setPeriodTimings([]);
    } else if (wizardStep === 3) {
      setSelectedDays([]);
    } else if (wizardStep === 4) {
      setEntries({});
    }
    setWizardStep(wizardStep - 1);
  };

  const saveTimetable = async () => {
    try {
      const flatEntries = [];
      Object.entries(entries).forEach(([day, periods]) => {
        periods.forEach(period => {
          if (period.is_active) {
            flatEntries.push({
              day_of_week: day,
              period_number: period.period_number,
              start_time: period.start_time,
              end_time: period.end_time,
              subject: period.subject,
              room_number: period.room_number
            });
          }
        });
      });

      if (flatEntries.length === 0) {
        alert('Please select at least one period');
        return;
      }

      await api.post('/timetables', {
        school_id: selectedSchool.id,
        class_id: selectedClass,
        name: `Timetable for ${classes.find(c => c.id == selectedClass)?.name}`,
        periods_per_day: periodsPerDay,
        entries: flatEntries
      });

      setShowWizard(false);
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
      await api.delete(`/timetables/${timetable.id}`);
      setTimetable(null);
      alert('Timetable deleted');
    } catch (err) {
      console.error('Failed to delete timetable:', err);
    }
  };

  if (!selectedSchool) return <div className="no-data"><p>Please select a school first.</p></div>;

  return (
    <div className="timetable-page">
      <div className="page-header">
        <div>
          <h2>Timetable Management</h2>
          <p className="subtitle">Create and manage class schedules</p>
        </div>
      </div>

      <div className="filters">
        <div className="form-group">
          <label>Select Class</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            <option value="">-- Choose a class --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} - Grade {c.grade}</option>)}
          </select>
        </div>
      </div>

      {selectedClass && !loading && !timetable && !showWizard && (
        <div className="no-timetable">
          <p>📅 No timetable exists for this class yet.</p>
          <button onClick={startWizard} className="btn-primary btn-large">Create Timetable</button>
        </div>
      )}

      {/* Wizard */}
      {showWizard && (
        <div className="wizard-container">
          <div className="wizard-progress">
            <div className={`step ${wizardStep >= 1 ? 'active' : ''} ${wizardStep > 1 ? 'completed' : ''}`}>
              <span className="step-number">{wizardStep > 1 ? '✓' : '1'}</span>
              Periods
            </div>
            <div className={`step-connector ${wizardStep > 1 ? 'active' : ''}`}></div>
            <div className={`step ${wizardStep >= 2 ? 'active' : ''} ${wizardStep > 2 ? 'completed' : ''}`}>
              <span className="step-number">{wizardStep > 2 ? '✓' : '2'}</span>
              Timings
            </div>
            <div className={`step-connector ${wizardStep > 2 ? 'active' : ''}`}></div>
            <div className={`step ${wizardStep >= 3 ? 'active' : ''} ${wizardStep > 3 ? 'completed' : ''}`}>
              <span className="step-number">{wizardStep > 3 ? '✓' : '3'}</span>
              Days
            </div>
            <div className={`step-connector ${wizardStep > 3 ? 'active' : ''}`}></div>
            <div className={`step ${wizardStep >= 4 ? 'active' : ''}`}>
              <span className="step-number">4</span>
              Schedule
            </div>
          </div>

          {/* Step 1: Number of Periods */}
          {wizardStep === 1 && (
            <div className="wizard-step">
              <h3>How many periods per day?</h3>
              <p>Enter the total number of periods in a school day</p>
              
              <div className="period-config">
                <label>Number of Periods</label>
                <input 
                  type="number" 
                  value={periodsPerDay} 
                  onChange={(e) => setPeriodsPerDay(parseInt(e.target.value) || 1)}
                  min="1" 
                  max="12" 
                />
              </div>

              <div className="wizard-actions">
                <button onClick={() => setShowWizard(false)} className="btn-secondary">Cancel</button>
                <button onClick={nextStep} className="btn-primary">Next: Set Timings →</button>
              </div>
            </div>
          )}

          {/* Step 2: Period Timings */}
          {wizardStep === 2 && (
            <div className="wizard-step">
              <h3>Set Period Timings</h3>
              <p>Configure the start and end time for each period</p>
              
              <div className="period-timings">
                {periodTimings.map((pt, idx) => (
                  <div key={idx} className="timing-row">
                    <span className="period-label">Period {pt.period}</span>
                    <input 
                      type="time" 
                      value={pt.start_time}
                      onChange={(e) => updatePeriodTiming(idx, 'start_time', e.target.value)}
                    />
                    <span>to</span>
                    <input 
                      type="time" 
                      value={pt.end_time}
                      onChange={(e) => updatePeriodTiming(idx, 'end_time', e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="wizard-actions">
                <button onClick={prevStep} className="btn-secondary">← Back</button>
                <button onClick={nextStep} className="btn-primary">Next: Select Days →</button>
              </div>
            </div>
          )}

          {/* Step 3: Select Days */}
          {wizardStep === 3 && (
            <div className="wizard-step">
              <h3>Select Class Days</h3>
              <p>Which days of the week will this class have sessions?</p>
              
              <div className="days-selector">
                {DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    className={`day-btn ${selectedDays.includes(day) ? 'selected' : ''}`}
                    onClick={() => toggleDay(day)}
                  >
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>

              <div className="wizard-actions">
                <button onClick={prevStep} className="btn-secondary">← Back</button>
                <button 
                  onClick={nextStep} 
                  className="btn-primary"
                  disabled={selectedDays.length === 0}
                >
                  Next: Assign Schedule →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Assign Schedule */}
          {wizardStep === 4 && (
            <div className="wizard-step">
              <h3>Assign Schedule</h3>
              <p>Select which periods have classes and add subject/room details</p>
              
              <div className="schedule-grid">
                {selectedDays.sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b)).map(day => (
                  <div key={day} className="day-schedule">
                    <h4>{DAY_LABELS[day]}</h4>
                    <div className="periods-list">
                      {entries[day]?.map((entry, idx) => (
                        <div key={idx} className={`period-entry ${entry.is_active ? 'active' : ''}`}>
                          <label className="period-checkbox">
                            <input 
                              type="checkbox"
                              checked={entry.is_active}
                              onChange={() => togglePeriodActive(day, idx)}
                            />
                            <span>Period {entry.period_number} ({entry.start_time} - {entry.end_time})</span>
                          </label>
                          {entry.is_active && (
                            <div className="period-details">
                              <input 
                                placeholder="Subject"
                                value={entry.subject}
                                onChange={(e) => updateEntry(day, idx, 'subject', e.target.value)}
                              />
                              <input 
                                placeholder="Room No."
                                value={entry.room_number}
                                onChange={(e) => updateEntry(day, idx, 'room_number', e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="wizard-actions">
                <button onClick={prevStep} className="btn-secondary">← Back</button>
                <button onClick={saveTimetable} className="btn-primary btn-large">✓ Save Timetable</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timetable View */}
      {timetable && !showWizard && (
        <div className="timetable-view">
          <div className="timetable-header">
            <h3>📅 {timetable.name}</h3>
            <span>{timetable.periods_per_day} periods/day</span>
            <button onClick={deleteTimetable} className="btn-danger btn-sm">Delete</button>
            <button onClick={startWizard} className="btn-secondary btn-sm">Edit</button>
          </div>
          
          <div className="timetable-grid">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Period</th>
                  <th>Time</th>
                  <th>Subject</th>
                  <th>Room</th>
                </tr>
              </thead>
              <tbody>
                {timetable.entries?.length === 0 ? (
                  <tr><td colSpan="5" style={{textAlign: 'center', color: '#64748b'}}>No entries yet</td></tr>
                ) : (
                  timetable.entries?.map(e => (
                    <tr key={e.id}>
                      <td className="day-cell">{DAY_LABELS[e.day_of_week]}</td>
                      <td>Period {e.period_number}</td>
                      <td>{e.start_time} - {e.end_time}</td>
                      <td>{e.subject || <span style={{color: '#94a3b8'}}>-</span>}</td>
                      <td>{e.room_number || <span style={{color: '#94a3b8'}}>-</span>}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolTimetable;
