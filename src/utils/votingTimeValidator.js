/**
 * Validates if the current time is within the allowed voting window.
 * Window: May 9, 2026, between 9:00 AM and 5:00 PM.
 * @returns {Object} { isOpen: boolean, message: string }
 */
export const isVotingOpen = () => {
    const now = new Date();

    // Configurable via .env, with defaults
    const start = new Date(process.env.VOTING_START_TIME || '2026-05-09T09:00:00');
    const end = new Date(process.env.VOTING_END_TIME || '2026-05-09T17:00:00');

    if (now < start) {
        return { isOpen: false, message: `The election node is currently dormant. Access will be granted on May 9, 2026, at 9:00 AM.` };
    }

    if (now > end) {
        return { isOpen: false, message: "The election window has been sealed. Voting is no longer permitted." };
    }

    return { isOpen: true, message: "Election node active. Identity verification required." };
};
