import http.server, socketserver, os
DIRECTORY = "/opt/payvault/frontend/dist"
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=DIRECTORY, **k)
    def do_GET(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path) or os.path.isdir(path):
            base = self.path.split("?")[0]
            _, ext = os.path.splitext(base)
            if not ext:
                self.path = "/index.html"
        return super().do_GET()
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", 3005), Handler) as httpd:
    httpd.serve_forever()
