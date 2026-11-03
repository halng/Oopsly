/**
 * Plans and prices are hidden for now: every new account starts on Pro Max.
 * Set NEXT_PUBLIC_SHOW_PRICING=true (at build time) to bring the pricing section, the
 * subscribe page and the upgrade buttons back.
 */
export const SHOW_PRICING = process.env.NEXT_PUBLIC_SHOW_PRICING === 'true';
