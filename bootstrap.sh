#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

echo "=== Starting bootstrap process ==="

# Update package list and install essential packages
sudo apt update && sudo apt install -y apt-transport-https ca-certificates curl software-properties-common conntrack cri-tools

# Install Docker if not already installed
if ! command -v docker &>/dev/null; then
    echo "Installing Docker..."
    sudo apt install -y docker.io
    sudo usermod -aG docker $USER
else
    echo "Docker already installed: $(docker --version)"
fi

# Install kubectl if not installed
if ! command -v kubectl &>/dev/null; then
    echo "Installing kubectl..."
    sudo curl -Lo /usr/local/bin/kubectl "https://dl.k8s.io/release/v1.32.0/bin/linux/arm64/kubectl"
    sudo chmod +x /usr/local/bin/kubectl
else
    echo "kubectl already installed: $(kubectl version --client)"
fi

# Install Minikube if not installed
if ! command -v minikube &>/dev/null; then
    echo "Installing Minikube..."
    curl -LO https://github.com/kubernetes/minikube/releases/latest/download/minikube-linux-arm64
    sudo install minikube-linux-arm64 /usr/local/bin/minikube
    rm -f minikube-linux-arm64
else
    echo "Minikube already installed: $(minikube version)"
fi

# Ensure necessary directories exist and are owned by the user
mkdir -p $HOME/.kube $HOME/.minikube
sudo chown -R $USER:$USER $HOME/.kube $HOME/.minikube

# Start Minikube using the "none" driver
if ! minikube status | grep -q "host: Running"; then
    echo "Starting Minikube..."
    minikube start --driver=none
else
    echo "Minikube is already running."
fi

# Verify installations
echo "Docker version:"; docker --version
echo "kubectl version:"; kubectl version --client
echo "Minikube status:"; minikube status

# Create a custom "myapp" status command
sudo tee /usr/local/bin/myapp << 'EOF'
#!/bin/bash
echo "==== MyApp Status ===="
kubectl get nodes
kubectl get pods -A
EOF
sudo chmod +x /usr/local/bin/myapp

echo "=== Bootstrap process complete ==="
