export const TASK_NAME_PLACEHOLDERS = [
  "Choose what to do next",
  "What would you like to do?",
  "Where to start?",
  // "What would you like to accomplish next?",
] as const;

let shuffledIndices: number[] = [];
let lastPlaceholderIndex = -1;

function shufflePlaceholderIndices(excludeFirst?: number) {
  shuffledIndices = TASK_NAME_PLACEHOLDERS.map((_, index) => index);

  for (let index = shuffledIndices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledIndices[index], shuffledIndices[swapIndex]] = [
      shuffledIndices[swapIndex],
      shuffledIndices[index],
    ];
  }

  if (
    excludeFirst !== undefined &&
    shuffledIndices.length > 1 &&
    shuffledIndices[0] === excludeFirst
  ) {
    [shuffledIndices[0], shuffledIndices[1]] = [
      shuffledIndices[1],
      shuffledIndices[0],
    ];
  }
}

/** Returns the next random placeholder, cycling through all options before repeating. */
export function nextTaskNamePlaceholder(): string {
  if (shuffledIndices.length === 0) {
    shufflePlaceholderIndices(lastPlaceholderIndex);
  }

  const index = shuffledIndices.shift() ?? 0;
  lastPlaceholderIndex = index;
  return TASK_NAME_PLACEHOLDERS[index];
}
