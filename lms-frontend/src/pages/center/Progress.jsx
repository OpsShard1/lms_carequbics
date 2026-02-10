import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotificationContext } from '../../context/NotificationContext';
import { useEditMode } from '../../hooks/useEditMode';
import api from '../../api/axios';
import '../../styles/progress.css';

const SKILL_FIELDS = [
  { key: 'concept_understanding', label: 'Concept Understanding' },
  { key: 'application_of_knowledge', label: 'Application of Knowledge' },
  { key: 'hands_on_skill', label: 'Hands-on Skill' },
  { key: 'communication_skill', label: 'Communication Skill' },
  { key: 'consistency', label: 'Consistency' },
  { key: 'idea_generation', label: 'Idea Generation' },
  { key: 'iteration_improvement', label: 'Iteration & Improvement' }
];

const CenterProgress = () => {
  const { selectedCenter, user } = useAuth();
  const { showSuccess, showError } = useNotificationContext();
  const { canEdit, checkEdit } = useEditMode();
  const canChangeCurriculum = ['developer', 'owner', 'trainer_head'].includes(user?.role_name) && canEdit;
  const canUpdateProgress = ['developer', 'owner', 'trainer_head', 'trainer'].includes(user?.role_name) && canEdit;
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Curriculum data
  const [curriculums, setCurriculums] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  
  // Progress form
  const [progress, setProgress] = useState(null);
  const [saving, setSaving] = useState(false);
  const [assigningCurriculum, setAssigningCurriculum] = useState(false);

  useEffect(() => {
    if (selectedCenter) {
      loadStudents();
      loadCurriculums();
    }
  }, [selectedCenter]);

  useEffect(() => {
    const filtered = students.filter(s => 
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStudents(filtered);
  }, [searchTerm, students]);

  useEffect(() => {
    if (selectedCurriculum) loadSubjects();
    else { setSubjects([]); setSelectedSubject(''); }
  }, [selectedCurriculum]);

  useEffect(() => {
    if (selectedSubject) loadTopics();
    else { setTopics([]); setSelectedTopic(''); }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedStudent && selectedTopic) loadProgress();
    else setProgress(null);
  }, [selectedStudent, selectedTopic]);

  // Auto-select curriculum when student is selected
  useEffect(() => {
    if (selectedStudent) {
      if (selectedStudent.curriculum_id) {
        setSelectedCurriculum(String(selectedStudent.curriculum_id));
      } else {
        setSelectedCurriculum('');
      }
      setSelectedSubject('');
      setSelectedTopic('');
    }
  }, [selectedStudent]);

  const loadStudents = async () => {
    try {
      const res = await api.get(`/students/center/${selectedCenter.id}`);
      setStudents(res.data);
      setFilteredStudents(res.data);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCurriculums = async () => {
    try {
      const res = await api.get('/curriculum');
      setCurriculums(res.data);
    } catch (err) {
      console.error('Failed to load curriculums:', err);
    }
  };

  const loadSubjects = async () => {
    try {
      const res = await api.get(`/curriculum/${selectedCurriculum}/subjects`);
      setSubjects(res.data);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  };

  const loadTopics = async () => {
    try {
      const res = await api.get(`/curriculum/subjects/${selectedSubject}/topics`);
      setTopics(res.data);
    } catch (err) {
      console.error('Failed to load topics:', err);
    }
  };

  const loadProgress = async () => {
    try {
      const res = await api.get(`/curriculum/progress/student/${selectedStudent.id}/topic/${selectedTopic}`);
      setProgress(res.data);
    } catch (err) {
      console.error('Failed to load progress:', err);
      setProgress({
        status: 'not_started',
        concept_understanding: 0,
        application_of_knowledge: 0,
        hands_on_skill: 0,
        communication_skill: 0,
        consistency: 0,
        idea_generation: 0,
        iteration_improvement: 0,
        remarks: ''
      });
    }
  };

  const handleAssignCurriculum = async (curriculumId) => {
    if (!selectedStudent) return;
    setAssigningCurriculum(true);
    try {
      await api.put(`/students/${selectedStudent.id}`, { curriculum_id: curriculumId || null });
      // Update local state
      const updatedStudent = { ...selectedStudent, curriculum_id: curriculumId ? parseInt(curriculumId) : null };
      setSelectedStudent(updatedStudent);
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
      setSelectedCurriculum(curriculumId);
      setSelectedSubject('');
      setSelectedTopic('');
    } catch (err) {
      showError('Failed to assign curriculum');
    } finally {
      setAssigningCurriculum(false);
    }
  };

  const handleSkillChange = (key, value) => {
    setProgress(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveProgress = async () => {
    if (!selectedStudent || !selectedTopic) return;
    if (!checkEdit()) return;
    
    setSaving(true);
    try {
      await api.put(`/curriculum/progress/student/${selectedStudent.id}/topic/${selectedTopic}`, progress);
      showSuccess('Progress saved successfully!');
    } catch (err) {
      showError('Failed to save progress');
    } finally {
      setSaving(false);
    }
  };

  const getSkillLabel = (value) => {
    if (value === -1) return 'Negative';
    if (value === 1) return 'Positive';
    return 'Neutral';
  };

  const getSkillClass = (value) => {
    if (value === -1) return 'negative';
    if (value === 1) return 'positive';
    return 'neutral';
  };

  if (!selectedCenter) return <div className="no-data"><p>Please select a center first.</p></div>;

  return (
    <div className="progress-page">
      <div className="page-header">
        <h2>Student Progress</h2>
        <p className="subtitle">Track student progress by curriculum topics</p>
      </div>

      <div className="progress-layout">
        {/* Student List Panel */}
        <div className="student-panel">
          <div className="search-box">
            <input 
              type="text"
              placeholder="🔍 Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="student-list">
            {loading ? (
              <p className="loading-text">Loading students...</p>
            ) : filteredStudents.length === 0 ? (
              <p className="empty-text">No students found</p>
            ) : (
              filteredStudents.map(student => (
                <div 
                  key={student.id}
                  className={`student-item ${selectedStudent?.id === student.id ? 'active' : ''}`}
                  onClick={() => setSelectedStudent(student)}
                >
                  <div className="student-avatar">
                    {student.first_name[0]}{student.last_name?.[0] || ''}
                  </div>
                  <div className="student-info">
                    <span className="name">{student.first_name} {student.last_name}</span>
                    <span className="school">
                      {student.curriculum_name || <em>No curriculum</em>}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Progress Panel */}
        <div className="progress-panel">
          {!selectedStudent ? (
            <div className="no-selection">
              <div className="icon">👈</div>
              <p>Select a student to view and update their progress</p>
            </div>
          ) : (
            <>
              <div className="selected-student-header">
                <div className="student-avatar large">
                  {selectedStudent.first_name[0]}{selectedStudent.last_name?.[0] || ''}
                </div>
                <div>
                  <h3>{selectedStudent.first_name} {selectedStudent.last_name}</h3>
                  <p>{selectedStudent.school_name_external || 'No school'}</p>
                </div>
              </div>

              {/* Curriculum Assignment */}
              <div className="curriculum-assignment">
                <label>Assigned Curriculum</label>
                <div className="assignment-row">
                  {canChangeCurriculum ? (
                    <select 
                      value={selectedStudent.curriculum_id || ''} 
                      onChange={(e) => handleAssignCurriculum(e.target.value)}
                      disabled={assigningCurriculum}
                    >
                      <option value="">-- No Curriculum Assigned --</option>
                      {curriculums.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="curriculum-readonly">
                      {curriculums.find(c => c.id === selectedStudent.curriculum_id)?.name || 'No Curriculum Assigned'}
                    </span>
                  )}
                  {assigningCurriculum && <span className="saving-indicator">Saving...</span>}
                </div>
              </div>

              {/* Subject & Topic Selection (only if curriculum assigned) */}
              {selectedStudent.curriculum_id && (
                <div className="curriculum-selectors">
                  <div className="selector-group">
                    <label>Subject</label>
                    <select 
                      value={selectedSubject} 
                      onChange={(e) => { setSelectedSubject(e.target.value); setSelectedTopic(''); }}
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="selector-group">
                    <label>Topic</label>
                    <select 
                      value={selectedTopic} 
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      disabled={!selectedSubject}
                    >
                      <option value="">Select Topic</option>
                      {topics.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {!selectedStudent.curriculum_id && (
                <div className="no-curriculum-hint">
                  <p>⚠️ Please assign a curriculum to this student first to track their progress.</p>
                </div>
              )}

              {/* Progress Form */}
              {selectedTopic && progress && (
                <div className="progress-form">
                  <div className="status-selector">
                    <label>Status</label>
                    <div className="status-buttons">
                      {['not_started', 'in_progress', 'completed'].map(status => (
                        <button
                          key={status}
                          className={`status-btn ${progress.status === status ? 'active' : ''} ${status}`}
                          onClick={() => setProgress({...progress, status})}
                        >
                          {status === 'not_started' ? 'Not Started' : 
                           status === 'in_progress' ? 'In Progress' : 'Completed'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="skills-section">
                    <h4>Skill Assessment</h4>
                    <p className="skills-hint">Rate each skill: Negative (-1), Neutral (0), Positive (+1)</p>
                    
                    {SKILL_FIELDS.map(skill => (
                      <div key={skill.key} className="skill-row">
                        <label>{skill.label}</label>
                        <div className="skill-slider">
                          <button 
                            className={`skill-btn negative ${progress[skill.key] === -1 ? 'active' : ''}`}
                            onClick={() => handleSkillChange(skill.key, -1)}
                          >−</button>
                          <button 
                            className={`skill-btn neutral ${progress[skill.key] === 0 ? 'active' : ''}`}
                            onClick={() => handleSkillChange(skill.key, 0)}
                          >○</button>
                          <button 
                            className={`skill-btn positive ${progress[skill.key] === 1 ? 'active' : ''}`}
                            onClick={() => handleSkillChange(skill.key, 1)}
                          >+</button>
                        </div>
                        <span className={`skill-value ${getSkillClass(progress[skill.key])}`}>
                          {getSkillLabel(progress[skill.key])}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="remarks-section">
                    <label>Remarks</label>
                    <textarea 
                      value={progress.remarks || ''}
                      onChange={(e) => setProgress({...progress, remarks: e.target.value})}
                      placeholder="Add any notes about the student's progress..."
                      rows={3}
                    />
                  </div>

                  <button 
                    onClick={handleSaveProgress} 
                    className="btn-primary btn-large save-btn"
                    disabled={saving || !canUpdateProgress}
                  >
                    {saving ? 'Saving...' : canUpdateProgress ? 'Save Progress' : 'View Only'}
                  </button>
                </div>
              )}

              {selectedTopic && !progress && (
                <div className="loading-progress">Loading progress...</div>
              )}

              {!selectedTopic && selectedStudent.curriculum_id && (
                <div className="select-topic-hint">
                  <p>👆 Select a subject and topic to update progress</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CenterProgress;
