import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/datepicker.css';

const MonthPicker = ({ selected, onChange, placeholder, ...props }) => {
  return (
    <ReactDatePicker
      selected={selected}
      onChange={onChange}
      dateFormat="MMMM yyyy"
      placeholderText={placeholder || "Select month"}
      className="custom-datepicker-input"
      calendarClassName="custom-datepicker-calendar custom-monthpicker-calendar"
      showMonthYearPicker
      showFullMonthYearPicker
      withPortal
      portalId="monthpicker-portal"
      {...props}
    />
  );
};

export default MonthPicker;
