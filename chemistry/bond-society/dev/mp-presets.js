// 連線版平衡模擬的建議數字（2026-10-15，30 人班：高二高三版 5/5/5/6/6＋鍵結社 3；高一版 9/9/9＋鍵結社 3）
// 用法：node -e "const {run,report}=require('./mp-sim.js');const {G11}=require('./mp-presets.js');console.log(report(run(G11)))"
const TEAM = { T_CORRECT: 0.64, T_MAKE: 0.19, T_DONATE: 9, T_FRIEND: 4, T_QUICK: 0.68 };
module.exports = {
  G11: { level: 'g11', VW_R: 115, VW_X: 1800, CO_N: 7, CO_F: 70, IO_N: 27, IO_M: 2, ME_X: 670, ME_K: 8, HB_N: 5, HB_F: 60, BS_LO: 85, BS_HI: 115, BS_SPREAD: 18, PW: 4, V: 35, SEC: { haul: 9, split: 25, slack: 50, drain: 300, block: 85, weaken: 98 }, ...TEAM },
  G10: { level: 'g10', CO_N: 8, CO_TERR: 35, IO_N: 41, IO_M: 2, ME_X: 880, ME_K: 8, BS_LO: 90, BS_HI: 110, BS_SPREAD: 10, PW: 5, V: 15, SEC: { haul: 9, split: 85, slack: 63, drain: 720, block: 88, weaken: 100 }, ...TEAM }
};
