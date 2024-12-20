import json
import logging
from fastapi import APIRouter, Form, HTTPException, Query
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime
from zoneinfo import ZoneInfo
import asyncio
import httpx
from bson import ObjectId
from db.report_repository import ReportRepository
from db.message_repository import MessageRepository
from db.conversation_repository import ConversationRepository
from socketio import AsyncServer
from models.report import ReportModel
from models.base import PaginatedResponseModel


report_repository = ReportRepository()
message_repository = MessageRepository()
conversation_repository = ConversationRepository()

sio = AsyncServer()
router = APIRouter()
logger = logging.getLogger(__name__)

BASE_API_URL = "http://134.209.237.212:8090/JSON"
API_KEY = "hexashield"


async def make_zap_request(url: str) -> dict:
    """
    Utility function to handle ZAP API requests.
    """
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
    except httpx.RequestError as e:
        logger.error(f"HTTP Request Error for {url}: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to communicate with the ZAP API."
        )
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP Status Error for {url}: {e}")
        raise HTTPException(
            status_code=e.response.status_code, detail="ZAP API returned an error."
        )


@router.post("/scan_initiate", response_model=Dict[str, str], status_code=200)
async def scan_initiate(
    url: str = Form(...), conversation_id: str = Form(...)
) -> Dict[str, str]:
    """
    Endpoint to start a scan on a given URL and create a message entry.
    """
    try:
        # Validate the URL
        if not url or not url.startswith("http"):
            raise HTTPException(status_code=400, detail="Invalid or missing URL.")

        # Validate the conversation ID
        conversation = conversation_repository.get_conversation_by_id(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=404, detail="Conversation ID not found in the database."
            )

        # Step 1: Register the URL with the spider
        register_url = f"{BASE_API_URL}/spider/action/scan/?url={url}&recurse=true&apikey={API_KEY}"
        register_response = await make_zap_request(register_url)
        scan_id = register_response.get("scan")
        if not scan_id:
            raise HTTPException(
                status_code=400, detail="Failed to obtain scan ID during registration."
            )

        # Step 2: Wait for the spider to complete
        status_url = (
            f"{BASE_API_URL}/spider/view/status/?scanId={scan_id}&apikey={API_KEY}"
        )
        while True:
            await asyncio.sleep(5)
            status_data = await make_zap_request(status_url)
            if status_data.get("status") == "100":
                break

        # Step 3: Start the active scan
        scan_url = f"{BASE_API_URL}/ascan/action/scan/?url={url}&recurse=true&scanPolicyName=Default Policy&apikey={API_KEY}"
        scan_response = await make_zap_request(scan_url)
        generated_scan_id = scan_response.get("scan")
        if not generated_scan_id:
            raise HTTPException(status_code=400, detail="Failed to retrieve scan ID.")

        # Step 4: Save scan details in the database using the repository
        message_data = {
            "conversation_id": ObjectId(conversation_id),
            "sender": "ai",
            "content": "Scan started successfully.",
            "type": "webhex",
            "details": {"scanId": generated_scan_id, "url": url, "report": {}},
            "created_at": datetime.now(ZoneInfo("UTC")),
            "updated_at": datetime.now(ZoneInfo("UTC")),
        }
        message_id = message_repository.create_message(message_data)

        # Emit the new message to the WebSocket room
        await sio.emit(
            "new_message",
            message_data,
            to=str(conversation_id),
        )
        
        return {
            "message": "Website registered successfully and the scan has started.",
            "scan_id": generated_scan_id,
            "url": url,
            "message_id": message_id,
        }

    except HTTPException as e:
        logger.error("HTTP exception during scan initiation", exc_info=True)
        raise e
    except Exception as e:
        logger.error("Unexpected error during scan initiation", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")


@router.get("/scan_progress/{scan_id}", response_model=Dict[str, str], status_code=200)
async def scan_progress(scan_id: str) -> Dict[str, str]:
    """
    Endpoint to fetch the progress status of an ongoing scan.
    """
    progress_url = (
        f"{BASE_API_URL}/ascan/view/status/?scanId={scan_id}&apikey={API_KEY}"
    )
    progress_data = await make_zap_request(progress_url)
    progress_percentage = progress_data.get("status")
    if progress_percentage is None:
        raise HTTPException(status_code=400, detail="Progress data not found.")
    return {"progress": progress_percentage}


@router.post("/scan_results", response_model=Dict[str, str], status_code=200)
async def scan_results(
    scan_id: str = Form(...), url: str = Form(...), message_id: str = Form(...)
) -> Dict[str, str]:
    """
    Endpoint to fetch the results of a completed scan.
    Updates the associated message record with the scan results and saves the report in the reports repository.
    """
    alerts_url = f"{BASE_API_URL}/core/view/alerts/?apikey={API_KEY}&baseurl={url}"

    try:
        # Validate the message ID
        message = message_repository.get_message_by_id(message_id)
        if not message:
            raise HTTPException(
                status_code=404, detail="Message ID not found in the database."
            )

        # Fetch scan results (alerts)
        results = json.dumps(await make_zap_request(alerts_url))

        # Update the message record with the scan results
        update_count = message_repository.update_message(
            message_id, {"report": {"scan_id": scan_id, "url": url, "details": results}}
        )

        if update_count == 0:
            raise HTTPException(
                status_code=404, detail="Message not found to update with report."
            )

        logger.debug(f"Results type: {type(results)}, Results content: {results}")
        # Prepare and insert the report using the repository
        report_data = {
            "type": "webhex",
            "url": url,
            "user_id": "676327ef659f05603dd71caf",
            "details": {"scan_id": scan_id, "alerts": results},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        report_id = report_repository.create_report(report_data)

        return {"scan": scan_id, "report_id":report_id, "results": results}

    except Exception as e:
        logger.error("Error fetching scan results", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/reports", response_model=List[Dict[str, Any]], status_code=200)
async def get_all_reports() -> List[Dict[str, Any]]:
    """
    Endpoint to fetch all reports.
    Retrieves all the reports stored in the reports repository.
    """
    try:
        # Fetch all reports from the repository
        reports = report_repository.get_all_reports()

        if not reports:
            raise HTTPException(status_code=404, detail="No reports found.")

        return reports

    except Exception as e:
        logger.error("Error fetching reports", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/report/{report_id}", response_model=ReportModel, status_code=200)
async def get_report_by_id(report_id: str) -> ReportModel:
    """
    Endpoint to fetch all reports.
    Retrieves all the reports stored in the reports repository.
    """
    try:
        # Fetch all reports from the repository
        report = report_repository.get_report_by_id(report_id)

        if not report:
            raise HTTPException(status_code=404, detail="No reports found.")

        return report

    except Exception as e:
        logger.error("Error fetching reports", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get(
    "/reports/query",
    response_model=PaginatedResponseModel[ReportModel],
    summary="Query messages with pagination and sorting",
    description="Fetch a paginated list of reports, optionally filtered by user_id and sorted by a specified field.",
)
async def query_reports(
    user_id: Optional[str] = Query(
        None, description="Filter by user_id"
    ),
    page: int = Query(1, ge=1, description="Page number (default is 1)"),
    page_size: int = Query(
        10,
        ge=1,
        le=100,
        description="Number of items per page (default is 10, max is 100)",
    ),
    sort_by: str = Query(
        "created_at", description="Field to sort by (default is 'created_at')"
    ),
    sort_order: str = Query(
        "asc",
        regex="^(asc|desc)$",
        description="Sort order: 'asc' for ascending, 'desc' for descending (default is 'asc')",
    ),
):
    """
    Query messages with pagination and sorting.

    - **conversation_id**: Filter messages by the associated conversation ID.
    - **page**: The page number to retrieve.
    - **page_size**: The number of items per page.
    - **sort_by**: Field to sort by (default is 'created_at').
    - **sort_order**: Sorting direction: 'asc' (ascending) or 'desc' (descending).

    Returns:
    - A paginated and sorted list of messages matching the criteria.
    """
    filter_criteria = {}
    if user_id:
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid report ID")
        filter_criteria["user_id"] = user_id

    skip = (page - 1) * page_size
    sort_criteria = [(sort_by, 1 if sort_order == "asc" else -1)]

    try:
        report = report_repository.list_reports_with_pagination(
            filter_criteria, skip=skip, limit=page_size, sort=sort_criteria
        )
        total_items = report_repository.collection.count_documents(filter_criteria)
        total_pages = (total_items + page_size - 1) // page_size

        return {
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "data": report,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
