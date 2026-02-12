import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/datepicker.css';

const DatePicker = ({ selected, onChange, placeholder, required, ...props }) => {
  return (
    <ReactDatePicker
      selected={selected}
      onChange={onChange}
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholder || "Select date"}
      className="custom-datepicker-input"
      calendarClassName="custom-datepicker-calendar"
      required={required}
      showYearDropdown
      showMonthDropdown
      dropdownMode="select"
      withPortal
      portalId="datepicker-portal"
      {...props}
    />
  );
};

export default DatePicker;
