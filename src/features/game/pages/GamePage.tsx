import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CardInstance } from '@/domain/types/cards';
import type { GameActionKey } from '@/features/game/hooks/useRealtimeGame';
import { useRealtimeGame } from '@/features/game/hooks/useRealtimeGame';
import { GameActionButton } from '@/features/game/components/GameActionButton';
import { GameHandCard } from '@/features/game/components/GameHandCard';
import { GameMeldCard } from '@/features/game/components/GameMeldCard';
import { GameNotice } from '@/features/game/components/GameNotice';
import { GameSeat } from '@/features/game/components/GameSeat';
import { TableDeckStack } from '@/features/game/components/TableDeckStack';
import { useSessionStore } from '@/store/session/session-store';
import { MusicToggleButton } from '@/shared/ui/audio/MusicToggleButton';
import {
  describeCardCompact,
  describeCardDetail,
  getPlayerName,
} from '@/features/game/lib/formatters';
import { cn } from '@/shared/lib/cn';

const PHASE_LABELS = {
  playing: 'En juego',
  scoring: 'Ronda terminada',
  finished: 'Partida finalizada',
} as const;

const TURN_PHASE_LABELS = {
  'awaiting-draw': 'Roba',
  'awaiting-melds': 'Juega',
  'awaiting-discard': 'Descarta',
  'awaiting-out-of-turn-claim': 'Reclamo',
  completed: 'Listo',
} as const;

function LoadingSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="game-panel h-16 animate-pulse rounded-[1.4rem]" />
      <div className="game-hero h-[30rem] animate-pulse rounded-[2rem] border border-line/70" />
    </div>
  );
}

function formatTurnPhase(turnPhase: keyof typeof TURN_PHASE_LABELS | undefined) {
  if (!turnPhase) {
    return 'Sincronizando';
  }

  return TURN_PHASE_LABELS[turnPhase];
}

function formatGamePhase(phase: keyof typeof PHASE_LABELS | undefined) {
  if (!phase) {
    return 'Cargando';
  }

  return PHASE_LABELS[phase];
}

export function GamePage() {
  const { roomId = 'UNKNOWN' } = useParams();
  const navigate = useNavigate();
  const game = useRealtimeGame(roomId);
  const setLastVisitedRoomId = useSessionStore((state) => state.setLastVisitedRoomId);
  const [isHandCollapsed, setIsHandCollapsed] = useState(false);
  const [isActionsCollapsed, setIsActionsCollapsed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const actionHandlers: Record<GameActionKey, () => void> = {
    'draw-deck': () => void game.drawFromDeck(),
    'draw-discard': () => void game.drawFromDiscard(),
    discard: () => void game.discardSelectedCard(),
    'draft-meld': () => game.addDraftMeld(),
    'initial-down': () => void game.submitInitialDown(),
    'add-to-meld': () => void game.addSelectedCardsToMeld(),
    'claim-out-of-turn': () => void game.claimOutOfTurnDiscard(),
    'reject-out-of-turn': () => void game.rejectOutOfTurnDiscard(),
    'advance-turn': () => void game.advanceTurn(),
  };

  const currentPlayerCardCount = game.privateState?.hand.length ?? 0;
  const playersList = game.players.length ? game.players : [];
  const roomLabel = game.room?.code ? `Mesa ${game.room.code}` : `Mesa ${roomId}`;
  const currentTurnPhaseLabel = formatTurnPhase(game.publicState?.turnPhase);
  const currentPhaseLabel = formatGamePhase(game.publicState?.phase);

  const handCardMap = useMemo(
    () =>
      new Map(
        (game.privateState?.hand ?? []).map((card) => [card.id, card] as const),
      ),
    [game.privateState?.hand],
  );

  const draftPreview = useMemo(
    () =>
      game.initialDownDraft.map((meld, index) => ({
        id: meld.id,
        label:
          game.draftKindById[meld.id] === 'trio'
            ? 'Borrador de trío'
            : game.draftKindById[meld.id] === 'straight'
              ? 'Borrador de escalera'
              : `Borrador ${index + 1}`,
        cards: meld.cardIds
          .map((cardId) => handCardMap.get(cardId))
          .filter((card): card is CardInstance => card !== undefined),
      })),
    [game.draftKindById, game.initialDownDraft, handCardMap],
  );

  const selfParticipant = game.tableParticipants.find((participant) => participant.isSelf) ?? null;
  const otherParticipants = game.tableParticipants.filter((participant) => !participant.isSelf);
  const pendingClaimCard = game.publicState?.pendingOutOfTurnClaim?.card ?? null;

  useEffect(() => {
    setLastVisitedRoomId(roomId);
  }, [roomId, setLastVisitedRoomId]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  return (
    <div
      className={cn(
        'relative grid min-w-0 gap-4',
        isHandCollapsed ? 'pb-40' : 'pb-[18.5rem] sm:pb-[19.5rem]',
      )}
    >
      <div className="fixed right-4 top-4 z-40 sm:right-6 sm:top-5">
        {isMenuOpen ? (
          <button
            aria-label="Cerrar menú"
            className="fixed inset-0 z-0 bg-black/25"
            onClick={() => setIsMenuOpen(false)}
            type="button"
          />
        ) : null}
        <div className="relative">
          <button
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-line/80 bg-surface/92 text-ink shadow-glow backdrop-blur-xl transition-colors hover:border-brand/50 hover:text-white"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path
                  d="M6 6L18 18M18 6L6 18"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.25"
                />
              ) : (
                <>
                  <path
                    d="M5 7H19"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="2.25"
                  />
                  <path
                    d="M5 12H19"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="2.25"
                  />
                  <path
                    d="M5 17H19"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="2.25"
                  />
                </>
              )}
            </svg>
          </button>

          {isMenuOpen ? (
            <div className="absolute right-0 z-10 mt-3 flex w-[15rem] flex-col gap-2 rounded-[1.35rem] border border-line/70 bg-surface/96 p-3 shadow-glow backdrop-blur-xl">
                <p className="px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gold/80">
                  Menú
                </p>
                <MusicToggleButton className="w-full justify-between px-4" />
                <button
                  className="flex h-11 items-center justify-between rounded-full border border-line/80 bg-white/[0.05] px-4 text-sm font-semibold text-ink transition-colors hover:border-brand/50 hover:text-white"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('/rules');
                  }}
                  type="button"
                >
                  <span>Reglas</span>
                  <span aria-hidden="true" className="text-base leading-none">↗</span>
                </button>
                <button
                  className="flex h-11 items-center justify-between rounded-full border border-line/80 bg-white/[0.05] px-4 text-sm font-semibold text-ink transition-colors hover:border-brand/50 hover:text-white"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('/');
                  }}
                  type="button"
                >
                  <span>Inicio</span>
                  <span aria-hidden="true" className="text-base leading-none">↗</span>
                </button>
              </div>
          ) : null}
        </div>
      </div>

      {game.isHydrating && (!game.publicState || !game.privateState) ? (
        <LoadingSkeleton />
      ) : null}

      <section className="game-panel overflow-hidden rounded-[1.55rem] border border-line/70 px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold/80">
              Continental
            </p>
            <h1 className="mt-1 text-lg font-bold text-ink sm:text-xl">{roomLabel}</h1>
            <p className="mt-1 text-sm text-muted">
              Ronda {game.publicState?.roundIndex ?? '...'} · {currentPhaseLabel}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="game-chip">{currentTurnPhaseLabel}</span>
            <span className="game-chip">{game.roundRequirementText}</span>
          </div>
        </div>
      </section>

      {game.scoreboardEntries.length ? (
        <section className="game-panel overflow-hidden rounded-[1.35rem] border border-line/70 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold/80">
              Puntuaciones
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Menor puntaje gana
            </p>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {game.scoreboardEntries.map((entry) => (
              <article
                key={entry.playerId}
                className="min-w-[9.5rem] shrink-0 rounded-[1.05rem] border border-line/70 bg-white/[0.05] px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{entry.displayName}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                      Puesto #{entry.rank}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-ink">{entry.totalPoints}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <GameNotice title={game.statusNotice.title} tone={game.statusNotice.tone}>
        {game.statusNotice.description}
      </GameNotice>

      {game.isBusy ? (
        <GameNotice title="Sincronizando mesa" tone="info">
          La jugada se está propagando al resto de jugadores.
        </GameNotice>
      ) : null}

      {game.error ? (
        <GameNotice title="Algo necesita atención" tone="danger">
          <div className="flex items-start justify-between gap-3">
            <span>{game.error}</span>
            <button
              className="rounded-full border border-rose-200/30 px-3 py-2 text-xs font-semibold text-rose-100"
              onClick={() => game.clearError()}
              type="button"
            >
              Cerrar
            </button>
          </div>
        </GameNotice>
      ) : null}

      {game.publicState?.phase === 'finished' && game.gameSummary ? (
        <section className="game-panel overflow-hidden rounded-[1.7rem] border border-gold/25 bg-gradient-to-br from-gold/12 via-white/[0.04] to-brand/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold/85">
                Partida finalizada
              </p>
              <h2 className="mt-2 text-2xl font-bold text-ink">
                Ganó {game.gameSummary.standings[0]?.displayName ?? 'Mesa terminada'}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                {game.gameSummary.tieBreakRule}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-[1.25rem] border border-line/70 bg-black/15 p-3.5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold/80">
                Tabla final
              </p>
              <div className="mt-3 grid gap-2.5">
                {game.gameSummary.standings.map((standing) => (
                  <article
                    key={standing.playerId}
                    className="rounded-[1.1rem] border border-line/70 bg-white/[0.05] px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{standing.displayName}</p>
                        <p className="mt-1 text-xs text-muted">Puesto #{standing.rank}</p>
                      </div>
                      <p className="text-lg font-bold text-ink">{standing.totalPoints}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-line/70 bg-black/15 p-3.5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold/80">
                Historial por rondas
              </p>
              <div className="mt-3 grid gap-2.5">
                {game.gameSummary.rounds.map((round) => (
                  <article
                    key={round.roundIndex}
                    className="rounded-[1.1rem] border border-line/70 bg-white/[0.05] px-3 py-3"
                  >
                    <p className="text-sm font-semibold text-ink">Ronda {round.roundIndex}</p>
                    <p className="mt-1 text-sm text-muted">
                      Ganó {getPlayerName(round.winnerPlayerId, playersList)} con x
                      {round.multiplierApplied}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {game.publicState?.phase === 'scoring' ? (
        <section className="game-panel overflow-hidden rounded-[1.7rem] border border-emerald-300/25 bg-gradient-to-br from-emerald-500/12 via-white/[0.04] to-brand/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-200">
                Ronda terminada
              </p>
              <h2 className="mt-2 text-2xl font-bold text-ink">
                {game.roundResult
                  ? `Resumen de la ronda ${game.roundResult.roundIndex}`
                  : 'Cerrando la ronda'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Terminó la ronda {game.winnerOfRoundName ?? '...'}.
              </p>
            </div>
            {game.roundResult ? (
              <div className="rounded-[1.15rem] border border-line/70 bg-white/[0.05] px-3 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                  Multiplicador
                </p>
                <p className="mt-1.5 text-lg font-bold text-ink">
                  x{game.roundResult.multiplierApplied}
                </p>
              </div>
            ) : null}
          </div>

          {game.roundResult ? (
            <div className="mt-4 grid gap-3">
              {game.roundResult.entries.map((entry) => (
                <article
                  key={entry.playerId}
                  className="rounded-[1.15rem] border border-line/70 bg-white/[0.05] px-3.5 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">{entry.displayName}</p>
                    <p className="text-lg font-bold text-ink">{entry.totalPointsAfterRound}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                    <span className="rounded-full border border-line/70 bg-black/10 px-3 py-1.5">
                      Base {entry.basePoints}
                    </span>
                    <span className="rounded-full border border-line/70 bg-black/10 px-3 py-1.5">
                      Ronda {entry.pointsAwarded}
                    </span>
                    <span className="rounded-full border border-line/70 bg-black/10 px-3 py-1.5">
                      Total {entry.totalPointsAfterRound}
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold/75">
                      Cartas al terminar
                    </p>
                    {entry.remainingHand.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.remainingHand.map((card) => (
                          <span
                            key={card.id}
                            className="rounded-full border border-line/70 bg-black/10 px-3 py-1.5 text-xs font-semibold text-ink"
                          >
                            {describeCardCompact(card)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted">Sin cartas restantes.</p>
                    )}
                  </div>
                </article>
              ))}

              {game.canStartNextRound ? (
                <button
                  className="w-full rounded-[1.15rem] bg-gradient-to-r from-brand to-brand-strong px-4 py-3 text-sm font-semibold text-white shadow-glow"
                  disabled={game.isBusy || game.isStartingNextRound}
                  onClick={() => void game.startNextRound()}
                  type="button"
                >
                  {game.isStartingNextRound
                    ? `Repartiendo ronda ${Number(game.publicState.roundIndex) + 1}...`
                    : `Iniciar ronda ${Number(game.publicState.roundIndex) + 1}`}
                </button>
              ) : game.publicState.roundIndex === 8 ? (
                <div className="rounded-[1.15rem] border border-line/70 bg-white/[0.05] px-3.5 py-3 text-sm text-muted">
                  Cerrando la partida y preparando el resumen final.
                </div>
              ) : game.isStartingNextRound ? (
                <div className="rounded-[1.15rem] border border-line/70 bg-white/[0.05] px-3.5 py-3 text-sm text-muted">
                  Repartiendo la siguiente ronda y reseteando la mesa.
                </div>
              ) : (
                <div className="rounded-[1.15rem] border border-line/70 bg-white/[0.05] px-3.5 py-3 text-sm text-muted">
                  Esperando que el host reparta la siguiente ronda.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-[1.15rem] border border-line/70 bg-white/[0.05] px-3.5 py-3 text-sm text-muted">
              Preparando el resumen definitivo de la ronda.
            </div>
          )}
        </section>
      ) : null}

      {game.publicState ? (
        <section className="game-hero overflow-hidden rounded-[2rem] border border-line/70 px-3.5 py-4 shadow-glow sm:px-4">
          <div className="rounded-[1.8rem] border border-brand/15 bg-black/14 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-gold/80 sm:text-[1rem]">
                  Mesa
                </p>
              </div>
            </div>

            {otherParticipants.length ? (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {otherParticipants.map((participant) => (
                  <div key={participant.id} className="min-w-[12rem] flex-1">
                    <GameSeat
                      cardCount={participant.cardCount}
                      compact
                      displayName={participant.displayName}
                      hasGoneDown={participant.hasGoneDown}
                      isClaimPriority={participant.isClaimPriority}
                      isCurrentTurn={participant.isCurrentTurn}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 rounded-[1.9rem] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(25,183,164,0.14),transparent_28%),linear-gradient(180deg,rgba(9,58,50,0.72),rgba(7,35,30,0.88))] px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="grid gap-4">
                <div className="rounded-[1.5rem] border border-white/8 bg-black/10 px-3 py-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-300/80">
                    Estado de la mesa
                  </p>
                  <p className="mt-1 text-sm text-slate-100">
                    {game.roundRequirementText}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <TableDeckStack
                    accent="deck"
                    active={game.canDrawFromDeck && !game.isBusy}
                    label="Mazo"
                    onClick={
                      game.canDrawFromDeck && !game.isBusy
                        ? () => void game.drawFromDeck()
                        : undefined
                    }
                  />

                  <TableDeckStack
                    accent="discard"
                    active={game.canDrawFromDiscard && !game.isBusy}
                    card={game.publicState.discardTop}
                    label="Descarte"
                    onClick={
                      game.canDrawFromDiscard && !game.isBusy
                        ? () => void game.drawFromDiscard()
                        : undefined
                    }
                  >
                    {game.publicState.discardTop
                      ? describeCardCompact(game.publicState.discardTop)
                      : '∅'}
                  </TableDeckStack>
                </div>

                {pendingClaimCard ? (
                  <div className="rounded-[1.15rem] border border-amber-300/35 bg-amber-500/12 px-3 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100">
                      Reclamo fuera de turno
                    </p>
                    <p className="mt-1.5 text-sm text-amber-50">
                      Se disputa {describeCardDetail(pendingClaimCard)}.
                    </p>
                    <p className="mt-1 text-xs text-amber-100/85">
                      Prioridad: {game.currentOutOfTurnPriorityPlayerName ?? 'sin jugadores'}
                    </p>
                  </div>
                ) : null}

                <div className="rounded-[1.5rem] border border-white/8 bg-black/12 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-300/80">
                        Combinaciones bajadas
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3">
                    {game.publicState.publicTableMelds.length ? (
                      game.publicState.publicTableMelds.map((meld) => (
                        <GameMeldCard
                          key={meld.id}
                          meld={meld}
                          ownerLabel={
                            meld.ownerPlayerId
                              ? getPlayerName(meld.ownerPlayerId, playersList)
                              : game.publicState?.playersWhoAreDown.length === 1
                                ? getPlayerName(
                                    game.publicState?.playersWhoAreDown[0] ?? '',
                                    playersList,
                                  )
                              : 'Mesa'
                          }
                          onClick={() =>
                            game.setSelectedTableMeldId(
                              game.selectedTableMeldId === meld.id ? null : meld.id,
                            )
                          }
                          selected={game.selectedTableMeldId === meld.id}
                        />
                      ))
                    ) : (
                      <div className="rounded-[1.15rem] border border-dashed border-white/15 px-3.5 py-6 text-sm leading-5 text-slate-300/80">
                        Cuando alguien se baje, sus combinaciones aparecerán aquí.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {(draftPreview.length > 0 || game.rearrangeInput || game.canRearrangeTable) ? (
              <div className="mt-4 grid gap-3">
                <details className="rounded-[1.25rem] border border-line/70 bg-black/12 px-3.5 py-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-ink">
                    Borradores
                  </summary>
                  <div className="mt-3 grid gap-2.5">
                    {draftPreview.length ? (
                      draftPreview.map((meld) => (
                        <div
                          key={meld.id}
                          className="rounded-[1.1rem] border border-line/70 bg-white/[0.05] px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-ink">{meld.label}</p>
                            <button
                              className="rounded-full border border-line/70 px-3 py-1.5 text-xs font-semibold text-ink"
                              onClick={() => game.removeDraftMeld(meld.id)}
                              type="button"
                            >
                              Quitar
                            </button>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {meld.cards.map((card) => (
                              <span
                                key={card.id}
                                className="rounded-full border border-line/70 bg-black/10 px-3 py-1.5 text-xs font-semibold text-ink"
                              >
                                {describeCardCompact(card)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.1rem] border border-line/70 bg-white/[0.05] px-3 py-3 text-sm text-muted">
                        Aquí verás los borradores que vayas armando.
                      </div>
                    )}
                  </div>
                </details>

                <details className="rounded-[1.25rem] border border-line/70 bg-black/12 px-3.5 py-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-ink">
                    Reorganizar mesa
                  </summary>
                  <div className="mt-3 space-y-3">
                    <textarea
                      className="min-h-24 w-full rounded-[1rem] border border-line/70 bg-white/[0.05] px-3.5 py-3 text-sm text-ink outline-none placeholder:text-muted focus:border-brand/60"
                      onChange={(event) => game.setRearrangeInput(event.target.value)}
                      placeholder="combinacion-1:trio:carta1,carta2,carta3"
                      value={game.rearrangeInput}
                    />
                    <button
                      className="w-full rounded-[1rem] border border-line/70 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!game.canRearrangeTable || game.isBusy}
                      onClick={() => void game.submitRearrangeTable()}
                      type="button"
                    >
                      Aplicar reorganización
                    </button>
                  </div>
                </details>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {game.actionDescriptors.length ? (
        <section
          className={cn(
            'fixed inset-x-0 z-20 px-3',
            isHandCollapsed ? 'bottom-[6.2rem]' : 'bottom-[13.2rem] sm:bottom-[13.7rem]',
          )}
        >
          <div className="mx-auto max-w-5xl">
            <div
              className="transition-transform duration-300"
              style={{
                transform: isActionsCollapsed ? 'translateX(calc(-100% + 4.5rem))' : 'translateX(0)',
              }}
            >
              <div className="rounded-[1.45rem] border border-line/70 bg-surface/92 px-3 py-3 shadow-panel backdrop-blur-xl">
                <div className="flex items-start justify-between gap-3">
                  {!isActionsCollapsed ? (
                    <div className="min-w-0 self-center">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold/80">
                        Acciones
                      </p>
                    </div>
                  ) : (
                    <span />
                  )}

                  <button
                    aria-expanded={!isActionsCollapsed}
                    aria-label={isActionsCollapsed ? 'Mostrar acciones' : 'Ocultar acciones'}
                    className="flex h-10 w-16 shrink-0 items-center justify-center rounded-[1rem] border border-line/70 bg-white/[0.06] text-ink transition-all hover:border-brand/50 hover:bg-white/[0.09] hover:text-brand"
                    onClick={() => setIsActionsCollapsed((current) => !current)}
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      className={cn(
                        'h-7 w-7 transition-transform duration-200',
                        isActionsCollapsed ? 'rotate-180' : 'rotate-0',
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M15 6l-6 6 6 6"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.7"
                      />
                    </svg>
                  </button>
                </div>

                {!isActionsCollapsed ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {game.actionDescriptors.map((action) => (
                      <div key={action.key} className="min-w-[10.5rem] max-w-[12rem] shrink-0">
                        <GameActionButton
                          description={action.description}
                          disabled={!action.enabled || game.isBusy}
                          disabledReason={!action.enabled ? action.disabledReason : undefined}
                          label={action.label}
                          onClick={actionHandlers[action.key]}
                          tone={action.tone}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-surface-alt/96 px-4 pb-3 pt-3 shadow-panel backdrop-blur-xl">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold/80">
                Tu mano
              </p>
              <p className="mt-1 text-sm text-ink">
                {currentPlayerCardCount} cartas ·{' '}
                {game.privateState?.hasGoneDown ? 'ya te bajaste' : 'todavía no te bajas'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {selfParticipant ? (
                <span className="hidden rounded-full border border-line/70 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted sm:inline-flex">
                  {selfParticipant.isCurrentTurn ? 'Es tu turno' : 'Observa la mesa'}
                </span>
              ) : null}
              <button
                aria-expanded={!isHandCollapsed}
                aria-label={isHandCollapsed ? 'Mostrar mano' : 'Ocultar mano'}
                className="flex h-10 w-16 items-center justify-center rounded-[1rem] border border-line/70 bg-white/[0.06] text-ink transition-all hover:border-brand/50 hover:bg-white/[0.09] hover:text-brand"
                onClick={() => setIsHandCollapsed((current) => !current)}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className={cn(
                    'h-7 w-7 transition-transform duration-200',
                    isHandCollapsed ? 'rotate-180' : 'rotate-0',
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.7"
                  />
                </svg>
              </button>
            </div>
          </div>

          {!isHandCollapsed ? (
            <>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <div className="rounded-full border border-line/70 bg-white/[0.05] p-1">
                  {(['rank', 'suit'] as const).map((mode) => (
                    <button
                      key={mode}
                      className={cn(
                        'rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]',
                        game.handSortMode === mode ? 'bg-brand text-white' : 'text-muted',
                      )}
                      onClick={() => game.setHandSortMode(mode)}
                      type="button"
                    >
                      {mode === 'rank' ? 'Valor' : 'Palo'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {game.sortedHand.length ? (
                  game.sortedHand.map((card: CardInstance) => (
                    <GameHandCard
                      key={card.id}
                      card={card}
                      highlighted={game.lastDrawnCardId === card.id}
                      onClick={() => game.toggleCard(card.id)}
                      selected={game.selectedCardIds.includes(card.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-[1.2rem] border border-dashed border-line/70 px-4 py-6 text-sm text-muted">
                    Tu mano aparecerá aquí cuando el estado privado termine de sincronizar.
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
