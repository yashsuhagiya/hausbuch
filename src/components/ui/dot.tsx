export function Dot({ faded = false }: { faded?: boolean }) {
  return <span className={`inline-block w-1 h-1 rounded-full bg-rust ${faded ? "opacity-50" : ""}`} aria-hidden />;
}
