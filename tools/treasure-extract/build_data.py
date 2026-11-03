import re,json,collections,sys
rows=[l.rstrip('\n').split('\t') for l in open('/home/claude/work/frames.tsv',encoding='utf8')]
med=collections.defaultdict(dict); ans=collections.defaultdict(dict); odd=[]
for cls,fr,content in rows:
    fr=int(fr); m=re.match(r'(medicine|ansJpg)(\d)Q(\d+)',cls); kind,n,q=m.group(1),int(m.group(2)),int(m.group(3))
    if kind=='medicine':
        t=re.findall(r'T"([^"]*)"',content)
        if len(t)!=1: odd.append((cls,fr,content)); continue
        med[(n,q)][fr]=t[0]
    else:
        im=re.findall(r'img\[(\d+)\]',content)
        if len(im)!=1 or content.count(';'): odd.append((cls,fr,content))
        if im: ans[(n,q)][fr]=int(im[0])
qmax={3:76,4:32,5:15,6:15,7:10,8:10}
out=[]; photos=collections.Counter(); problems=[]
for n in range(3,9):
    for q in range(1,qmax[n]+1):
        m=med[(n,q)]; a=ans[(n,q)]
        names=[m.get(i) for i in range(1,n+1)]; forms=[m.get(i+10) for i in range(1,n+1)]
        pairs={}
        for i in range(1,n+1):
            for j in range(i,n+1):
                k=i*10+j
                if k not in a: problems.append(f'{n}-{q:02d} missing pair {k}')
                else: pairs[f'{i}{j}']=a[k]; photos[a[k]]+=1
        extra=[k for k in a if not(1<=k//10<=k%10<=n)]
        if extra: problems.append(f'{n}-{q:02d} extra frames {extra}')
        if None in names or None in forms: problems.append(f'{n}-{q:02d} names {names} {forms}')
        out.append({'id':f'{n}-{q:02d}','n':n,'names':names,'formulas':forms,'pairs':pairs})
print('odd',odd[:10],len(odd)); print('problems',problems[:20],len(problems)); print(photos)
json.dump(out,open('/home/claude/work/questions.json','w',encoding='utf8'),ensure_ascii=False)
allnames=collections.Counter(); 
for o in out:
    for a,b in zip(o['names'],o['formulas']): allnames[(a,b)]+=1
for k,v in sorted(allnames.items(),key=lambda x:-x[1]): print(v,k)
