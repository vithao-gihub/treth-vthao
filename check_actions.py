import ctypes
import json
import urllib.request
import sys
from ctypes import wintypes

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

class CREDENTIAL(ctypes.Structure):
    _fields_ = [
        ('Flags', wintypes.DWORD),
        ('Type', wintypes.DWORD),
        ('TargetName', wintypes.LPWSTR),
        ('Comment', wintypes.LPWSTR),
        ('LastWritten', wintypes.FILETIME),
        ('CredentialBlobSize', wintypes.DWORD),
        ('CredentialBlob', ctypes.POINTER(ctypes.c_char)),
        ('Persist', wintypes.DWORD),
        ('AttributeCount', wintypes.DWORD),
        ('Attributes', ctypes.c_void_p),
        ('TargetAlias', wintypes.LPWSTR),
        ('UserName', wintypes.LPWSTR),
    ]

def check():
    pcred = ctypes.POINTER(CREDENTIAL)()
    res = ctypes.windll.advapi32.CredReadW('GitHub - https://api.github.com/vithao-gihub', 1, 0, ctypes.byref(pcred))
    if not res:
        print("Cannot read credentials")
        return
    token = ctypes.string_at(pcred.contents.CredentialBlob, pcred.contents.CredentialBlobSize).decode('utf-8', errors='ignore')
    ctypes.windll.advapi32.CredFree(pcred)

    url = 'https://api.github.com/repos/vithao-gihub/treth-vthao/actions/runs'
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}', 'User-Agent': 'TreTH-Deploy'})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        runs = data.get('workflow_runs', [])
        print(f"Tổng số workflow runs: {len(runs)}")
        for r in runs[:1]:
            run_id = r.get('id')
            print(f"- Run ID: {run_id} | Tên: {r.get('name')} | Trạng thái: {r.get('status')} | Kết quả: {r.get('conclusion')} | URL: {r.get('html_url')}")
            
            # Fetch jobs
            jobs_url = f"https://api.github.com/repos/vithao-gihub/treth-vthao/actions/runs/{run_id}/jobs"
            req_jobs = urllib.request.Request(jobs_url, headers={'Authorization': f'Bearer {token}', 'User-Agent': 'TreTH-Deploy'})
            with urllib.request.urlopen(req_jobs) as r_jobs:
                data_jobs = json.loads(r_jobs.read().decode('utf-8'))
                for job in data_jobs.get('jobs', []):
                    print(f"  * Job: {job.get('name')} => {job.get('status')} ({job.get('conclusion')})")
            # Fetch release
            try:
                rel_url = 'https://api.github.com/repos/vithao-gihub/treth-vthao/releases/latest'
                req_rel = urllib.request.Request(rel_url, headers={'Authorization': f'Bearer {token}', 'User-Agent': 'TreTH-Deploy'})
                with urllib.request.urlopen(req_rel) as r_rel:
                    rel = json.loads(r_rel.read().decode('utf-8'))
                    print(f"\n🎉 RELEASE ĐÃ ĐƯỢC TẠO:")
                    print(f"- Tên: {rel.get('name')}")
                    print(f"- Tag: {rel.get('tag_name')}")
                    print(f"- URL Release: {rel.get('html_url')}")
                    for a in rel.get('assets', []):
                        size_mb = round(a.get('size', 0) / 1024 / 1024, 2)
                        print(f"  + Tải APK: {a.get('name')} ({size_mb} MB) => {a.get('browser_download_url')}")
            except Exception as e:
                print(f"Release check error: {e}")

if __name__ == '__main__':
    check()
