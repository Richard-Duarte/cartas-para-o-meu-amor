/* eslint-disable */
// @ts-nocheck
// device tier: 'low' on phones / weak CPUs (override with ?tier=low|high)
const q = new URLSearchParams(location.search).get('tier');
const coarse = matchMedia('(pointer: coarse)').matches, small = Math.min(innerWidth, innerHeight) < 700;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
export const LOW = q ? q === 'low' : (coarse || small || weak);
export const TIER = LOW
  ? { name: 'low', dpr: 1.5, grass: 0.2, flowers: 0.25, dd: 1, ground: 56, shadow: 1024, softShadow: false }
  : { name: 'high', dpr: 2, grass: 0.6, flowers: 0.7, dd: 0, ground: 96, shadow: 2048, softShadow: true };
