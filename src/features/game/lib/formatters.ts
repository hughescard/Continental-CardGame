import type { CardInstance } from '@/domain/types/cards';
import type { LobbyPlayer } from '@/application/models/lobby';

const SUIT_META: Record<CardInstance['suit'], { symbol: string; label: string }> = {
  clubs: { symbol: '♣', label: 'Tréboles' },
  diamonds: { symbol: '♦', label: 'Diamantes' },
  hearts: { symbol: '♥', label: 'Corazones' },
  spades: { symbol: '♠', label: 'Picas' },
  joker: { symbol: '★', label: 'Joker' },
};

export function getSuitMeta(suit: CardInstance['suit']) {
  return SUIT_META[suit];
}

export function describeCardCompact(card: CardInstance) {
  const suitMeta = getSuitMeta(card.suit);
  return `${card.rank}${suitMeta.symbol}`;
}

export function describeCardDetail(card: CardInstance) {
  const suitMeta = getSuitMeta(card.suit);
  return `${card.rank} de ${suitMeta.label}`;
}

export function getPlayerName(
  playerId: string,
  players: readonly LobbyPlayer[],
  currentUserId?: string | null,
) {
  const player = players.find((item) => item.id === playerId);

  if (!player) {
    return currentUserId === playerId ? 'Tú' : playerId;
  }

  return currentUserId === playerId ? `${player.displayName} · Tú` : player.displayName;
}

export function describeRoundRequirement(
  requirements:
    | readonly {
        meldType: 'trio' | 'straight';
        minimumLength: number;
      }[]
    | undefined,
) {
  if (!requirements?.length) {
    return 'Cargando requisito de ronda...';
  }

  const trioCount = requirements.filter((requirement) => requirement.meldType === 'trio').length;
  const straightCount = requirements.filter(
    (requirement) => requirement.meldType === 'straight',
  ).length;

  const parts: string[] = [];

  if (trioCount > 0) {
    parts.push(`${trioCount} ${trioCount === 1 ? 'trío' : 'tríos'}`);
  }

  if (straightCount > 0) {
    parts.push(`${straightCount} ${straightCount === 1 ? 'escalera' : 'escaleras'}`);
  }

  if (parts.length === 0) {
    return 'Combinación por definir';
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}`;
}
