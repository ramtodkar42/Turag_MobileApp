// TURAG.AI assistant API.
// MOCK: returns canned replies until the backend is ready. Keep the same
// function name and params when switching to the real endpoint.

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const REPLIES = [
  {
    match: /worth buying|fairly priced|price/i,
    text: 'Of course! I can help you check if it’s worth it. Share the vehicle details or its inspection report, and I’ll compare its condition and asking price with similar vehicles.',
  },
  {
    match: /inspection|report/i,
    text: 'Share the inspection report and I’ll explain each finding in simple words, including what needs attention before you buy.',
  },
  {
    match: /compare/i,
    text: 'Sure! Tell me the two vehicles you want to compare and I’ll put their price, condition and running costs side by side.',
  },
  {
    match: /history/i,
    text: 'I can help you understand the vehicle’s history, inspection findings, and asking price. Share the inspection report or vehicle details to get started.',
  },
  {
    match: /check before buying/i,
    text: 'Before buying, check the documents (RC, insurance, PUC), service history, accident or repair signs, tyres, and take a test drive. A Turag inspection covers all of this for you.',
  },
  {
    match: /^(hi|hello|hey)/i,
    text: 'Hello, I’m fine. How can I help you?',
  },
];

const FALLBACK =
  'I can help you find a vehicle that fits your needs and budget, understand inspection reports, and check if a price is fair. What would you like to know?';

// message: { text, image } -> reply: { text }
export const sendChatMessage = async ({ text = '', image = null }) => {
  await wait(1200);
  if (image && !text) {
    return { text: 'Thanks for the photo! Tell me what you’d like to know about this vehicle.' };
  }
  const reply = REPLIES.find(r => r.match.test(text.trim()));
  return { text: reply ? reply.text : FALLBACK };
};
