import geni.portal as portal
import geni.rspec.pg as rspec
import textwrap

# Create a request object to define the profile.
request = portal.context.makeRequestRSpec()

# Define the primary node.
node = request.RawPC("node")
node.hardware_type = "m400"

# Define a shell script command that clones the repository and runs bootstrap.sh.
command = textwrap.dedent("""\
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
    """)

# Add the startup service to run the command.
node.addService(rspec.Execute(shell="bash", command=command))

# Output the RSpec.
portal.context.printRequestRSpec()
