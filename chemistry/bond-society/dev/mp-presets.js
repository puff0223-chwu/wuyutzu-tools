// 連線版平衡模擬的建議數字（2026-10-15，30 人班）；其他人數查 mp-table.json（3～50 人）
// 用法：node -e "const {run,report}=require('./mp-sim.js');const {G11}=require('./mp-presets.js');console.log(report(run(G11)))"
// 規則：每答對 1 題換 1 張交易許可；勢力 ≤5 人時大煉金師兼任守護騎士與智者；≤3 人時每人輪流做各種角色、沒有雙面人
module.exports = {
  G11: {"CO_N": 9, "CO_F": 79, "CO_TERR": 36.7, "IO_N": 27, "ME_X": 630, "ME_K": 8, "HB_N": 5, "HB_F": 61, "VW_X": 1860, "VW_R": 115, "SEC": {"haul": 9, "split": 50, "slack": 55, "drain": 250, "block": 80, "weaken": 99}, "BS_LO": 85, "BS_HI": 115, "BS_SPREAD": 18, "PW": 4, "V": 35, "level": "g11", "T_CORRECT": 0.64, "T_MAKE": 0.19, "T_DONATE": 9, "T_FRIEND": 4, "T_QUICK": 0.68},
  G10: {"CO_N": 8, "CO_F": 69, "CO_TERR": 34.9, "IO_N": 39, "ME_X": 850, "ME_K": 8, "SEC": {"haul": 9, "split": 90, "slack": 65, "drain": 710, "block": 90, "weaken": 100}, "BS_LO": 90, "BS_HI": 110, "BS_SPREAD": 10, "PW": 5, "V": 15, "level": "g10", "T_CORRECT": 0.64, "T_MAKE": 0.19, "T_DONATE": 9, "T_FRIEND": 4, "T_QUICK": 0.68}
};
