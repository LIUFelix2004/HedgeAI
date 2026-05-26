from Crypto.Hash import keccak


class _Keccak256:
    def __init__(self, data=b""):
        self._buffer = bytearray()
        if data:
            self.update(data)

    def update(self, data):
        if data:
            self._buffer.extend(data)
        return self

    def digest(self):
        h = keccak.new(digest_bits=256)
        h.update(bytes(self._buffer))
        return h.digest()

    def hexdigest(self):
        h = keccak.new(digest_bits=256)
        h.update(bytes(self._buffer))
        return h.hexdigest()

    def copy(self):
        cloned = _Keccak256()
        cloned._buffer = self._buffer.copy()
        return cloned


def keccak_256(data=b""):
    return _Keccak256(data)
