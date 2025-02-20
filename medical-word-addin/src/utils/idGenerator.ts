let idCounter = 0;

export const generateId = (prefix = 'id') => {
  return `${prefix}-${idCounter++}`;
}; 