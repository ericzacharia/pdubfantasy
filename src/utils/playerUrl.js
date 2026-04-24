/** Returns the URL-friendly identifier for a player — slug if available, ID as fallback */
export const playerUrl = (player) =>
  player?.slug || player?.id;

/** Navigate shorthand: navigate(`/player/${playerUrl(player)}`) */
export const toPlayerPath = (player) =>
  `/player/${playerUrl(player)}`;
