import random
SUR = '陳林黃張李王吳劉蔡楊許鄭謝郭洪曾邱廖賴周徐蘇葉莊呂江何蕭羅高'
GIV = ['小安','品妍','宥廷','子晴','柏翰','語彤','承恩','芷涵','冠宇','欣妤','宇翔','亭妤','俊傑','詩涵','家豪','思妤','品睿','佳穎','睿哲','若瑜','昱辰','可馨','彥廷','以晴','皓宇','郁婷','孟軒','雨涵','奕安','書妍','定恩','沛瑜']
def roster(cls, n, seed=1):
    r = random.Random(seed); s = list(SUR); r.shuffle(s); g = list(GIV); r.shuffle(g)
    return [(cls, i + 1, f'1150{cls[-2:]}{i+1:02d}' if len(cls) >= 3 else f'115{i+1:04d}', s[i % len(s)] + g[i % len(g)]) for i in range(n)]
