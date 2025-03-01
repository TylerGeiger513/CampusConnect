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

def build_backend_docker_image():
    logging.info("Building backend Docker image...")
    project_root = os.getcwd()
    backend_path = os.path.join(project_root, "backend")
    run_command(
        ["docker", "build", "--no-cache", "-t", "myapp-backend:latest", backend_path],
        "Failed to build backend image."
    )

def build_nginx_docker_image():
    logging.info("Building nginx Docker image...")
    # Use the project root as build context so the Dockerfile can access both the nginx and frontend folders.
    run_command(
        ["docker", "build", "--no-cache", "-t", "myapp-nginx:latest", "-f", os.path.join("nginx", "Dockerfile"), "."],
        "Failed to build nginx image."
    )

def build_docker_images():
    logging.info("Building all Docker images...")
    build_backend_docker_image()
    build_nginx_docker_image()
    logging.info("All Docker images built successfully.")

def run_backend_tests():
    logging.info("Running backend tests (npm run test:e2e)...")
    project_root = os.getcwd()
    backend_path = os.path.join(project_root, "backend")
    run_command(["npm.cmd", "run", "test:e2e"], "Backend tests failed.", cwd=backend_path)
    logging.info("Backend tests passed.")

def run_inter_container_tests():
    logging.info("Running inter-container connectivity test...")
    project_root = os.getcwd()
    k8s_dir = os.path.join(project_root, "deploy", "k8s")
    # Apply the test job manifest
    run_command(["kubectl", "apply", "-f", os.path.join(k8s_dir, "test.yaml")],
                "Failed to apply test job manifest.")
    # Wait for the test job to complete (timeout after 60 seconds)
    run_command(["kubectl", "wait", "--for=condition=complete", "job/inter-container-test", "--timeout=60s"],
                "Inter-container test job did not complete successfully.")
    # Fetch and log the output of the test job
    output = subprocess.check_output(["kubectl", "logs", "job/inter-container-test"], text=True)
    logging.info("Inter-container test job output:\n" + output)
    # Clean up the test job
    run_command(["kubectl", "delete", "job", "inter-container-test"],
                "Failed to delete test job.")

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
    logging.info("Retrieving service information...")
    try:
        output_nginx = subprocess.check_output(
            ["kubectl", "get", "service", "myapp-nginx", "-o", "json"], text=True
        )
        svc_nginx = json.loads(output_nginx)
        node_port_nginx = svc_nginx["spec"]["ports"][0]["nodePort"]
        node_ip = get_node_ip()
        if node_ip:
            logging.info(f"Nginx is accessible at http://{node_ip}:{node_port_nginx}")
        else:
            logging.error("Could not determine Node IP.")
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

def deploy_and_test():
    # Build images and deploy to Kubernetes first
    build_docker_images()
    deploy_kubernetes()
    # Now run tests against the deployed backend
    run_backend_tests()
    run_inter_container_tests()
    print_service_info()
    logging.info("Deployment with tests succeeded.")

class DeployTestCommand(Command):
    description = ("Deploy Kubernetes resources, then run tests against the deployed services; "
                   "if tests pass, print service info.")
    user_options = []
    def initialize_options(self):
        pass
    def finalize_options(self):
        pass
    def run(self):
        deploy_and_test()

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
    description = "Delete all Kubernetes resources."
    user_options = []
    def initialize_options(self):
        pass
    def finalize_options(self):
        pass
    def run(self):
        logging.info("Deleting all Kubernetes resources...")
        project_root = os.getcwd()
        k8s_dir = os.path.join(project_root, "deploy", "k8s")
        run_command(["kubectl", "delete", "-f", k8s_dir],
                    "Failed to delete Kubernetes resources.", exit_on_fail=False)
        logging.info("All Kubernetes resources deleted.")

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
        'deploytest': DeployTestCommand,
    },
    entry_points={
        'console_scripts': [
            'campusconnect-deploy=setup:main',
        ],
    },
)
