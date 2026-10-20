// Mobile number validation and formatting for South Africa

// Joins a dial code ("+27") and a locally typed number ("064 556 9024") into E.164.
// Drops spaces/dashes and the local trunk "0" so "+27" + "0645569024" becomes
// "+27645569024", not "+270645569024". A number typed with its own "+" is kept as-is.
export const joinInternationalPhone = (countryCode: string, phone: string): string => {
  const typed = phone.trim();
  const digits = typed.replace(/\D/g, '');
  if (typed.startsWith('+')) return `+${digits}`;
  const dial = countryCode.replace(/\D/g, '');
  return `+${dial}${digits.replace(/^0+/, '')}`;
};

export const formatMobileNumber = (mobile: string): string => {
  // Remove all non-digit characters
  const cleaned = mobile.replace(/\D/g, '');
  
  // Handle different SA mobile number formats
  if (cleaned.startsWith('27')) {
    // Already has country code: +27 XX XXX XXXX
    return `+${cleaned}`;
  } else if (cleaned.startsWith('0')) {
    // Local format: 0XX XXX XXXX -> +27 XX XXX XXXX
    return `+27${cleaned.substring(1)}`;
  } else if (cleaned.length === 9) {
    // Missing leading zero: XX XXX XXXX -> +27 XX XXX XXXX
    return `+27${cleaned}`;
  }
  
  return mobile; // Return as-is if format is unclear
};

export const validateMobileNumber = (mobile: string): { isValid: boolean; error?: string } => {
  const cleaned = mobile.replace(/\D/g, '');
  
  // Check if it's a valid SA mobile number
  if (cleaned.startsWith('27')) {
    // +27 format
    if (cleaned.length !== 11) {
      return { isValid: false, error: 'Mobile number must be 11 digits with country code' };
    }
    const withoutCountryCode = cleaned.substring(2);
    if (!withoutCountryCode.startsWith('6') && !withoutCountryCode.startsWith('7') && !withoutCountryCode.startsWith('8')) {
      return { isValid: false, error: 'Invalid SA mobile number format' };
    }
  } else if (cleaned.startsWith('0')) {
    // 0XX format
    if (cleaned.length !== 10) {
      return { isValid: false, error: 'Mobile number must be 10 digits starting with 0' };
    }
    if (!cleaned.startsWith('06') && !cleaned.startsWith('07') && !cleaned.startsWith('08')) {
      return { isValid: false, error: 'Invalid SA mobile number format' };
    }
  } else if (cleaned.length === 9) {
    // XX XXX XXXX format
    if (!cleaned.startsWith('6') && !cleaned.startsWith('7') && !cleaned.startsWith('8')) {
      return { isValid: false, error: 'Invalid SA mobile number format' };
    }
  } else {
    return { isValid: false, error: 'Please enter a valid South African mobile number' };
  }
  
  return { isValid: true };
};

export const displayMobileNumber = (mobile: string): string => {
  const cleaned = mobile.replace(/\D/g, '');
  
  if (cleaned.startsWith('27')) {
    // +27 XX XXX XXXX
    const withoutCountryCode = cleaned.substring(2);
    return `+27 ${withoutCountryCode.substring(0, 2)} ${withoutCountryCode.substring(2, 5)} ${withoutCountryCode.substring(5)}`;
  } else if (cleaned.startsWith('0')) {
    // 0XX XXX XXXX
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  }
  
  return mobile;
};

// Address validation helpers
export const validateAddress = (address: {
  street_address: string;
  local_area: string;
  city: string;
  zone: string;
  code: string;
  country: string;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!address.street_address.trim()) {
    errors.push('Street address is required');
  }
  
  if (!address.city.trim()) {
    errors.push('City is required');
  }
  
  if (!address.zone.trim()) {
    errors.push('Province is required');
  }
  
  if (!address.code.trim()) {
    errors.push('Postal code is required');
  }
  
  if (address.country !== 'ZA') {
    errors.push('Country must be South Africa (ZA)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Pickup point validation
export const validatePickupPoint = (point: {
  id: string;
  name: string;
  street_address: string;
  local_area: string;
  city: string;
  zone: string;
  code: string;
  country: string;
  lat: number;
  lng: number;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!point.id) {
    errors.push('Pickup point ID is required');
  }
  
  if (!point.name.trim()) {
    errors.push('Pickup point name is required');
  }
  
  if (!point.street_address.trim()) {
    errors.push('Pickup point address is required');
  }
  
  if (!point.local_area.trim()) {
    errors.push('Pickup point suburb is required');
  }
  
  if (!point.city.trim()) {
    errors.push('Pickup point city is required');
  }
  
  if (!point.zone.trim()) {
    errors.push('Pickup point province is required');
  }
  
  if (!point.code.trim()) {
    errors.push('Pickup point postal code is required');
  }
  
  if (point.country !== 'ZA') {
    errors.push('Pickup point country must be South Africa (ZA)');
  }
  
  if (!point.lat || !point.lng) {
    errors.push('Pickup point coordinates are required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
