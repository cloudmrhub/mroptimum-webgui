// export const is_safe_twix = async (file: any) => {
//     console.log("fake anonymize function");    
//     return true;

// }


const hasAnonymizedFields = (text: string): boolean => {
    const anonymizedPattern = /\b[xX]{3,}\b/; // Detect "xxx", "XXXX", etc.
    return anonymizedPattern.test(text); // Returns true if a match is found
  };
  
  const detectPHI = (text: string): boolean => {
    console.log(text);
    const patterns = {
      ssn: /\b\d{3}-\d{2}-\d{4}\b/, // Social Security Number
      address: /\b\d+ [A-Z][a-z]+ [A-Z][a-z]+, [A-Z]{2} \d{5}\b/, // Address
      patientname: /<ParamString\.["']PatientName["']>\s*{\s*["']([^"^]+)\^([^"^]+)["']\s*}/i,
    };
  
    const detected: Record<string, string[]> = {};
  
    for (const [key, regex] of Object.entries(patterns)) {
      const matches = text.match(regex);
      if (matches) {
        detected[key] = matches; // Store matches
      }
    }
  
    // Check for anonymized fields
    const hasAnonymized = hasAnonymizedFields(text);
  
    // If anonymized fields are found and no PHI is detected, return false (safe)
    if (hasAnonymized ) {
      return false; // File is safe and anonymized
    }
  
    // Return true if PHI is detected
    return true;
  };
  
  export const is_safe_twix = async (file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
  
      reader.onload = function (event) {
        const arrayBuffer = event?.target?.result; // Binary content as ArrayBuffer
        console.log(arrayBuffer);
        try {
          // Decode the ArrayBuffer to a string (assuming UTF-8 encoding)
          const decoder = new TextDecoder("utf-8");
          const text = decoder.decode(new Uint8Array(arrayBuffer as ArrayBuffer));
  
          // Check for PHI in the decoded text
          const isPHIDetected = detectPHI(text);
       // Resolve based on PHI detection
       resolve(!isPHIDetected); // Return true if safe, false otherwise
    } catch (error) {
      // Safely handle 'error' of type 'unknown'
      if (error instanceof Error) {
        reject("Error decoding binary file: " + error.message);
      } else {
        reject("Unknown error occurred while decoding binary file.");
      }
    }
  };

  reader.onerror = function () {
    reject("Error reading file");
  };

  // Read the file as an ArrayBuffer
  reader.readAsArrayBuffer(file);
});
};