import geni.portal as portal
import geni.rspec.pg as rspec

# Create a request object
request = portal.context.makeRequestRSpec()

# Define the primary node for Kubernetes and Docker
k8s_node = request.RawPC("k8s-master")
k8s_node.hardware_type = "m400"
k8s_node.disk_image = "urn:publicid:IDN+apt.emulab.net+authority+cm:UBUNTU22-64-STD"

# Install Docker, Minikube, and kubectl
k8s_node.addService(rspec.Execute(
    shell="bash",
    command="""
    sudo apt update &&
    sudo apt install -y docker.io &&
    sudo curl -Lo /usr/local/bin/kubectl https://dl.k8s.io/release/v1.27.0/bin/linux/amd64/kubectl &&
    sudo chmod +x /usr/local/bin/kubectl &&
    curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 &&
    sudo install minikube /usr/local/bin/ &&
    sudo minikube start --driver=none &&
    kubectl cluster-info
    """
))

# Output the RSpec
portal.context.printRequestRSpec()
