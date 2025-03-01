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
    sudo apt update &&
    sudo apt install -y apt-transport-https ca-certificates curl software-properties-common &&
    
    # Install latest Docker
    sudo mkdir -m 0755 -p /etc/apt/keyrings &&
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc &&
    echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null &&
    sudo apt update &&
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin &&

    # Add user to Docker group to avoid permission errors
    sudo usermod -aG docker $(whoami) &&

    # Install latest kubectl
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" &&
    sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl &&

    # Install latest Minikube
    curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 &&
    sudo install minikube-linux-amd64 /usr/local/bin/minikube &&

    # Start Minikube with latest Kubernetes
    sudo minikube start --driver=none &&
    
    # Verify installation
    docker --version &&
    kubectl version --client &&
    minikube version
    """
))

# Output the RSpec
portal.context.printRequestRSpec()
