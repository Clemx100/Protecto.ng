export type MapShellVariant = "embedded" | "hero"

export function getMapShellClass(variant: MapShellVariant = "embedded") {
  return variant === "hero"
    ? "relative h-full w-full overflow-hidden bg-gray-900"
    : "relative h-64 bg-gray-800 rounded-lg m-4 overflow-hidden"
}
