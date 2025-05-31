#!/bin/bash

# Start the FastAPI application using Poetry
exec poetry run uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 