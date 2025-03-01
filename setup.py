import os
import sys
import json
import logging
import subprocess
from setuptools import setup, find_packages, Command

# Configure logging to include timestamps and log levels
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

def run_command(command, error_message, exit_on_fail=True, cwd=None):
    try:
        logging.info("Running: " + " ".join(command) + (f" in {cwd}" if cwd else ""))
        subprocess.check_call(command, cwd=cwd)
    except subprocess.CalledProcessError as e:
        logging.error(f"{error_message}\nCommand: {' '.join(command)}\nError: {e}")
        if exit_on_fail:
            log_error_pods("app=myapp-backend")
            sys.exit(1)


def log_error_pods(label: str):
    """Retrieve pods by label and log their logs if they are in an error state."""
    try:
        pods_output = subprocess.check_output(
            ["kubectl", "get", "pods", "-l", label, "-o", "json"], text=True
        )
        pods = json.loads(pods_output)
        for pod in pods.get("items", []):
            pod_name = pod["metadata"]["name"]
            # Check if pod is not ready
            conditions = pod["status"].get("conditions", [])
            ready = any(c.get("type") == "Ready" and c.get("status") == "True" for c in conditions)
            if not ready:
                logging.error(f"Pod {pod_name} is not ready. Retrieving logs:")
                try:
                    logs = subprocess.check_output(["kubectl", "logs", pod_name], text=True)
                    logging.error(f"Logs for {pod_name}:\n{logs}")
                except subprocess.CalledProcessError as log_err:
                    logging.error(f"Failed to get logs for {pod_name}: {log_err}")
    except Exception as ex:
        logging.error("Failed to log error pods: " + str(ex))

def build_docker_images():
    logging.info("Building Docker images...")
    project_root = os.getcwd()
    backend_path = os.path.join(project_root, "backend")
    nginx_path = os.path.join(project_root, "nginx")
    run_command(
        ["docker", "build", "--no-cache", "-t", "myapp-backend:latest", backend_path],
        "Failed to build backend image."
    )
    run_command(
        ["docker", "build", "--no-cache", "-t", "myapp-nginx:latest", nginx_path],
        "Failed to build nginx image."
    )
    logging.info("Docker images built successfully.")

def deploy_kubernetes():
    logging.info("Deploying to Kubernetes...")
    project_root = os.getcwd()
    k8s_dir = os.path.join(project_root, "deploy", "k8s")
    configmap_yaml = os.path.join(k8s_dir, "configmap.yaml")
    try:
        run_command(["kubectl", "apply", "-f", configmap_yaml],
                    "Failed to apply ConfigMap.")
    except SystemExit:
        logging.warning("ConfigMap not applied or already exists; continuing...")
    run_command(["kubectl", "apply", "-f", k8s_dir],
                "Failed to apply Kubernetes manifests.")
    run_command(["kubectl", "rollout", "status", "deployment/myapp-backend"],
                "Backend deployment rollout failed.")
    run_command(["kubectl", "rollout", "status", "deployment/myapp-nginx"],
                "Nginx deployment rollout failed.")
    logging.info("Kubernetes deployment successful.")

def print_service_info():
    logging.info("Retrieving Nginx service information...")
    try:
        output = subprocess.check_output(
            ["kubectl", "get", "service", "myapp-nginx", "-o", "json"], text=True
        )
        svc = json.loads(output)
        node_port = svc["spec"]["ports"][0]["nodePort"]
        node_ip = get_node_ip()
        if node_ip:
            logging.info(f"Nginx is accessible at http://{node_ip}:{node_port}")
        else:
            logging.error("Could not determine Node IP. Please check your Kubernetes cluster configuration.")
    except Exception as e:
        logging.error("Error retrieving service info: " + str(e))

def get_node_ip():
    logging.info("Retrieving node IP...")
    try:
        output = subprocess.check_output(["kubectl", "get", "nodes", "-o", "json"], text=True)
        nodes = json.loads(output)["items"]
        for node in nodes:
            for addr in node.get("status", {}).get("addresses", []):
                if addr["type"] == "ExternalIP":
                    logging.info(f"Found ExternalIP: {addr['address']}")
                    return addr["address"]
        for node in nodes:
            for addr in node.get("status", {}).get("addresses", []):
                if addr["type"] == "InternalIP":
                    logging.info(f"Falling back to InternalIP: {addr['address']}")
                    return addr["address"]
    except Exception as e:
        logging.error("Error retrieving node IP: " + str(e))
    return None

def clear_kubernetes_resources():
    logging.info("Clearing Kubernetes resources...")
    project_root = os.getcwd()
    k8s_dir = os.path.join(project_root, "deploy", "k8s")
    run_command(["kubectl", "delete", "-f", k8s_dir],
                "Failed to delete Kubernetes resources.", exit_on_fail=False)
    logging.info("Kubernetes resources cleared.")

def remove_docker_images():
    logging.info("Removing local Docker images...")
    for image in ["myapp-backend:latest", "myapp-nginx:latest"]:
        run_command(["docker", "rmi", "-f", image],
                    f"Failed to remove Docker image {image}.", exit_on_fail=False)
    logging.info("Local Docker images removed.")

class DeployCommand(Command):
    description = "Build Docker images, deploy Kubernetes resources, and print service information."
    user_options = []

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def run(self):
        build_docker_images()
        deploy_kubernetes()
        print_service_info()

class ResetCommand(Command):
    description = "Clear Kubernetes resources and local Docker images, then rebuild and redeploy everything."
    user_options = []

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def run(self):
        clear_kubernetes_resources()
        remove_docker_images()
        build_docker_images()
        deploy_kubernetes()
        print_service_info()

class TestCommand(Command):
    description = "Run tests and ensure they pass before starting deployment."
    user_options = []

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def run(self):
        logging.info("Running tests...")
        project_root = os.getcwd()
        backend_path = os.path.join(project_root, "backend")
        run_command(["npm.cmd", "run", "test:e2e"],
                    "Tests failed. Aborting deployment.",
                    cwd=backend_path)
        logging.info("All tests passed.")

class PauseCommand(Command):
    description = "Pause the deployments by scaling replicas to 0."
    user_options = []

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def run(self):
        logging.info("Pausing deployments...")
        run_command(["kubectl", "scale", "deployment/myapp-backend", "--replicas=0"],
                    "Failed to pause backend deployment.")
        run_command(["kubectl", "scale", "deployment/myapp-nginx", "--replicas=0"],
                    "Failed to pause nginx deployment.")
        logging.info("Deployments paused.")

class ResumeCommand(Command):
    description = "Resume the deployments by scaling replicas back to 1."
    user_options = []

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def run(self):
        logging.info("Resuming deployments...")
        run_command(["kubectl", "scale", "deployment/myapp-backend", "--replicas=1"],
                    "Failed to resume backend deployment.")
        run_command(["kubectl", "scale", "deployment/myapp-nginx", "--replicas=1"],
                    "Failed to resume nginx deployment.")
        logging.info("Deployments resumed.")

class ShutdownCommand(Command):
    description = "Shutdown the application by clearing all Kubernetes resources and local Docker images."
    user_options = []

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def run(self):
        logging.info("Shutting down application...")
        clear_kubernetes_resources()
        remove_docker_images()
        logging.info("Application shutdown complete.")

def main():
    build_docker_images()
    deploy_kubernetes()
    print_service_info()

setup(
    name="campusconnect1-deployment",
    version="0.1.0",
    packages=find_packages(),
    cmdclass={
        'deploy': DeployCommand,
        'reset': ResetCommand,
        'testdeploy': TestCommand,
        'pause': PauseCommand,
        'resume': ResumeCommand,
        'shutdown': ShutdownCommand,
    },
    entry_points={
        'console_scripts': [
            'campusconnect-deploy=setup:main',
        ],
    },
)
