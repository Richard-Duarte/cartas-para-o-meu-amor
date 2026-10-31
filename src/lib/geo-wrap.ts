/** Destino com longitude "desdobrada" para a rota seguir o caminho mais curto (ex.: Brasil → Austrália pelo Pacífico). */
export function unwrapTo<T extends { lat: number; lng: number }>(from: { lng: number }, to: T): T {
  let lng = to.lng;
  while (lng - from.lng > 180) lng -= 360;
  while (lng - from.lng < -180) lng += 360;
  return lng === to.lng ? to : { ...to, lng };
}
