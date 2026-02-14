import { useState, useEffect } from 'react';

const PhoneInput = ({ value, onChange, required, placeholder }) => {
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Country-specific phone number lengths
  const phoneConfig = {
    '+91': { length: 10, name: 'India' },
    '+1': { length: 10, name: 'USA/Canada' },
    '+44': { length: 10, name: 'UK' },
    '+61': { length: 9, name: 'Australia' },
    '+971': { length: 9, name: 'UAE' },
    '+65': { length: 8, name: 'Singapore' },
    '+60': { length: 9, name: 'Malaysia' },
    '+86': { length: 11, name: 'China' },
    '+81': { length: 10, name: 'Japan' },
    '+82': { length: 10, name: 'South Korea' }
  };

  // Parse existing value on mount or when value changes
  useEffect(() => {
    if (value) {
      // Check if value already has country code
      const match = value.match(/^(\+\d{1,4})\s?(.*)$/);
      if (match) {
        setCountryCode(match[1]);
        setPhoneNumber(match[2]);
      } else {
        setPhoneNumber(value);
      }
    }
  }, [value]);

  const handleCountryCodeChange = (e) => {
    const code = e.target.value;
    setCountryCode(code);
    // Clear phone number when country changes to avoid invalid format
    setPhoneNumber('');
    onChange('');
  };

  const handlePhoneChange = (e) => {
    const phone = e.target.value.replace(/[^\d]/g, ''); // Only digits
    const maxLength = phoneConfig[countryCode]?.length || 15;
    
    // Limit to max length for selected country
    if (phone.length <= maxLength) {
      setPhoneNumber(phone);
      if (phone) {
        onChange(`${countryCode} ${phone}`);
      } else {
        onChange('');
      }
    }
  };

  const currentConfig = phoneConfig[countryCode];
  const isValidLength = phoneNumber.length === currentConfig?.length;

  return (
    <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
      <select 
        value={countryCode} 
        onChange={handleCountryCodeChange}
        style={{ 
          width: '110px',
          padding: '10px 8px',
          border: '2px solid #e2e8f0',
          borderRadius: '10px',
          fontSize: '1rem',
          background: 'white'
        }}
      >
        <option value="+91">🇮🇳 +91</option>
        <option value="+1">🇺🇸 +1</option>
        <option value="+44">🇬🇧 +44</option>
        <option value="+61">🇦🇺 +61</option>
        <option value="+971">🇦🇪 +971</option>
        <option value="+65">🇸🇬 +65</option>
        <option value="+60">🇲🇾 +60</option>
        <option value="+86">🇨🇳 +86</option>
        <option value="+81">🇯🇵 +81</option>
        <option value="+82">🇰🇷 +82</option>
      </select>
      <div style={{ position: 'relative', flex: 1 }}>
        <input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder={placeholder || `Enter ${currentConfig?.length} digit number`}
          required={required}
          pattern={`\\d{${currentConfig?.length}}`}
          title={`Please enter exactly ${currentConfig?.length} digits for ${currentConfig?.name}`}
          style={{ 
            width: '100%',
            padding: '10px 12px',
            border: `2px solid ${phoneNumber && !isValidLength ? '#ef4444' : '#e2e8f0'}`,
            borderRadius: '10px',
            fontSize: '1rem'
          }}
        />
        {phoneNumber && !isValidLength && (
          <span style={{ 
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '0.75rem', 
            color: '#ef4444',
            marginBottom: '2px',
            whiteSpace: 'nowrap'
          }}>
            Must be exactly {currentConfig?.length} digits
          </span>
        )}
      </div>
    </div>
  );
};

export default PhoneInput;
