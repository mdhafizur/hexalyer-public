# Step 1: Backup the currently installed packages
pip freeze > requirements.txt

# Step 2: Uninstall all currently installed packages
pip uninstall -y -r requirements.txt

# Step 3: Install packages from requirements.txt
pip install --no-cache-dir -r requirements.txt