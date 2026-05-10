export const MockRegistry = {
    // For manual testing conveniences based on user's known names
    'STU-1234': 'Harshitha R',
    'STU-5678': 'Ramesh K',
    'FAC-1234': 'Harshitha R', // Added for seamless Admin testing
    'FAC-5678': 'Ramesh K',    // Added for seamless Admin testing
    'FAC-9999': 'Admin User',
    'STU-1001': 'Alex Carter',
    'STU-1002': 'Jordan Lee'
};

/**
 * Validates if the provided fullName matches the official registry for the given entityId
 */
export const validateRegistryIdentity = (entityId, fullName) => {
    // Standardize inputs
    const id = entityId.toUpperCase().trim();
    const name = fullName.trim().toLowerCase();

    // 1. Check if ID follows standard protocol (STU-XXXX or FAC-XXXX)
    const isStandardId = id.startsWith('STU-') || id.startsWith('FAC-');

    if (!isStandardId) {
        return {
            valid: false,
            message: `Registry Error: ID "${id}" does not follow the official protocol. Please use "STU-XXXX" or "FAC-XXXX".`
        };
    }

    // 2. Flexible Name Matching (If ID is in MockRegistry, check name. Otherwise allow for testing)
    if (MockRegistry[id]) {
        const officialName = MockRegistry[id].toLowerCase();
        if (!name.includes(officialName) && !officialName.includes(name)) {
            return {
                valid: false,
                message: `Identity Mismatch: The Designation provided (${fullName}) does not match the official registry record for ID ${id}.`
            };
        }
    }

    return { valid: true, message: "Identity established via standard protocol." };
};
