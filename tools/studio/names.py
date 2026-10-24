# 道具學生的假名字：一律「姓氏＋大／小＋一個字」（老師 2026-10-24 要求：避免剛好和真人同名被詬病）
import random
SUR = '陳林黃張李王吳劉蔡楊許鄭謝郭洪曾邱廖賴周徐蘇葉莊呂江何蕭羅潘朱鍾彭詹胡施沈趙盧梁顏柯孫魏翁戴鄧杜傅侯曹薛卓阮董唐藍蔣紀姚馮歐湯姜汪鄒尤黎涂嚴韓袁陸邵倪溫譚駱熊秦顧俞'
ONE = '安宇明華文婷晴君涵翔傑美雯豪恩芸軒庭瑜萱凱寧誠妍睿琪彤廷哲穎妤翰承柔嘉樂'
def name_of(r):
    return r.choice(SUR) + r.choice('大小') + r.choice(ONE)
def roster(cls, n, seed=1):
    r = random.Random(seed); used = set(); out = []
    for i in range(n):
        nm = name_of(r)
        while nm in used: nm = name_of(r)
        used.add(nm)
        out.append((cls, i + 1, f'1150{cls[-2:]}{i+1:02d}' if len(cls) >= 3 else f'115{i+1:04d}', nm))
    return out
