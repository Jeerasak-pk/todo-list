#!/usr/bin/env python3
"""เซิร์ฟเวอร์ไฟล์สถิตสำหรับใช้ในเครื่อง ผูกกับ 127.0.0.1 เท่านั้น (เครื่องอื่นในเครือข่ายเข้าไม่ได้)"""
import http.server, os, functools
os.chdir(os.path.dirname(os.path.abspath(__file__)))
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=".")
H.extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".webmanifest": "application/manifest+json", ".js": "text/javascript"}
with http.server.ThreadingHTTPServer(("127.0.0.1", 8080), H) as s:
    print("เปิด http://localhost:8080  (กด Ctrl+C เพื่อหยุด)")
    s.serve_forever()
