FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source (includes cicd_api/sql/)
COPY . .

RUN mkdir -p data && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

# Healthcheck via python urllib (no curl needed in the final image)
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request, sys; r=urllib.request.urlopen('http://localhost:8000/api/health',timeout=4); sys.exit(0 if r.status==200 else 1)"

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "run:app"]
