import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotificationContext } from '../../context/NotificationContext';
import Modal from '../../components/Modal';
import api from '../../api/axios';
import '../../styles/help.css';

const Help = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotificationContext();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    section: '',
    subsections: [],
    title: '',
    description: ''
  });

  const subsectionOptions = {
    school: ['Dashboard', 'Classes', 'Students', 'Curriculum', 'Timetable', 'Attendance', 'Class Progress'],
    center: ['Dashboard', 'Students', 'Curriculum', 'Attendance', 'Progress Tracking', 'Fees Management'],
    admin: ['User Management', 'Schools', 'Centers', 'Teacher Assignments'],
    general: ['Login', 'Navigation', 'Performance', 'Other']
  };

  const handleSubsectionToggle = (subsection) => {
    setReportForm(prev => ({
      ...prev,
      subsections: prev.subsections.includes(subsection)
        ? prev.subsections.filter(s => s !== subsection)
        : [...prev.subsections, subsection]
    }));
  };

  const canAccessSchool = user?.section_type === 'school' || user?.section_type === 'both';
  const canAccessCenter = user?.section_type === 'center' || user?.section_type === 'both';
  const canAccessAdmin = ['developer', 'super_admin', 'admin', 'owner', 'trainer_head'].includes(user?.role_name);

  const handleReportIssue = async (e) => {
    e.preventDefault();
    try {
      await api.post('/help/issues', {
        ...reportForm,
        subsections: reportForm.subsections.join(', ')
      });
      showSuccess('Issue reported successfully! Our team will look into it.');
      setShowReportModal(false);
      setReportForm({ section: '', subsections: [], title: '', description: '' });
    } catch (err) {
      showError('Failed to report issue');
    }
  };

  return (
    <div className="help-page">
      <div className="help-header">
        <h1>Help & Documentation</h1>
        <button onClick={() => setShowReportModal(true)} className="btn-primary">
          Report an Issue
        </button>
      </div>

      <div className="help-intro">
        <h2>Welcome to the Learning Management System</h2>
        <p>
          This comprehensive Learning Management System is designed to streamline educational operations 
          for both schools and learning centers. The platform enables efficient management of students, 
          attendance tracking, curriculum planning, progress monitoring, and fee management. Whether you're 
          managing a school with multiple classes or a learning center with various programs, this system 
          provides all the tools you need to deliver quality education and maintain organized records.
        </p>
      </div>

      <div className="help-sections">
        {canAccessSchool && (
          <div className="help-section">
            <h2>School Section</h2>
            <div className="help-content">
              <div className="help-item">
                <h3>Dashboard</h3>
                <p>View overview of your school including total students, classes, and quick statistics. Access recent activities and important metrics at a glance.</p>
              </div>

              <div className="help-item">
                <h3>Classes</h3>
                <p>
                  <strong>Create Classes:</strong> Set up classes with grade, section, and schedule details.<br/>
                  <strong>Manage Students:</strong> Add students to classes, approve extra students, and manage class rosters.<br/>
                  <strong>Class Details:</strong> View student lists, attendance records, and class-specific information.
                </p>
              </div>

              <div className="help-item">
                <h3>Students</h3>
                <p>
                  Register new students with complete details including personal information, parent contacts, and enrollment dates. 
                  Search and filter students by class. Edit student information and manage student records efficiently.
                </p>
              </div>

              <div className="help-item">
                <h3>Curriculum</h3>
                <p>
                  Manage school curriculum with subjects and topics. Define learning objectives and structure educational content. 
                  Organize curriculum by grade levels and subjects to ensure comprehensive coverage of academic standards.
                </p>
              </div>

              <div className="help-item">
                <h3>Timetable</h3>
                <p>
                  Create weekly schedules for classes. Set up period timings and assign classes to specific time slots. 
                  Use drag-and-drop functionality to easily organize the timetable. View and print class schedules.
                </p>
              </div>

              <div className="help-item">
                <h3>Attendance</h3>
                <p>
                  Mark daily attendance for students (Present, Absent, Late). View attendance history and statistics. 
                  Filter by date range and class. Generate attendance reports for analysis.
                </p>
              </div>

              <div className="help-item">
                <h3>Class Progress</h3>
                <p>
                  Track curriculum completion for each class. Mark topics as completed and monitor overall progress. 
                  View subject-wise progress and ensure curriculum is covered on schedule.
                </p>
              </div>
            </div>
          </div>
        )}

        {canAccessCenter && (
          <div className="help-section">
            <h2>Center Section</h2>
            <div className="help-content">
              <div className="help-item">
                <h3>Dashboard</h3>
                <p>Overview of center operations including student count, curriculum statistics, and recent activities. Monitor key metrics and access quick actions.</p>
              </div>

              <div className="help-item">
                <h3>Students</h3>
                <p>
                  Register students with comprehensive details including external school information, parent qualifications, 
                  referral sources, and program preferences. Assign students to curriculums and track their enrollment details.
                </p>
              </div>

              <div className="help-item">
                <h3>Curriculum</h3>
                <p>
                  Create and manage learning curriculums with subjects and topics. Organize content hierarchically. 
                  Define learning objectives and structure educational content. Assign curriculums to students.
                </p>
              </div>

              <div className="help-item">
                <h3>Attendance</h3>
                <p>
                  Record daily attendance for center students. Track attendance patterns and generate reports. 
                  View attendance history and statistics for individual students or groups.
                </p>
              </div>

              <div className="help-item">
                <h3>Progress Tracking</h3>
                <p>
                  Monitor individual student progress across curriculum topics. Rate students on multiple skills including 
                  concept understanding, application, hands-on skills, communication, consistency, idea generation, and iteration. 
                  Add remarks and track completion status for each topic.
                </p>
              </div>

              <div className="help-item">
                <h3>Fees Management</h3>
                <p>
                  Set up fee structures based on curriculum duration. Track installment payments and due dates. 
                  Record payments and view payment history. Monitor outstanding fees and generate fee reports.
                </p>
              </div>
            </div>
          </div>
        )}

        {canAccessAdmin && (
          <div className="help-section">
            <h2>Admin Panel</h2>
            <div className="help-content">
              <div className="help-item">
                <h3>User Management</h3>
                <p>
                  Create and manage user accounts with role-based permissions. Assign users to schools or centers. 
                  Control access levels and manage user credentials. View users by role type for easy organization.
                </p>
              </div>

              <div className="help-item">
                <h3>Schools</h3>
                <p>
                  Add and configure schools in the system. Set up school details including name, address, and contact information. 
                  Manage school-specific settings and view school statistics.
                </p>
              </div>

              <div className="help-item">
                <h3>Centers</h3>
                <p>
                  Create and manage learning centers. Configure center details and settings. 
                  Monitor center operations and assign staff members.
                </p>
              </div>

              <div className="help-item">
                <h3>Teacher Assignments</h3>
                <p>
                  Assign teachers to specific schools and classes. Manage teaching assignments and workload distribution. 
                  View teacher schedules and class allocations.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="help-footer">
        <h3>Need More Help?</h3>
        <p>If you can't find what you're looking for or encounter any issues, please use the "Report an Issue" button above to let us know.</p>
      </div>

      <Modal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setReportForm({ section: '', subsections: [], title: '', description: '' });
        }}
        title="Report an Issue"
      >
        <form onSubmit={handleReportIssue} className="report-form">
          <div className="form-group">
            <label>
              Which section are you having issues with? <span className="required">*</span>
            </label>
            <select
              value={reportForm.section}
              onChange={(e) => setReportForm({ ...reportForm, section: e.target.value, subsections: [] })}
              required
            >
              <option value="">-- Select a section --</option>
              {canAccessSchool && <option value="school">School</option>}
              {canAccessCenter && <option value="center">Center</option>}
              {canAccessAdmin && <option value="admin">Admin Panel</option>}
              <option value="general">General</option>
            </select>
          </div>

          {reportForm.section && (
            <div className="form-group">
              <label>Specific areas affected (optional - select all that apply)</label>
              <div className="subsection-checkboxes">
                {subsectionOptions[reportForm.section]?.map(subsection => (
                  <label key={subsection} className="checkbox-label">
                    <div className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={reportForm.subsections.includes(subsection)}
                        onChange={() => handleSubsectionToggle(subsection)}
                      />
                    </div>
                    <div className="checkbox-text">
                      <span>{subsection}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>
              Issue title <span className="required">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Unable to save student attendance"
              value={reportForm.title}
              onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
              required
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label>
              Detailed description <span className="required">*</span>
            </label>
            <textarea
              placeholder="Please describe the issue in detail. Include what you were trying to do, what happened, and any error messages you saw..."
              value={reportForm.description}
              onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
              rows="6"
              required
              minLength={10}
            />
          </div>

          <button type="submit" className="btn-primary">
            Submit Issue Report
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Help;
