import React, { useState, useEffect } from 'react';
import { api } from '../api';
import SelectField from '../components/SelectField';
import AdminPortal from './AdminPortal';

// Theme colors (Light mode, navy/dark blue + white)
const theme = {
  background: '#ffffff',        // whole app background
  card: '#ffffff',              // cards, forms
  border: '#e5e7eb',            // light gray border
  primary: '#ffffff',           // primary is white (per your design)
  accent: '#1e3a8a',            // dark navy accent
  text: '#111827',              // almost black for readability
  muted: '#6b7280',             // muted gray
  button: '#1e3a8a',            // navy buttons
  buttonText: '#ffffff',        // white text on buttons
  buttonSecondary: '#f9fafb',   // light gray (like Chrome inputs)
  buttonSecondaryText: '#111827'
};

// SearchableSelect component for school and university search
function SearchableSelect({ label, options, value, onChange, disabled, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState(options);

  useEffect(() => {
    if (searchTerm) {
      setFilteredOptions(options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } else {
      setFilteredOptions(options);
    }
  }, [searchTerm, options]);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div style={{ marginBottom: 12, position: 'relative', background: theme.card, borderRadius: 10, border: `1px solid ${theme.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <label style={{ color: theme.primary, fontWeight: 600 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={isOpen ? searchTerm : value}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          style={{ background: theme.buttonSecondary, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 16 }}
        />
        {isOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: theme.card, border: `1px solid ${theme.border}`, borderTop: 'none',
            borderRadius: '0 0 10px 10px', maxHeight: 220, overflowY: 'auto', zIndex: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  onMouseDown={() => handleSelect(option)}
                  style={{ padding: '10px 12px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', color: theme.text, background: theme.card, fontWeight: 500 }}
                >
                  {option}
                </div>
              ))
            ) : (
              <div style={{ padding: '10px 12px', color: theme.muted }}>No results found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegistrationFlow({ selectedPortal, onRegistrationComplete, onBack }) {
  const [currentStep, setCurrentStep] = useState('type-selection'); // type-selection, individual-form, batch-form, batch-count, admin
  const [registrationType, setRegistrationType] = useState(''); // individual, batch

  // Busy and message states
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // Data states
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [universities, setUniversities] = useState([]);

  // Individual form data
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [sex, setSex] = useState("");
  const [language, setLanguage] = useState("");

  // Batch form data
  const [batchType, setBatchType] = useState(""); // school, university, general
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [batchCount, setBatchCount] = useState(0);
  const [pendingBatchPayload, setPendingBatchPayload] = useState(null);

  // Store pending individual registration data
  const [pendingIndividualPayload, setPendingIndividualPayload] = useState(null);

  // -------- Data Loaders --------
  const loadDistricts = async (province) => {
    try {
      const res = await fetch('/data/districts_by_province.json');
      const json = await res.json();
      setDistricts(json[province] || []);
    } catch {
      setDistricts([]);
    }
  };

  const loadSchools = async (province, district) => {
    try {
      const url = `/data/schools/${encodeURIComponent(province)}/${encodeURIComponent(district)}.json`;
      const res = await fetch(url);
      const json = await res.json();
      setSchools(json);
    } catch {
      setSchools([]);
    }
  };

  const loadUniversities = async () => {
    try {
      const res = await fetch('/data/universities.json');
      const json = await res.json();
      setUniversities(json);
    } catch {
      setUniversities([]);
    }
  };

  // Auto-load effects
  useEffect(() => {
    if (selectedProvince) {
      loadDistricts(selectedProvince);
    } else {
      setDistricts([]);
    }
  }, [selectedProvince]);

  useEffect(() => {
    if (selectedProvince && selectedDistrict) {
      loadSchools(selectedProvince, selectedDistrict);
    } else {
      setSchools([]);
    }
  }, [selectedProvince, selectedDistrict]);

  useEffect(() => {
    loadUniversities();
  }, []);

  // ---- Logic (unchanged from your code) ----
  function handleTypeSelection(type) {
    setRegistrationType(type);
    if (type === 'individual') {
      setCurrentStep('individual-form');
    } else {
      setCurrentStep('batch-form');
    }
  }

  const handleLanguageToggle = (lang) => {
    setSelectedLanguages(prev => {
      if (prev.includes(lang)) {
        return prev.filter(l => l !== lang);
      } else if (prev.length < 2) {
        return [...prev, lang];
      }
      return prev;
    });
  };

  // ... [keep all your existing handleIndividualSubmit, handleBatchSubmit, handleRfidTap, handleBatchCountComplete, handleBack, renderTypeSelection, renderIndividualForm, renderBatchForm, renderBatchCount, renderCurrentStep functions exactly as you wrote them] ...

  return renderCurrentStep();
}
