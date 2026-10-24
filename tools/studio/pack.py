"""📦 把攝影棚的截圖整理進教師展覽館
   out/*.png → showcase/img/<代號>-N.webp（原圖，點開才看）＋ showcase/img/t/<代號>-N.webp（縮圖，一半大小）
   並把 showcase/data.js 每個系統的 shots: [...] 換成新的清單。
   挑哪些圖、圖說寫什麼，改下面的 PICK 就好。"""
import os, json, re
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get('STUDIO_OUT', os.path.join(HERE, 'out/'))
SHOW = os.path.join(HERE, '../../showcase/')
DST, THUMB = SHOW + 'img/', SHOW + 'img/t/'
PICK = {
 'seat': [('seat_stage_mid', '投影舞台：一格一格翻牌揭曉座位'), ('seat_sheet', 'A4 座位表：座位圖、幹部、打掃一頁印完'), ('seat_round_raw', '換座位頁：鎖定座位、開放線上選位、開啟投影舞台'), ('seat_stage_done', '分配完成，全班看投影找自己的位子')],
 'lab': [('lab_ph_analysis', '能力分析：依難度、題型統計答對率，自動診斷常見錯誤'), ('lab_ph_live', '即時總表：每位學生每一題的作答與嘗試次數'), ('lab_eq_rank', '實驗器材辨識：每個活動自己的排行榜'), ('lab_ph_student', '學生手機：pH 計算即時對錯'), ('lab_unit_student', '學生手機：單位換算答錯時亮出路線提示'), ('lab_eq_student', '學生手機：看圖寫器材名稱，越快分數越高')],
 'grade': [('grade_grid', '像 Excel 的成績表：群組、小計、總分自動計算'), ('grade_cols', '欄位設定：公式寫法像 Excel，下方即時試算'), ('grade_open', '開放查詢：用學生的眼睛看，確認學生看到什麼'), ('grade_student_phone', '學生手機：只看得到自己、老師開放的欄位'), ('grade_student_login', '學生登入：班級、座號、姓名、密碼')],
 'exam': [('exam_monitor', '監控清單：每位學生的狀態、違規、連線，一目了然'), ('exam_board', '考場投影看板：不顯示姓名與分數'), ('exam_stats', '統計：分數分布、標籤（單元）分析、試題分析'), ('exam_mark', '閱卷：一題看全班，常用評語一鍵帶入'), ('exam_student', '學生手機：多重選擇題作答畫面'), ('exam_wizard', '建立測驗 6 步驟精靈：最後一步確認所有設定')],
 'excel': [('excel_wall', '破案牆投影：各關破解進度、首破、最速結案、即時動態'), ('excel_live', '即時進度：誰卡在哪一關、哪一關最多人卡住'), ('excel_student', '學生頁：下載專屬數據、收集密碼碎片'), ('excel_student_lv', '學生頁：每一關的任務清單與回報欄')],
 'gps': [('gps_board_mid', '戰況看板：各組進度、卡關時間、答錯與求助次數'), ('gps_proj', '投影畫面：校園地圖上的各組位置與排行榜'), ('gps_stats', '統計：找出全班最弱的觀察視角'), ('gps_student', '學生手機：地圖上的候選地點'), ('gps_student2', '學生手機：看照片選出地圖上的號碼'), ('gps_challenge', '學生手機：答對後的加分挑戰')],
 'src': [('src_student', '出處鑑識：專屬證物卡，系統逐項指出哪裡寫錯'), ('src_archive', '模擬檔案庫：拆關鍵字、搜尋、收集可靠文獻'), ('src_live', '老師卷宗：每關過關／卡關人數、最卡的一關')],
}
os.makedirs(THUMB, exist_ok=True)
shots, total = {}, 0
for app, items in PICK.items():
    shots[app] = []
    for i, (f, cap) in enumerate(items):
        im = Image.open(SRC + f + '.png').convert('RGB')
        if im.width > 1200: im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
        name = f'{app}-{i+1}.webp'
        im.save(DST + name, 'WEBP', quality=80, method=6)
        tw = 600 if im.width >= 600 else 240           # 縮圖：電腦畫面 600 寬、手機畫面 240 寬（高解析螢幕也清楚）
        th = im.resize((tw, round(im.height * tw / im.width)), Image.LANCZOS)
        th.save(THUMB + name, 'WEBP', quality=76, method=6)
        total += os.path.getsize(DST + name) + os.path.getsize(THUMB + name)
        shots[app].append(['img/' + name, cap, im.width, im.height])
# 寫回 data.js
p = SHOW + 'data.js'; s = open(p, encoding='utf-8').read()
for app, items in shots.items():
    js = '      shots: [\n        ' + ',\n        '.join(json.dumps(x, ensure_ascii=False) for x in items) + '\n      ],\n'
    pat = re.compile(r'(\n    ' + app + r': \{\n      drawer: [^\n]*\n)(      shots: \[\n.*?\n      \],\n)?', re.S)
    m = pat.search(s); assert m, app
    s = s[:m.start()] + m.group(1) + js + s[m.end():]
open(p, 'w', encoding='utf-8').write(s)
print('✅', sum(len(v) for v in shots.values()), '張，原圖＋縮圖共', total // 1024, 'KB')
