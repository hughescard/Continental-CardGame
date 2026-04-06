import type { RoundDefinition, RoundIndex, RoundRequirement } from '@/domain/types/rounds';

export const ROUND_INDEXES = [1, 2, 3, 4, 5, 6, 7, 8] as const satisfies readonly RoundIndex[];

const ROUND_REQUIREMENT_MAP: Record<RoundIndex, readonly RoundRequirement[]> = {
  1: [
    { meldType: 'trio', minimumLength: 3 },
    { meldType: 'trio', minimumLength: 3 },
  ],
  2: [
    { meldType: 'trio', minimumLength: 3 },
    { meldType: 'straight', minimumLength: 4 },
  ],
  3: [
    { meldType: 'straight', minimumLength: 4 },
    { meldType: 'straight', minimumLength: 4 },
  ],
  4: [
    { meldType: 'trio', minimumLength: 3 },
    { meldType: 'trio', minimumLength: 3 },
    { meldType: 'trio', minimumLength: 3 },
  ],
  5: [
    { meldType: 'trio', minimumLength: 3 },
    { meldType: 'trio', minimumLength: 3 },
    { meldType: 'straight', minimumLength: 4 },
  ],
  6: [
    { meldType: 'trio', minimumLength: 3 },
    { meldType: 'straight', minimumLength: 4 },
    { meldType: 'straight', minimumLength: 4 },
  ],
  7: [
    { meldType: 'straight', minimumLength: 4 },
    { meldType: 'straight', minimumLength: 4 },
    { meldType: 'straight', minimumLength: 4 },
  ],
  8: [
    { meldType: 'trio', minimumLength: 3 },
    { meldType: 'trio', minimumLength: 3 },
    { meldType: 'trio', minimumLength: 3 },
    { meldType: 'trio', minimumLength: 3 },
  ],
};

const ROUND_LABELS: Record<RoundIndex, string> = {
  1: 'Dos tríos',
  2: 'Un trío y una escalera',
  3: 'Dos escaleras',
  4: 'Tres tríos',
  5: 'Dos tríos y una escalera',
  6: 'Un trío y dos escaleras',
  7: 'Tres escaleras',
  8: 'Cuatro tríos',
};

function countCardsToDeal(requirements: readonly RoundRequirement[]) {
  return requirements.reduce((total, requirement) => total + requirement.minimumLength, 0) + 1;
}

export const ROUND_DEFINITIONS = ROUND_INDEXES.map((index) => ({
  index,
  label: ROUND_LABELS[index],
  requirements: ROUND_REQUIREMENT_MAP[index],
  cardsToDeal: countCardsToDeal(ROUND_REQUIREMENT_MAP[index]),
})) as readonly RoundDefinition[];

export function getRoundDefinition(roundIndex: RoundIndex): RoundDefinition {
  const definition = ROUND_DEFINITIONS.find((item) => item.index === roundIndex);

  if (!definition) {
    throw new Error(`Unsupported round index: ${roundIndex}`);
  }

  return definition;
}

export function getCardsToDealForRound(roundIndex: RoundIndex) {
  return getRoundDefinition(roundIndex).cardsToDeal;
}
