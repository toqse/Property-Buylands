"""
Range-aware media serving.

Django's built-in `static()` helper (`django.views.static.serve`) and `FileResponse`
do NOT honor the HTTP `Range` header — they always return the whole file with `200 OK`.

iOS `AVPlayer` (used by Flutter's `video_player`) REQUIRES a spec-compliant
`206 Partial Content` byte-range response and refuses to play otherwise
(CoreMediaErrorDomain error -12939 "byte range length mismatch").

This view adds `Range` support at the Django layer, so it behaves identically under
the dev server (`runserver`) and under a production WSGI/ASGI server (gunicorn/uWSGI),
regardless of whether a reverse proxy is in front. If a production reverse proxy
(nginx/Apache) serves `/media/` directly, that path already supports ranges and this
view is simply bypassed — either way, byte ranges work in both environments.
"""

import mimetypes
import os
import re

from django.core.exceptions import SuspiciousFileOperation
from django.http import (
    FileResponse,
    Http404,
    HttpResponse,
    HttpResponseNotModified,
)
from django.utils._os import safe_join
from django.utils.http import http_date
from django.views.static import was_modified_since

# Matches a single byte range: "bytes=START-" or "bytes=START-END".
# Multipart ranges are intentionally not supported (AVPlayer/browsers send single ranges).
_RANGE_RE = re.compile(r"^\s*bytes\s*=\s*(\d+)\s*-\s*(\d*)\s*$", re.IGNORECASE)

_STREAM_BLOCK_SIZE = 8192


class _RangedFileReader:
    """Iterator yielding at most `length` bytes from `file_obj`, starting at `start`."""

    def __init__(self, file_obj, start, length, block_size=_STREAM_BLOCK_SIZE):
        self._file = file_obj
        self._start = start
        self._remaining = length
        self._block_size = block_size

    def __iter__(self):
        try:
            self._file.seek(self._start)
            while self._remaining > 0:
                chunk = self._file.read(min(self._block_size, self._remaining))
                if not chunk:
                    break
                self._remaining -= len(chunk)
                yield chunk
        finally:
            self._file.close()


def serve_media(request, path, document_root):
    """
    Serve a file from `document_root`, honoring the HTTP `Range` header.

    - No `Range` header           -> 200 OK (full file via FileResponse)
    - Valid single `Range` header -> 206 Partial Content
    - Unsatisfiable range         -> 416 Range Not Satisfiable
    - Not modified                -> 304 Not Modified
    """
    try:
        fullpath = safe_join(document_root, path)
    except (SuspiciousFileOperation, ValueError):
        raise Http404("Invalid path.")

    if not os.path.isfile(fullpath):
        raise Http404("File does not exist.")

    statobj = os.stat(fullpath)

    # Honor conditional requests (If-Modified-Since) to avoid resending unchanged files.
    if not was_modified_since(
        request.META.get("HTTP_IF_MODIFIED_SINCE"),
        statobj.st_mtime,
    ):
        return HttpResponseNotModified()

    content_type, encoding = mimetypes.guess_type(fullpath)
    content_type = content_type or "application/octet-stream"
    size = statobj.st_size

    range_match = _RANGE_RE.match(request.META.get("HTTP_RANGE", ""))

    if range_match:
        start = int(range_match.group(1))
        end_group = range_match.group(2)
        end = int(end_group) if end_group else size - 1
        end = min(end, size - 1)

        if start > end or start >= size:
            response = HttpResponse(status=416)
            response["Content-Range"] = f"bytes */{size}"
            response["Accept-Ranges"] = "bytes"
            return response

        length = end - start + 1
        file_obj = open(fullpath, "rb")
        response = HttpResponse(
            _RangedFileReader(file_obj, start, length),
            status=206,
            content_type=content_type,
        )
        response["Content-Length"] = str(length)
        response["Content-Range"] = f"bytes {start}-{end}/{size}"
    else:
        response = FileResponse(open(fullpath, "rb"), content_type=content_type)
        response["Content-Length"] = str(size)

    response["Accept-Ranges"] = "bytes"
    response["Last-Modified"] = http_date(statobj.st_mtime)
    if encoding:
        response["Content-Encoding"] = encoding
    return response
