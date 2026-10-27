FROM python:3.12-slim

WORKDIR /perf
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY locustfile.py .
COPY oopsly_perf oopsly_perf

# Locust writes its pass/fail summary here; mount a volume to read it back.
ENV PERF_RESULTS_DIR=/results
ENTRYPOINT ["locust", "-f", "/perf/locustfile.py", "--headless", "--only-summary"]
CMD ["-u", "5", "-r", "5", "-t", "30s"]
