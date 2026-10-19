// Tuning values for movement, combat and stealth. Distances are in world pixels, times in seconds.
export const TILE = 40;

export const ADA = {
  width: 34,
  height: 118,
  crouchHeight: 74,
  gravity: 2300,
  maxFall: 1150,
  runSpeed: 300,
  walkSpeed: 128,
  crouchSpeed: 86,
  groundAccel: 2600,
  groundDecel: 3200,
  airAccel: 1500,
  jumpVelocity: 720,
  jumpCut: 0.45,
  coyote: 0.1,
  jumpBuffer: 0.13,
  climbSpeed: 150,
  ledgeReach: 168,       // how far above the feet the hands reach while airborne
  hangDrop: 0.18,        // seconds before a dropped ledge can be grabbed again
  climbUpTime: 0.52,
  dodgeTime: 0.38,
  dodgeSpeed: 300,
  dodgeInvuln: [0.04, 0.32],
  hurtTime: 0.34,
  maxResist: 5,
  regenDelay: 2.6,       // seconds hidden or out of danger before resistance comes back
  regenStep: 2.2,
  fallHurt: 330,         // falls higher than this cost resistance
};

export const COMBAT = {
  punch: { dmg: 1, active: [0.07, 0.15], dur: 0.26, reach: 66, top: 102, bottom: 64, knock: 110, chain: 0.36 },
  kick: { dmg: 2, active: [0.13, 0.24], dur: 0.46, reach: 86, top: 88, bottom: 34, knock: 260 },
  hitStop: 0.055,
};

export const NOISE = {
  walk: 0, run: 230, land: 260, hardLand: 420, punch: 360, kick: 380, fight: 1100,
  wall: 620, crack: 520, throwLand: 430, cart: 380, body: 300,
};

export const STEALTH = {
  coneAngle: 56,          // degrees, full width
  rangeDark: 330,
  rangeLit: 560,
  suspicious: 0.34,
  alert: 1,
  decay: 0.22,
};

export const VIEW = { width: 1280, height: 720 };
