import bcrypt


class BcryptPasswordHasher:
    def hash(self, password: str) -> bytes:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    def verify(self, password: str, hash: bytes | None) -> bool:
        if not hash:
            return False
        return bcrypt.checkpw(password.encode(), hash)
