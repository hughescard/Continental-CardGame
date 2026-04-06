import { STANDARD_SUITS } from '@/domain/constants/cards';
import { getRoundDefinition } from '@/domain/constants/rounds';
import {
  asNaturalRank,
  asStandardSuit,
  getNaturalRankFromCyclicIndex,
  isJoker,
  isRedAce,
} from '@/domain/cards/helpers';
import type {
  CardInstance,
  NaturalRank,
  ResolvedCard,
  StandardSuit,
} from '@/domain/types/cards';
import type {
  MeldValidationResult,
  RoundMeldValidationResult,
  StraightMeld,
  TableMeld,
  TrioMeld,
} from '@/domain/types/melds';
import type { RoundRequirement } from '@/domain/types/rounds';

function buildInvalidResult<TType extends 'trio' | 'straight'>(
  type: TType,
  cards: readonly CardInstance[],
  reason: string,
): MeldValidationResult<TType> {
  return {
    type,
    isValid: false,
    cardCount: cards.length,
    naturalCount: 0,
    wildcardCount: 0,
    resolvedCards: [],
    reason,
  };
}

function buildValidResult<TType extends 'trio' | 'straight'>(
  type: TType,
  cards: readonly CardInstance[],
  resolvedCards: readonly ResolvedCard[],
  naturalCount: number,
  wildcardCount: number,
): MeldValidationResult<TType> {
  return {
    type,
    isValid: true,
    cardCount: cards.length,
    naturalCount,
    wildcardCount,
    resolvedCards,
  };
}

export function validateTrio(cards: readonly CardInstance[]): MeldValidationResult<'trio'> {
  if (cards.length < 3) {
    return buildInvalidResult('trio', cards, 'A trio requires at least 3 cards.');
  }

  const jokers = cards.filter(isJoker);
  const redAces = cards.filter(isRedAce);
  const fixedNaturals = cards.filter((card) => !isJoker(card) && !isRedAce(card));
  const naturalRanks = [...new Set(fixedNaturals.map((card) => asNaturalRank(card.rank)))];

  if (naturalRanks.length > 1) {
    return buildInvalidResult(
      'trio',
      cards,
      'Natural cards in a trio must all have the same rank.',
    );
  }

  const candidateRank =
    naturalRanks[0] ?? (redAces.length > 0 ? ('A' as NaturalRank) : undefined);

  if (!candidateRank) {
    return buildInvalidResult(
      'trio',
      cards,
      'A trio cannot be formed only with jokers; at least one natural card is required.',
    );
  }

  const redAcesAsNatural = candidateRank === 'A' ? redAces : [];
  const redAcesAsWildcard = candidateRank === 'A' ? [] : redAces;
  const naturalCards = [...fixedNaturals, ...redAcesAsNatural];
  const wildcardCards = [...jokers, ...redAcesAsWildcard];

  if (wildcardCards.length > naturalCards.length) {
    return buildInvalidResult(
      'trio',
      cards,
      'A meld cannot contain more wildcards than natural cards.',
    );
  }

  const resolvedCards: ResolvedCard[] = [
    ...naturalCards.map((card) => ({
      card,
      behavior: 'natural' as const,
      representedRank: candidateRank,
      representedSuit: isJoker(card) ? null : asStandardSuit(card.suit),
      sequenceIndex: null,
    })),
    ...wildcardCards.map((card) => ({
      card,
      behavior: 'wildcard' as const,
      representedRank: candidateRank,
      representedSuit: null,
      sequenceIndex: null,
    })),
  ];

  return buildValidResult(
    'trio',
    cards,
    resolvedCards,
    naturalCards.length,
    wildcardCards.length,
  );
}

function getSequenceRanks(length: number, startIndex: number): NaturalRank[] {
  return Array.from({ length }, (_, offset) => getNaturalRankFromCyclicIndex(startIndex + offset));
}

function areWildcardPositionsConsecutive(positions: readonly number[]): boolean {
  return positions.some((position, index) => {
    if (index === 0) {
      return false;
    }

    return positions[index - 1] === position - 1;
  });
}

function tryValidateStraightForSuit(
  cards: readonly CardInstance[],
  targetSuit: StandardSuit,
): MeldValidationResult<'straight'> | null {
  const straightLength = cards.length;
  const fixedNaturals = cards.filter((card) => !isJoker(card) && !isRedAce(card));

  if (fixedNaturals.some((card) => card.suit !== targetSuit)) {
    return null;
  }

  const matchingSuitRedAces = cards.filter(
    (card) => isRedAce(card) && card.suit === targetSuit,
  );
  const otherWildcardCards = cards.filter(
    (card) => isJoker(card) || (isRedAce(card) && card.suit !== targetSuit),
  );

  for (let startIndex = 0; startIndex < 13; startIndex += 1) {
    const sequenceRanks = getSequenceRanks(straightLength, startIndex);
    const sequenceIndexByRank = new Map(sequenceRanks.map((rank, index) => [rank, index]));
    const occupiedByNatural = new Map<number, CardInstance>();
    let fixedNaturalsFit = true;

    for (const card of fixedNaturals) {
      const sequenceIndex = sequenceIndexByRank.get(asNaturalRank(card.rank));

      if (sequenceIndex === undefined || occupiedByNatural.has(sequenceIndex)) {
        fixedNaturalsFit = false;
        break;
      }

      occupiedByNatural.set(sequenceIndex, card);
    }

    if (!fixedNaturalsFit) {
      continue;
    }

    const aceSequenceIndex = sequenceIndexByRank.get('A');
    const redAceNaturalOptions =
      aceSequenceIndex !== undefined && !occupiedByNatural.has(aceSequenceIndex)
        ? [1, 0]
        : [0];

    for (const naturalRedAceCount of redAceNaturalOptions) {
      const naturalRedAces = matchingSuitRedAces.slice(0, naturalRedAceCount);
      const wildcardCards = [
        ...otherWildcardCards,
        ...matchingSuitRedAces.slice(naturalRedAceCount),
      ];
      const occupiedIndices = new Map(occupiedByNatural);

      if (naturalRedAceCount === 1 && aceSequenceIndex !== undefined) {
        const naturalRedAce = naturalRedAces[0];

        if (!naturalRedAce) {
          continue;
        }

        occupiedIndices.set(aceSequenceIndex, naturalRedAce);
      }

      const wildcardPositions: number[] = [];

      for (let index = 0; index < straightLength; index += 1) {
        if (!occupiedIndices.has(index)) {
          wildcardPositions.push(index);
        }
      }

      if (wildcardCards.length !== wildcardPositions.length) {
        continue;
      }

      const naturalCount = occupiedIndices.size;
      const wildcardCount = wildcardCards.length;

      if (wildcardCount > naturalCount) {
        continue;
      }

      if (areWildcardPositionsConsecutive(wildcardPositions)) {
        continue;
      }

      const resolvedCards: ResolvedCard[] = [];

      for (const [sequenceIndex, naturalCard] of occupiedIndices.entries()) {
        const representedRank = sequenceRanks[sequenceIndex];

        if (!representedRank) {
          continue;
        }

        resolvedCards.push({
          card: naturalCard,
          behavior: 'natural',
          representedRank,
          representedSuit: targetSuit,
          sequenceIndex,
        });
      }

      wildcardCards.forEach((card, index) => {
        const sequenceIndex = wildcardPositions[index];
        const representedRank =
          sequenceIndex === undefined ? undefined : sequenceRanks[sequenceIndex];

        if (sequenceIndex === undefined || !representedRank) {
          return;
        }

        resolvedCards.push({
          card,
          behavior: 'wildcard',
          representedRank,
          representedSuit: targetSuit,
          sequenceIndex,
        });
      });

      resolvedCards.sort((left, right) => {
        const leftIndex = left.sequenceIndex ?? Number.MAX_SAFE_INTEGER;
        const rightIndex = right.sequenceIndex ?? Number.MAX_SAFE_INTEGER;
        return leftIndex - rightIndex || left.card.id.localeCompare(right.card.id);
      });

      return buildValidResult(
        'straight',
        cards,
        resolvedCards,
        naturalCount,
        wildcardCount,
      );
    }
  }

  return null;
}

export function validateStraight(
  cards: readonly CardInstance[],
): MeldValidationResult<'straight'> {
  if (cards.length < 4) {
    return buildInvalidResult('straight', cards, 'A straight requires at least 4 cards.');
  }

  if (cards.length > 13) {
    return buildInvalidResult(
      'straight',
      cards,
      'A cyclic straight cannot contain more than 13 cards.',
    );
  }

  for (const suit of STANDARD_SUITS) {
    const validation = tryValidateStraightForSuit(cards, suit);

    if (validation) {
      return validation;
    }
  }

  return buildInvalidResult(
    'straight',
    cards,
    'Cards do not form a valid straight for any suit under the wildcard rules.',
  );
}

export function validateMeld(meld: TableMeld): MeldValidationResult {
  if (meld.type === 'trio') {
    return validateTrio(meld.cards);
  }

  return validateStraight(meld.cards);
}

function canRequirementAcceptMeld(
  requirement: RoundRequirement,
  meldResult: MeldValidationResult,
): boolean {
  return meldResult.type === requirement.meldType && meldResult.cardCount >= requirement.minimumLength;
}

function matchRequirementsExactly(
  requirements: readonly RoundRequirement[],
  meldResults: readonly MeldValidationResult[],
  usedMeldIndexes = new Set<number>(),
  requirementIndex = 0,
): boolean {
  if (requirementIndex === requirements.length) {
    return usedMeldIndexes.size === meldResults.length;
  }

  const requirement = requirements[requirementIndex];

  if (!requirement) {
    return false;
  }

  for (let meldIndex = 0; meldIndex < meldResults.length; meldIndex += 1) {
    if (usedMeldIndexes.has(meldIndex)) {
      continue;
    }

    const meldResult = meldResults[meldIndex];

    if (!meldResult) {
      continue;
    }

    if (!canRequirementAcceptMeld(requirement, meldResult)) {
      continue;
    }

    usedMeldIndexes.add(meldIndex);

    if (
      matchRequirementsExactly(
        requirements,
        meldResults,
        usedMeldIndexes,
        requirementIndex + 1,
      )
    ) {
      return true;
    }

    usedMeldIndexes.delete(meldIndex);
  }

  return false;
}

export function validateRoundMeldSet(
  melds: readonly TableMeld[],
  roundIndex: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
): RoundMeldValidationResult {
  const definition = getRoundDefinition(roundIndex);
  const meldResults = melds.map(validateMeld);

  if (melds.length !== definition.requirements.length) {
    return {
      roundIndex,
      definition,
      isValid: false,
      meldResults,
      reason: 'The round requires an exact number of melds.',
    };
  }

  const invalidMeld = meldResults.find((result) => !result.isValid);

  if (invalidMeld) {
    return {
      roundIndex,
      definition,
      isValid: false,
      meldResults,
      reason: invalidMeld.reason ?? 'One or more melds are invalid.',
    };
  }

  if (!matchRequirementsExactly(definition.requirements, meldResults)) {
    return {
      roundIndex,
      definition,
      isValid: false,
      meldResults,
      reason: 'The meld set does not match the exact round requirement.',
    };
  }

  return {
    roundIndex,
    definition,
    isValid: true,
    meldResults,
  };
}

export function isValidTrio(cards: readonly CardInstance[]): boolean {
  return validateTrio(cards).isValid;
}

export function isValidStraight(cards: readonly CardInstance[]): boolean {
  return validateStraight(cards).isValid;
}

export function isValidMeld(meld: TrioMeld | StraightMeld): boolean {
  return validateMeld(meld).isValid;
}
