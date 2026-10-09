class ApiError(Exception):
    """Base application exception with status code and error message."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

class NotFoundError(ApiError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, 404)

class ConflictError(ApiError):
    def __init__(self, message: str = "Resource conflict"):
        super().__init__(message, 409)

class GitHubApiError(ApiError):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message, status_code)
