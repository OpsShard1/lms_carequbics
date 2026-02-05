import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotificationContext } from '../../context/NotificationContext';
import api from '../../api/axios';
import '../../styles/class-progress.css';

const ClassProgress = () => {
  const { user, selectedSchool } = useAuth();
  const { showSuccess, showError } = useNotificationContext();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [curriculums, setCurriculums] = useState([]);
  const [classProgress, setClassProgress] = useState(null);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedCurriculum, setSelectedCurriculum] = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const canEdit = ['developer', 'trainer_head', 'trainer'].includes(user?.role_name);

  useEffect(() => {
    if (selectedSchool) {
      loadClasses();
      loadCurriculums();
    }
  }, [selectedSchool]);

  const loadClasses = async () => {
    try {
      const res = await api.get(`/classes/school/${selectedSchool.id}`);
      setClasses(res.data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const loadCurriculums = async () => {
    try {
      const res = await api.get('/school-curriculum');
      setCurriculums(res.data);
    } catch (err) {
      console.error('Failed to load curriculums:', err);
    }
  };

  const loadClassProgress = async (classId, preserveExpanded = false) => {
    try {
      setLoading(true);
      const res = await api.get(`/school-curriculum/class/${classId}/progress`);
      setClassProgress(res.data);
      setSelectedClass(classId);
      if (!preserveExpanded) {
        setExpandedSubjects([]);
      }
    } catch (err) {
      console.error('Failed to load class progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCurriculum = async (e) => {
    e.preventDefault();
    try {
      await api.post('/school-curriculum/assign', {
        class_id: selectedClass,
        curriculum_id: selectedCurriculum
      });
      setShowAssignForm(false);
      setSelectedCurriculum('');
      loadClassProgress(selectedClass);
      showSuccess('Curriculum assigned successfully!');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to assign curriculum');
    }
  };

  const handleUpdateProgress = async (projectId, status, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      // Optimistically update the UI
      setClassProgress(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          subjects: prev.subjects.map(subject => ({
            ...subject,
            projects: subject.projects.map(project => 
              project.id === projectId 
                ? { 
                    ...project, 
                    status,
                    completion_date: status === 'completed' ? new Date().toISOString().split('T')[0] : null
                  }
                : project
            )
          }))
        };
      });

      // Update on server
      await api.put(`/school-curriculum/class/${selectedClass}/project/${projectId}`, {
        status,
        completion_date: status === 'completed' ? new Date().toISOString().split('T')[0] : null,
        remarks: ''
      });
      showSuccess('Progress updated successfully!');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to update progress');
      // Reload on error to get correct state
      loadClassProgress(selectedClass, true);
    }
  };

  const toggleSubject = (subjectId) => {
    if (expandedSubjects.includes(subjectId)) {
      setExpandedSubjects(expandedSubjects.filter(id => id !== subjectId));
    } else {
      setExpandedSubjects([...expandedSubjects, subjectId]);
    }
  };

  const getStatusClass = (status) => {
    if (status === 'completed') return 'status-completed';
    if (status === 'in_progress') return 'status-in-progress';
    return 'status-not-started';
  };

  const calculateSubjectProgress = (projects) => {
    if (!projects || projects.length === 0) return 0;
    const completed = projects.filter(p => p.status === 'completed').length;
    return Math.round((completed / projects.length) * 100);
  };

  return (
    <div className="class-progress-page">
      <div className="page-header">
        <h2>Class Progress Tracking</h2>
      </div>

      <div className="progress-layout">
        <div className="classes-sidebar">
          <h3>Classes</h3>
          {classes.map(cls => (
            <div
              key={cls.id}
              className={`class-item ${selectedClass === cls.id ? 'active' : ''}`}
              onClick={() => loadClassProgress(cls.id)}
            >
              <div className="class-name">{cls.name}</div>
              <div className="class-meta">{cls.student_count || 0} students</div>
            </div>
          ))}
        </div>

        <div className="progress-content">
          {!selectedClass ? (
            <div className="no-selection">
              <p>📚 Select a class to view and track progress</p>
            </div>
          ) : loading ? (
            <div className="loading">Loading...</div>
          ) : !classProgress?.curriculum ? (
            <div className="no-curriculum">
              <div className="icon">📖</div>
              <h3>No Curriculum Assigned</h3>
              <p>This class doesn't have a curriculum assigned yet.</p>
              {canEdit && (
                <button onClick={() => setShowAssignForm(true)} className="btn-primary">
                  Assign Curriculum
                </button>
              )}
              
              {showAssignForm && (
                <form onSubmit={handleAssignCurriculum} className="assign-form">
                  <select
                    value={selectedCurriculum}
                    onChange={(e) => setSelectedCurriculum(e.target.value)}
                    required
                  >
                    <option value="">Select Curriculum</option>
                    {curriculums.map(curr => (
                      <option key={curr.id} value={curr.id}>
                        {curr.name} - {curr.grade_name}
                      </option>
                    ))}
                  </select>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">Assign</button>
                    <button type="button" onClick={() => setShowAssignForm(false)} className="btn-secondary">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <>
              <div className="curriculum-header">
                <div>
                  <h3>{classProgress.curriculum.curriculum_name}</h3>
                  <p className="grade-label">Grade: {classProgress.curriculum.grade_name}</p>
                </div>
              </div>

              <div className="subjects-progress">
                {classProgress.subjects?.map(subject => {
                  const progress = calculateSubjectProgress(subject.projects);
                  return (
                    <div key={subject.id} className="subject-progress-card">
                      <div
                        className="subject-progress-header"
                        onClick={() => toggleSubject(subject.id)}
                      >
                        <div className="subject-info">
                          <h4>
                            <span className="expand-icon">
                              {expandedSubjects.includes(subject.id) ? '▼' : '▶'}
                            </span>
                            {subject.name}
                          </h4>
                          {subject.description && <p className="subject-desc">{subject.description}</p>}
                        </div>
                        <div className="progress-indicator">
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                          </div>
                          <span className="progress-text">{progress}%</span>
                        </div>
                      </div>

                      {expandedSubjects.includes(subject.id) && (
                        <div className="projects-progress">
                          {subject.projects?.map((project, idx) => (
                            <div key={project.id} className={`project-progress-item ${getStatusClass(project.status)}`}>
                              <div className="project-number">{idx + 1}</div>
                              <div className="project-info">
                                <div className="project-name">{project.name}</div>
                                {project.description && <div className="project-desc">{project.description}</div>}
                                {project.completion_date && (
                                  <div className="completion-date">
                                    Completed: {new Date(project.completion_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                              {canEdit && (
                                <div className="status-buttons">
                                  <button
                                    type="button"
                                    className={`status-btn ${project.status === 'not_started' ? 'active' : ''}`}
                                    onClick={(e) => handleUpdateProgress(project.id, 'not_started', e)}
                                    title="Not Started"
                                  >
                                    ○
                                  </button>
                                  <button
                                    type="button"
                                    className={`status-btn ${project.status === 'in_progress' ? 'active' : ''}`}
                                    onClick={(e) => handleUpdateProgress(project.id, 'in_progress', e)}
                                    title="In Progress"
                                  >
                                    ◐
                                  </button>
                                  <button
                                    type="button"
                                    className={`status-btn ${project.status === 'completed' ? 'active' : ''}`}
                                    onClick={(e) => handleUpdateProgress(project.id, 'completed', e)}
                                    title="Completed"
                                  >
                                    ●
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassProgress;
