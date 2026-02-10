import { useAuth } from '../context/AuthContext';
import { useNotificationContext } from '../context/NotificationContext';

/**
 * Hook to check edit permissions and show appropriate error messages
 * @returns {Object} - { canEdit: boolean, checkEdit: function }
 */
export const useEditMode = () => {
  const { canEdit } = useAuth();
  const { showError } = useNotificationContext();

  /**
   * Check if user can edit and show error if not
   * @returns {boolean} - true if can edit, false otherwise
   */
  const checkEdit = () => {
    const allowed = canEdit();
    if (!allowed) {
      showError('You must enable Edit Mode to make changes');
    }
    return allowed;
  };

  return {
    canEdit: canEdit(),
    checkEdit
  };
};
