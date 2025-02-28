#!/usr/bin/env python3
"""
setup.py - CloudLab Deployment Setup Script for CampusConnect

This script automatically loads production environment variables from backend/.env.prod,
starts the Docker containers using Docker Compose, and then runs the bash script to update
IP addresses in the environment files.
It is designed for CI/CD on Linux (or CloudLab) but can also be used locally.

Usage:
    python3 setup.py [--build]

Options:
    --build     Rebuild Docker images before starting.
    
Notes:
    1. Ensure that backend/.env.prod and frontend/.env.prod have placeholder values:
         - For MONGO_URI: use mongodb://<cloudlab-mongo-ip>:27017/campusconnect_prod
         - For REDIS_HOST: use <cloudlab-redis-ip>
         - For REACT_APP_API_URL in frontend/.env.prod: use http://<cloudlab-nginx-ip>/api
    2. This script calls the bash script set_ips.sh after containers are up.
    3. In CI/CD, you can supply required environment variables as secrets.
    4. For Windows testing, use Git Bash or WSL for proper bash script execution.
"""

import os
import sys
import subprocess
import argparse

try:
    from dotenv import load_dotenv
    env_path = os.path.join("backend", ".env.prod")
    if os.path.exists(env_path):
        load_dotenv(dotenv_path=env_path)
        print(f"Loaded environment variables from {env_path}")
except ImportError:
    print("python-dotenv not installed. Install it via 'pip install python-dotenv' for automatic env loading.")

def check_env():
    required_vars = [
        'NODE_ENV', 'PORT', 'MONGO_URI', 'REDIS_HOST', 'REDIS_PORT', 'SESSION_SECRET'
    ]
    missing = [var for var in required_vars if not os.environ.get(var)]
    if missing:
        print(f"Error: Missing required environment variables: {', '.join(missing)}")
        sys.exit(1)

def run_command(command):
    print(f"Running command: {command}")
    result = subprocess.run(command, shell=True)
    if result.returncode != 0:
        print(f"Command failed: {command}")
        sys.exit(result.returncode)

def main():
    parser = argparse.ArgumentParser(description="CloudLab Deployment Setup")
    parser.add_argument('--build', action='store_true', help='Rebuild Docker images')
    args = parser.parse_args()

    # Validate required environment variables.
    check_env()

    # Use the production compose file.
    compose_file = 'docker-compose.production.yml' if os.path.exists('docker-compose.production.yml') else 'docker-compose.yml'
    build_flag = '--build' if args.build else ''
    compose_command = f"docker-compose -f {compose_file} up {build_flag} -d"
    run_command(compose_command)

    # After starting containers, call the bash script to update IPs.
    bash_script = "./set_ips.sh"
    if os.name == 'nt':
        print("Please run this script in a UNIX-like shell (e.g., Git Bash or WSL) for bash script support.")
        sys.exit(1)
    run_command(bash_script)

    # Optionally, follow container logs.
    print("Deployment complete. To follow logs, run:")
    print(f"  docker-compose -f {compose_file} logs -f")

if __name__ == "__main__":
    main()
