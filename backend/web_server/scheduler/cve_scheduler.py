# web_server/scheduler/cve_scheduler.py

import os
import logging
import asyncio
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from motor.motor_asyncio import AsyncIOMotorClient
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from sentence_transformers import SentenceTransformer
from typing import AsyncGenerator, List, Dict
from fastapi import FastAPI

logger = logging.getLogger(__name__)

# Configuration
MONGO_URL = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "hexalayer")
COLLECTION_NAME = "cves"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# Initialize MongoDB
mongodb_client = AsyncIOMotorClient(MONGO_URL)
mongodb_collection = mongodb_client[DB_NAME][COLLECTION_NAME]

# NVD API Configuration
NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
RESULTS_PER_PAGE = 2000  # Max allowed by NVD API

# Initialize components
session = requests.Session()
retry = Retry(
    total=3,
    backoff_factor=0.3,
    status_forcelist=[429, 500, 502, 503, 504],
)
session.mount("https://", HTTPAdapter(max_retries=retry))

# Initialize embedding model
embedding_model = SentenceTransformer(EMBEDDING_MODEL)


async def run_in_executor(func, *args):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, func, *args)


@asynccontextmanager
async def cve_scheduler_lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Async context manager for CVE scheduler lifespan management"""
    # Create vector search index if not exists
    await create_vector_index(mongodb_collection)

    # Initial full sync
    await full_sync(mongodb_collection)

    # Initialize scheduler
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        fetch_and_store_cves,
        "interval",
        seconds=300000000,
        args=[mongodb_collection],
    )
    scheduler.start()

    logger.info("CVE Scheduler initialized")
    yield
    scheduler.shutdown()
    mongodb_client.close()
    logger.info("CVE Scheduler shutdown completed")


async def create_vector_index(collection):
    """Create a standard text index if vector search is not supported"""
    index_name = "cve_text_index"
    indexes = await collection.list_indexes().to_list(None)

    if not any(index["name"] == index_name for index in indexes):
        await collection.create_index(
            [("description", "text")], name=index_name  # Standard text index
        )
        logger.info("Created text search index")


async def full_sync(collection):
    """Perform full synchronization of CVEs"""
    logger.info("Starting full synchronization")

    # Get all CVEs from NVD
    cves = await fetch_latest_cves(collection)

    logger.info(f"Completed full sync of {len(cves)} CVEs")


async def fetch_and_store_cves(collection):
    """Job function to fetch and store CVEs in MongoDB"""
    try:
        logger.info("Starting CVE update job")

        # Get existing CVE IDs
        existing_ids = await collection.distinct("_id")

        # Fetch latest CVEs and insert each response into the database
        new_cves = await fetch_latest_cves(collection)

        # Process new/updated CVEs (if needed)
        to_process = [cve for cve in new_cves if cve["cve"]["id"] not in existing_ids]

        if to_process:
            logger.info(f"Processed {len(to_process)} new/updated CVEs")

        logger.info("CVE update job completed")

    except Exception as e:
        logger.error(f"Error in CVE update job: {str(e)}", exc_info=True)
        raise


async def fetch_latest_cves(collection) -> List[Dict]:
    """Fetch latest CVEs from NVD API with pagination and insert each response into the database"""
    try:
        all_cves = []
        start_index = 0

        while True:
            params = {"startIndex": start_index, "resultsPerPage": RESULTS_PER_PAGE}
            response = session.get(NVD_API_URL, params=params, timeout=30)
            response.raise_for_status()

            data = response.json()
            vulnerabilities = data.get("vulnerabilities", [])
            all_cves.extend(vulnerabilities)

            # Process and insert the current page of CVEs into the database
            await process_cve_batch(collection, vulnerabilities)

            # Break if all CVEs have been fetched
            if start_index + RESULTS_PER_PAGE >= data["totalResults"]:
                break

            # Increment start index for the next page
            start_index += RESULTS_PER_PAGE

        return all_cves
    except Exception as e:
        logger.error(f"Failed to fetch CVEs: {str(e)}")
        return []


async def process_cve_batch(collection, cves: List[Dict]):
    """Process a batch of CVEs and store in MongoDB with embeddings (one by one)"""
    try:
        for cve in cves:
            cve_id = cve["cve"]["id"]
            description = cve["cve"]["descriptions"][0]["value"]

            # Generate embedding
            embedding = await run_in_executor(embedding_model.encode, description)

            # Prepare document
            document = {
                "_id": cve_id,
                "description": description,
                "embedding": embedding.tolist(),
                "published": cve["cve"]["published"],
                "lastModified": cve["cve"]["lastModified"],
                "metrics": cve["cve"].get("metrics", {}),
                "raw_data": cve,
            }

            # Insert or update the document in MongoDB
            await collection.update_one(
                {"_id": cve_id},
                {"$set": document},
                upsert=True,
            )
            logger.info(f"Processed CVE: {cve_id}")

    except Exception as e:
        logger.error(f"Error processing CVE {cve_id}: {str(e)}")
        raise


async def vector_search(collection, query: str, limit: int = 5):
    """Perform vector similarity search using MongoDB"""
    # Generate embedding for query
    query_embedding = await run_in_executor(embedding_model.encode, query)

    # MongoDB vector search pipeline
    pipeline = [
        {
            "$vectorSearch": {
                "index": "cve_vector_index",
                "path": "embedding",
                "queryVector": query_embedding.tolist(),
                "numCandidates": 100,
                "limit": limit,
            }
        },
        {
            "$project": {
                "_id": 1,
                "description": 1,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]

    return await collection.aggregate(pipeline).to_list(limit)


# async def fetch_relevant_cve_context(query: str, limit: int = 5) -> str:
#     """
#     Fetch the top `limit` most relevant CVEs based on the query.

#     :param query: The search query string.
#     :param limit: The maximum number of results to fetch.
#     :return: A string containing formatted CVE context.
#     """
#     try:
#         # Log the query being processed
#         logger.info(
#             f"Performing vector search for query: '{query}' with limit: {limit}"
#         )

#         # Perform vector search to find relevant CVEs
#         results = await vector_search(mongodb_collection, query, limit=limit)

#         if not results:
#             logger.warning(f"No relevant CVEs found for query: '{query}'")
#             return "No relevant CVEs found for the given query."

#         # Format the results into a human-readable context string
#         context = "\n".join(
#             [
#                 f"- CVE ID: {res['_id']}, Description: {res['description']}"
#                 for res in results
#             ]
#         )

#         logger.info(
#             f"Successfully fetched {len(results)} relevant CVEs for query: '{query}'"
#         )
#         return context
#     except Exception as e:
#         logger.error(
#             f"Error fetching relevant CVE context for query '{query}': {str(e)}",
#             exc_info=True,
#         )
#         return "Failed to fetch CVE context due to an internal error."


async def fetch_relevant_cve_context(query: str, limit: int = 5) -> str:
    """
    Fetch the top `limit` most relevant CVEs based on the query using text-based search.

    :param query: The search query string.
    :param limit: The maximum number of results to fetch.
    :return: A string containing formatted CVE context.
    """
    try:
        # Log the query being processed
        logger.info(f"Performing text search for query: '{query}' with limit: {limit}")

        # Perform text search to find relevant CVEs and sort by published date first, then by score
        results = (
            await mongodb_collection.find(
                {"$text": {"$search": query}},  # Use MongoDB text search
                {
                    "score": {"$meta": "textScore"},
                    "description": 1,
                    "_id": 1,
                    "published": 1,  # Include the publication date
                    "raw_data": 1,  # Include the raw_data field
                },
            )
            .sort(
                [
                    ("published", -1),  # Sort by the latest published date first
                    (
                        "score",
                        {"$meta": "textScore"},
                    ),  # Then sort by text relevance score
                ]
            )
            .limit(limit)
            .to_list(length=limit)
        )

        if not results:
            logger.warning(f"No relevant CVEs found for query: '{query}'")
            return "No relevant CVEs found for the given query."

        # Format the results into a human-readable context string
        context = "\n".join(
            [
                f"- CVE ID: {res['_id']}\n"
                f"  Description: {res.get('description', 'No description available.')}\n"
                f"  Published Date: {res.get('published', 'Unknown')}\n"
                f"  Raw Data: {res.get('raw_data', 'No raw data available.')}"
                for res in results
            ]
        )

        logger.info(
            f"Successfully fetched {len(results)} relevant CVEs for query: '{query}'"
        )
        return context

    except Exception as e:
        logger.error(
            f"Error fetching relevant CVE context for query '{query}': {str(e)}",
            exc_info=True,
        )
        return "Failed to fetch CVE context due to an internal error."
