# 把 seat_seed.js 產生的班級放進假資料庫
import bed, json, subprocess, os
c = json.loads(subprocess.check_output(['node', os.path.join(os.path.dirname(__file__), 'seat_seed.js')]))
c['owner'] = 'wuadmin'
bed.db('PUT', 'seating/classes/' + c['id'], c)
bed.db('PUT', 'seating/owners/wuadmin/' + c['id'], {'name': c['name'], 'updatedAt': c['updatedAt']})
print('seat class', c['id'])
