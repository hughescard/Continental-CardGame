import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoomLobby } from '@/features/room/hooks/useRoomLobby';
import { SectionCard } from '@/shared/ui/layout/SectionCard';
import { useSessionStore } from '@/store/session/session-store';

export function RoomPage() {
  const { roomId = 'UNKNOWN' } = useParams();
  const navigate = useNavigate();
  const setLastVisitedRoomId = useSessionStore((state) => state.setLastVisitedRoomId);
  const {
    room,
    activePlayers,
    players,
    currentPlayer,
    error,
    isHost,
    isStartingGame,
    isLeavingRoom,
    startGame,
    leaveRoom,
  } = useRoomLobby(roomId);

  useEffect(() => {
    if (room) {
      setLastVisitedRoomId(room.id);
    }
  }, [room, setLastVisitedRoomId]);

  useEffect(() => {
    if (room?.status === 'in_game') {
      navigate(`/game/${room.id}`, { replace: true });
    }
  }, [navigate, room]);

  async function handleLeaveRoom() {
    const didLeave = await leaveRoom();

    if (!didLeave) {
      return;
    }

    setLastVisitedRoomId(null);
    navigate('/', { replace: true });
  }

  return (
    <SectionCard
      eyebrow="Sala privada"
      title={room ? `Mesa ${room.code}` : `Mesa ${roomId}`}
      description="Lobby en tiempo real pensado para preparar la partida, ver la mesa completa y arrancar cuando estén listos."
      action={
        <div className="flex flex-wrap gap-3">
          {isHost ? (
            <button
              className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isStartingGame || activePlayers.length < 2}
              onClick={() => void startGame()}
              type="button"
            >
              {isStartingGame ? 'Iniciando...' : 'Iniciar partida'}
            </button>
          ) : null}
          <button
            className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLeavingRoom}
            onClick={() => void handleLeaveRoom()}
            type="button"
          >
            {isLeavingRoom ? 'Saliendo...' : 'Salir de la sala'}
          </button>
        </div>
      }
    >
      <div className="grid min-w-0 gap-6">
        <div className="game-hero grid min-w-0 gap-4 rounded-[2rem] border border-line/70 p-5 shadow-glow md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Estado', value: room?.status ?? 'cargando' },
            { label: 'Jugadores activos', value: `${activePlayers.length} / ${room?.maxPlayers ?? 7}` },
            { label: 'Host', value: room?.hostPlayerId === currentPlayer?.id ? 'Tú' : players.find((player) => player.id === room?.hostPlayerId)?.displayName ?? 'cargando' },
            { label: 'Tu asiento', value: currentPlayer ? `#${currentPlayer.seatIndex + 1}` : 'pendiente' },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-[1.6rem] border border-line/70 bg-white/[0.05] p-5"
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{item.label}</p>
              <p className="mt-3 text-lg font-semibold text-ink">{item.value}</p>
            </article>
          ))}
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="min-w-0 rounded-[2rem] border border-line/70 bg-white/[0.04] p-5 shadow-glow">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold/80">
                  Jugadores
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink">
                  Gente sentada en la mesa
                </h2>
              </div>
              <div className="rounded-full border border-line/70 bg-white/[0.06] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                código {room?.code ?? '...'}
              </div>
            </div>

            <div className="mt-6 grid min-w-0 gap-3">
              {players.map((player) => (
                <article
                  key={player.id}
                  className="game-card-glow flex flex-col gap-3 rounded-[1.6rem] border border-line/70 bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-ink">
                        {player.displayName}
                      </h3>
                      {room?.hostPlayerId === player.id ? (
                        <span className="rounded-full bg-brand/12 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                          host
                        </span>
                      ) : null}
                      {player.id === currentPlayer?.id ? (
                        <span className="rounded-full bg-gold/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold/90">
                          tú
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      Asiento #{player.seatIndex + 1}
                    </p>
                  </div>
                  <div
                    className={`w-fit max-w-full rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                      player.isOnline
                        ? 'bg-brand/12 text-brand'
                        : 'bg-white/[0.06] text-muted'
                    }`}
                  >
                    {player.isOnline ? 'conectado' : player.status}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-6">
            <article className="game-hero min-w-0 rounded-[2rem] border border-line/70 p-5 shadow-glow">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold/80">
                Listos para jugar
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
                <div className="rounded-[1.35rem] border border-line/70 bg-white/[0.05] px-4 py-3">
                  Mínimo de jugadores: {room?.minPlayers ?? 2}
                </div>
                <div className="rounded-[1.35rem] border border-line/70 bg-white/[0.05] px-4 py-3">
                  Host actual: {room?.hostPlayerId === currentPlayer?.id ? 'tú' : 'otro jugador'}
                </div>
                <div className="rounded-[1.35rem] border border-line/70 bg-white/[0.05] px-4 py-3">
                  Estado listo: {activePlayers.length >= 2 ? 'sí' : 'faltan jugadores'}
                </div>
                <div className="rounded-[1.35rem] border border-line/70 bg-white/[0.05] px-4 py-3">
                  La partida empieza en tiempo real para todos los jugadores conectados.
                </div>
              </div>
            </article>

            {error ? (
              <article className="rounded-[1.6rem] border border-rose-200/60 bg-rose-500/10 p-5 text-sm leading-6 text-rose-200">
                {error}
              </article>
            ) : null}
          </section>
        </div>
      </div>
    </SectionCard>
  );
}
