import pymongo
import json

# MongoDB connection setup
MONGO_URI = "mongodb://admin:REDACTED@localhost:27017/"  # Update with your MongoDB URI
DATABASE_NAME = "hexalayer"      # Replace with your database name
COLLECTION_NAME = "cve"                   # Replace with your collection name

# Load data from a JSON file
def load_json(file_path):
    with open(file_path, "r") as file:
        return json.load(file)

# Insert CVE items into MongoDB
def insert_into_mongodb(data, mongo_uri, db_name, collection_name):
    client = pymongo.MongoClient(mongo_uri)
    db = client[db_name]
    collection = db[collection_name]
    
    # Loop through the CVE_Items and insert them into the collection
    for item in data.get("CVE_Items", []):
        collection.insert_one(item)
        print(f"Inserted: {item.get('cve', {}).get('CVE_data_meta', {}).get('ID', 'Unknown ID')}")

# Main execution
if __name__ == "__main__":
    json_file_path = "CVE/cve_data.json"  # Replace with the path to your JSON file
    cve_data = load_json(json_file_path)
    insert_into_mongodb(cve_data, MONGO_URI, DATABASE_NAME, COLLECTION_NAME)
    print("All CVE items have been inserted into MongoDB.")
