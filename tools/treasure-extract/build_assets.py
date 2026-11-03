import json
from PIL import Image
qs=json.load(open('/home/claude/work/questions.json',encoding='utf8'))
ids=sorted({p for q in qs for p in q['pairs'].values()})
num={pid:i+1 for i,pid in enumerate(ids)}
out='/home/claude/wuyutzu-tools/chemistry/treasure/'
tot=0
for pid,i in num.items():
    im=Image.open(f'/home/claude/work/imgs/{pid}.jpeg').convert('RGB')
    p=f'{out}img/p{i:02d}.webp'; im.save(p,'WEBP',quality=80,method=6)
    import os; tot+=os.path.getsize(p)
print('photos',len(num),'bytes',tot)
rows=[]
for q in qs:
    pairs=','.join(f'{k}:{num[v]}' for k,v in q['pairs'].items())
    rows.append('  ['+json.dumps(q['id'])+','+json.dumps(q['names'],ensure_ascii=False)+','+json.dumps(q['formulas'],ensure_ascii=False)+','+json.dumps(pairs)+']')
js='''// 化學尋寶 題庫資料（自動產生，不要手改；來源：師大附中「化學尋寶」App v1.7.0）
// 每一題：[編號, 中文藥品名(依真正的杯號 1..N), 化學式(｜分隔，奇數段是下標), "杯a杯b:照片編號,..."]
// 照片 img/pNN.webp；「aa」= 同一杯單獨觀察
window.TREASURE_QUESTIONS = [
'''+',\n'.join(rows)+'''
];
'''
open(out+'data.js','w',encoding='utf8').write(js)
print(len(js))
