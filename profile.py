import geni.portal as portal
import geni.rspec.pg as rspec

# Create a request object to define the profile
request = portal.context.makeRequestRSpec()

# Define the primary node for Kubernetes and Docker
k8s_node = request.RawPC("k8s-master")
k8s_node.hardware_type = "m400"


# Install the latest versions of Docker, Minikube, and kubectl
k8s_node.addService(rspec.Execute(
    shell="bash",
    command="""
    # Update package list
    sudo apt update &&
    sudo apt install -y apt-transport-https ca-certificates curl software-properties-common &&
    
    # Install Docker (Ubuntu package)
    sudo apt install -y docker.io &&

    # Add user to Docker group to avoid permission errors
    sudo usermod -aG docker $(whoami) &&
    echo 'newgrp docker' >> ~/.bashrc  # Apply group change after login

    # Install latest kubectl (Fix: Use sudo and correct path)
    sudo curl -Lo /usr/local/bin/kubectl "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/arm64/kubectl" &&

    # Install latest Minikube (Fix: Use sudo and correct path)
    sudo curl -Lo /usr/local/bin/minikube "https://github.com/kubernetes/minikube/releases/latest/download/minikube-linux-arm64" &&

    # Start Minikube (Fix: Use correct permissions)
    sudo minikube start --driver=docker

    # Verify installation
    docker --version &&
    kubectl version --client &&
    minikube version

    # Add status message on SSH login
    echo 'echo "==== MyApp Status ===="; kubectl get nodes; kubectl get pods -A' >> ~/.bashrc

    # Create a "myapp" status command
    echo '#!/bin/bash' | sudo tee /usr/local/bin/myapp > /dev/null
    echo 'echo "==== MyApp Status ===="' | sudo tee -a /usr/local/bin/myapp > /dev/null
    echo 'kubectl get nodes' | sudo tee -a /usr/local/bin/myapp > /dev/null
    echo 'kubectl get pods -A' | sudo tee -a /usr/local/bin/myapp > /dev/null
    echo 'kubectl get services' | sudo tee -a /usr/local/bin/myapp > /dev/null
    echo 'NODE_PORT=$(kubectl get svc myapp-nginx -o=jsonpath="{.spec.ports[0].nodePort}")' | sudo tee -a /usr/local/bin/myapp > /dev/null
    echo 'NODE_IP=$(kubectl get nodes -o=jsonpath="{.items[0].status.addresses[0].address}")' | sudo tee -a /usr/local/bin/myapp > /dev/null
    echo 'echo "MyApp is accessible at: http://$NODE_IP:$NODE_PORT"' | sudo tee -a /usr/local/bin/myapp > /dev/null

    sudo chmod +x /usr/local/bin/myapp
    """
))

# Output the RSpec
portal.context.printRequestRSpec()
