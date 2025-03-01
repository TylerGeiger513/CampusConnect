import os

# Directories and files to exclude
EXCLUDE_DIRS = {"node_modules", ".git"}
EXCLUDE_FILES = {"package-lock.json"}

def process_file(file_path, output_file):
    """Read the contents of file_path and write them to output_file, prefixed with a header."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        output_file.write(f"--- {file_path} ---\n")
        output_file.write(content)
        output_file.write("\n\n")
    except Exception as e:
        output_file.write(f"--- {file_path} ---\n")
        output_file.write(f"Error reading file: {e}\n\n")

def main():
    root_dir = os.getcwd()  # assumes you're running log.py from the project root
    output_path = os.path.join(root_dir, "output.txt")

    # First, scan for all files that will be processed.
    files_to_process = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Exclude directories we don't want to traverse
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for filename in filenames:
            if filename in EXCLUDE_FILES:
                continue
            file_path = os.path.join(dirpath, filename)
            # Avoid processing the output file itself
            if os.path.abspath(file_path) == os.path.abspath(output_path):
                continue
            files_to_process.append(file_path)

    with open(output_path, 'w', encoding='utf-8') as output_file:
        # Write a header list of all files at the top
        output_file.write("Files being processed:\n")
        for file_path in files_to_process:
            output_file.write(file_path + "\n")
        output_file.write("\n" + "="*80 + "\n\n")

        # Process each file
        for file_path in files_to_process:
            process_file(file_path, output_file)
    
    print(f"All files (except excluded) have been concatenated into {output_path}")

if __name__ == "__main__":
    main()
