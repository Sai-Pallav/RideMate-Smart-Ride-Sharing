import React, { useRef, useState, useEffect } from 'react';

/**
 * Reusable OtpInput Component
 * Implements 6 focus-advancing input fields for OTP verification.
 */
export default function OtpInput({
  length = 6,
  onChange,
  error = false,
  disabled = false
}) {
  const [code, setCode] = useState(new Array(length).fill(''));
  const inputsRef = useRef([]);

  // Clear inputs if error triggers
  useEffect(() => {
    if (error) {
      setCode(new Array(length).fill(''));
      if (inputsRef.current[0]) {
        inputsRef.current[0].focus();
      }
    }
  }, [error, length]);

  const handleChange = (e, index) => {
    const val = e.target.value;
    if (isNaN(val)) return; // Allow numbers only

    const newCode = [...code];
    // Take only the last character typed
    newCode[index] = val.substring(val.length - 1);
    setCode(newCode);

    const completeCode = newCode.join('');
    if (onChange) {
      onChange(completeCode);
    }

    // Auto-advance to next input if filled
    if (val && index < length - 1) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // Backspace: clear current box or move back if empty
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputsRef.current[index - 1].focus();
        if (onChange) {
          onChange(newCode.join(''));
        }
      } else {
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
        if (onChange) {
          onChange(newCode.join(''));
        }
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    if (disabled) return;
    
    const pasteData = e.clipboardData.getData('text').trim();
    if (isNaN(pasteData)) return; // Only allow numbers

    const pasteCode = pasteData.substring(0, length).split('');
    const newCode = [...code];
    
    for (let i = 0; i < length; i++) {
      if (pasteCode[i]) {
        newCode[i] = pasteCode[i];
      }
    }
    
    setCode(newCode);
    if (onChange) {
      onChange(newCode.join(''));
    }

    // Focus last filled digit input or the last box
    const focusIdx = Math.min(pasteCode.length, length - 1);
    if (inputsRef.current[focusIdx]) {
      inputsRef.current[focusIdx].focus();
    }
  };

  return (
    <div className="flex justify-between gap-2 max-w-sm mx-auto" onPaste={handlePaste}>
      {code.map((num, idx) => (
        <input
          key={idx}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={num}
          disabled={disabled}
          ref={(el) => (inputsRef.current[idx] = el)}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          className={`
            w-12 h-14 text-center text-xl font-bold bg-brand-bg-card text-brand-text-primary
            border rounded-xl transition duration-200 select-all outline-none min-w-[44px] min-h-[44px]
            ${error
              ? 'border-brand-safety focus:border-brand-safety focus:ring-1 focus:ring-brand-safety'
              : num 
                ? 'border-brand-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50' 
                : 'border-slate-800 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50'
            }
            ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:border-slate-700'}
          `}
        />
      ))}
    </div>
  );
}
