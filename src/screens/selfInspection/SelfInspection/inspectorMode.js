import { createContext, useContext } from 'react';

// The same capture screen serves the customer's self-inspection (M1) and the
// inspection officer's doorstep inspection (M2) - as the web, whose inspector
// capture is the "M2 feature-equivalent" of M1. This says which one is open,
// for the few parts that differ (wording, the 10 "can't check" reasons, what
// happens after submit).
export const InspectorModeContext = createContext(false);

export const useInspectorMode = () => useContext(InspectorModeContext);
