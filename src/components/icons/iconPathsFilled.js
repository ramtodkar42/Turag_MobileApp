// Solid versions of icons (selected tab, saved heart) on the same 24x24 grid.
// `shape` is filled with the icon colour; `details` are drawn on top in white.
const iconPathsFilled = {
  store: {
    shape: 'M4.5 4h15L21 9v1a3 3 0 0 1-2 2.83V20H5v-7.17A3 3 0 0 1 3 10V9z',
    details: 'M3.5 9.5h17M10 20v-5h4v5',
  },
  document: {
    shape: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
    details: 'M14 2.5V8h5.5M8 13h8M8 17h8',
  },
  car: {
    shape: 'M3 17v-4l2.2-5.3A2 2 0 0 1 7 6.5h10a2 2 0 0 1 1.8 1.2L21 13v4h-3v2h-2.5v-2h-7v2H6v-2z',
    details: 'M4 13h16M7 15h.01M17 15h.01',
  },
  bookmark: {
    shape: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
  },
  user: {
    shape: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
    details: 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6.5 18.5a7 7 0 0 1 11 0',
  },
  play: { shape: 'M7 4l13 8-13 8z' },
  pause: { shape: 'M7 4h3v16H7zM14 4h3v16h-3z' },
  stop: { shape: 'M6 6h12v12H6z' },
  heart: {
    shape:
      'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  },
};

export default iconPathsFilled;
