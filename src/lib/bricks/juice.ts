export type Spark = {
  x: number;
  y: number;
  z: number;
  color: string;
};

type PopHandler = (spark: Spark) => void;

const handlers = new Set<PopHandler>();
const born = new Map<string, number>();

export function onSpark(handler: PopHandler) {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function emitSpark(spark: Spark) {
  handlers.forEach((handler) => handler(spark));
}

export function markBorn(id: string) {
  born.set(id, performance.now());
}

export function bornEntries(): Map<string, number> {
  return born;
}
