import geni.portal as portal
import geni.rspec.pg as rspec

# Create a request object to define the profile.
request = portal.context.makeRequestRSpec()

# Define the primary node.
node = request.RawPC("node")
node.hardware_type = "m400"

# Add a startup script to clone the repository and run bootstrap.sh.
node.addService(rspec.Execute(shell="bash", command="""
  cd /local
  if [ ! -d repository ]; then
    echo "Cloning repository..."
    git clone https://github.com/TylerGeiger513/CampusConnect repository
  else
    echo "Repository already exists. Pulling latest changes..."
    cd repository && git pull && cd ..
  fi
  cd repository
  chmod +x bootstrap.sh
  ./bootstrap.sh
"""))

portal.context.printRequestRSpec()
