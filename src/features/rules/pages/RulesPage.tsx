import { SectionCard } from '@/shared/ui/layout/SectionCard';

const roundDefinitions = [
  'Ronda 1: 2 tríos',
  'Ronda 2: 1 trío y 1 escalera',
  'Ronda 3: 2 escaleras',
  'Ronda 4: 3 tríos',
  'Ronda 5: 2 tríos y 1 escalera',
  'Ronda 6: 1 trío y 2 escaleras',
  'Ronda 7: 3 escaleras',
  'Ronda 8: 4 tríos',
];

const tableRules = [
  'En tu turno primero robas y después descartas.',
  'Puedes robar del mazo boca abajo o del descarte visible.',
  'Si ya te bajaste, en tu turno solo puedes robar del mazo.',
  'Solo después de bajarte puedes agregar cartas a combinaciones bajadas o reorganizar la mesa.',
];

const appUsageRules = [
  'Tu mano está abajo de la pantalla. Toca cartas para seleccionarlas o volver a tocarlas para quitarlas.',
  'Puedes armar borradores aunque no sea tu turno, para dejar preparada tu bajada antes de jugar.',
  'Cuando pulses Bajarse, la app decide automáticamente si cada borrador forma un trío o una escalera y valida si cumple la ronda.',
  'Si robas una carta, la mano la resalta con borde rojo para que sepas cuál fue la nueva.',
  'La barra de acciones y tu mano se pueden plegar para ver mejor la mesa durante la partida.',
  'Desde el menú de la partida puedes abrir Reglas, controlar la música o volver a Inicio.',
];

const claimRules = [
  'El reclamo fuera de turno solo existe cuando el jugador activo robó del mazo boca abajo.',
  'Se disputa la carta que ya estaba arriba del descarte antes del descarte nuevo.',
  'Solo pueden reclamar jugadores que todavía no se han bajado.',
  'La prioridad se resuelve por cercanía al turno actual.',
];

const scoringRules = [
  'La ronda termina cuando un jugador se queda sin cartas.',
  'Se puntúan solo las cartas que queden en la mano.',
  'Si un jugador se baja y se va completo en el mismo turno, recibe multiplicador x2.',
  'Si eso ocurre además en el primer turno de la ronda, el multiplicador es x3.',
  'Gana la partida quien termine las ocho rondas con menor puntaje acumulado.',
];

export function RulesPage() {
  return (
    <div className="grid gap-4">
      <SectionCard
        eyebrow="Guía de mesa"
        title="Reglas de Continental"
        description="Una referencia rápida para entender el flujo de la partida, las rondas y cómo se resuelve el scoring dentro de la app."
      >
        <div className="grid min-w-0 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="game-hero min-w-0 rounded-[1.75rem] border border-line/70 p-5 shadow-glow">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold/80">
              Flujo básico
            </p>
            <h2 className="mt-3 text-2xl font-bold text-ink">Cómo se juega cada turno</h2>
            <div className="mt-5 grid gap-3">
              {tableRules.map((rule) => (
                <article
                  key={rule}
                  className="rounded-[1.25rem] border border-line/70 bg-white/[0.05] px-4 py-3.5"
                >
                  <p className="text-sm leading-6 text-muted">{rule}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="min-w-0 rounded-[1.75rem] border border-line/70 bg-white/[0.04] p-5 shadow-glow">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold/80">
              Rondas
            </p>
            <div className="mt-4 grid gap-2.5">
              {roundDefinitions.map((round) => (
                <div
                  key={round}
                  className="rounded-[1.2rem] border border-line/70 bg-surface px-4 py-3 text-sm font-medium text-ink"
                >
                  {round}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
          <section className="min-w-0 rounded-[1.75rem] border border-line/70 bg-white/[0.04] p-5 shadow-glow">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold/80">
              Cómo jugar en la app
            </p>
            <div className="mt-4 grid gap-3">
              {appUsageRules.map((rule) => (
                <article
                  key={rule}
                  className="rounded-[1.2rem] border border-line/70 bg-surface px-4 py-3.5"
                >
                  <p className="text-sm leading-6 text-muted">{rule}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="min-w-0 rounded-[1.75rem] border border-line/70 bg-white/[0.04] p-5 shadow-glow">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold/80">
              Reclamo fuera de turno
            </p>
            <div className="mt-4 grid gap-3">
              {claimRules.map((rule) => (
                <article
                  key={rule}
                  className="rounded-[1.2rem] border border-line/70 bg-surface px-4 py-3.5"
                >
                  <p className="text-sm leading-6 text-muted">{rule}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="game-hero min-w-0 rounded-[1.75rem] border border-line/70 p-5 shadow-glow">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold/80">
              Cierre y puntuación
            </p>
            <div className="mt-4 grid gap-3">
              {scoringRules.map((rule) => (
                <article
                  key={rule}
                  className="rounded-[1.2rem] border border-line/70 bg-white/[0.05] px-4 py-3.5"
                >
                  <p className="text-sm leading-6 text-muted">{rule}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </SectionCard>
    </div>
  );
}
