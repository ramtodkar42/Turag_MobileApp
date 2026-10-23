// One AI-read value and how the user settled it (as the web's ocr-confirm):
//   PENDING   - nothing read yet
//   DETECTED  - the AI read a value; waits for Yes / Edit
//   CONFIRMED - the user said Yes
//   MANUAL    - the user types it (Edit, or nothing could be read)
// Nothing the AI reads is saved until it's confirmed or typed.

export const initOcr = () => ({ status: 'PENDING', detected: null, value: '' });

// An empty / "UNKNOWN" read becomes MANUAL with an empty value - never a guess.
export const applyOcr = detected => {
  const clean = String(detected ?? '').trim();
  if (clean === '' || clean.toUpperCase() === 'UNKNOWN') {
    return { status: 'MANUAL', detected: null, value: '' };
  }
  return { status: 'DETECTED', detected: clean, value: clean };
};

export const confirmOcr = state => (state.status === 'DETECTED' ? { ...state, status: 'CONFIRMED' } : state);

export const editOcr = state => (state.status === 'PENDING' ? state : { ...state, status: 'MANUAL' });

export const typeOcr = (state, value) => ({ ...state, status: 'MANUAL', value });

export const isOcrDone = state =>
  state.status === 'CONFIRMED' || (state.status === 'MANUAL' && state.value.trim() !== '');
