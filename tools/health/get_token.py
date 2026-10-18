#!/usr/bin/env python3
"""🔑 用服務帳號金鑰（環境變數 FIREBASE_SA，JSON 全文）換一張 Google 存取權杖，印到 stdout

為什麼自己換：google-github-actions/auth 的 access_token 模式要另外開「IAM Service Account Credentials API」；
這裡直接用金鑰簽名換權杖（OAuth JWT），不用多開任何 API。"""
import json, os, sys
from google.oauth2 import service_account
from google.auth.transport.requests import Request

SCOPES = ['https://www.googleapis.com/auth/firebase.database', 'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/monitoring.read', 'https://www.googleapis.com/auth/cloud-platform']
try:
    cred = service_account.Credentials.from_service_account_info(json.loads(os.environ['FIREBASE_SA']), scopes=SCOPES)
    cred.refresh(Request())
except Exception as e:
    print(f'::error::金鑰換權杖失敗：{type(e).__name__}: {e}', file=sys.stderr)
    sys.exit(1)
print(cred.token)
