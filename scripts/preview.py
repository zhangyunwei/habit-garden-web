"""Serve this checkout without caching, so visual iterations stay consistent."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from functools import partial

class PreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()

if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    print(f'Garden preview: http://127.0.0.1:4186/ ({root})', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 4186), partial(PreviewHandler, directory=str(root))).serve_forever()
