import logging
import httpx
from bson import ObjectId
from fastapi import HTTPException

from c2_server.events.utils import current_utc_time
from db.message_repository import MessageRepository
from db.report_repository import ReportRepository

logger = logging.getLogger(__name__)


class ZAPService:
    def __init__(self, base_api_url: str, api_key: str):
        self.base_api_url = base_api_url
        self.api_key = api_key

    async def make_request(self, endpoint: str, params: dict) -> dict:
        """
        Make a request to the ZAP API.
        """
        url = f"{self.base_api_url}/{endpoint}"
        params["apikey"] = self.api_key

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(url, params=params)
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


class ScanService:
    def __init__(
        self,
        zap_service: ZAPService,
        message_repository: MessageRepository,
        report_repository: ReportRepository,
    ):
        self.zap_service = zap_service
        self.message_repository = message_repository
        self.report_repository = report_repository

    async def initiate_scan(self, url: str, conversation_id: str) -> dict:
        """
        Initiates a ZAP scan and updates the database.

        Args:
            url (str): The target URL to scan.
            conversation_id (str): The conversation ID associated with the scan.

        Returns:
            dict: Details of the initiated scan, including the scan ID and associated message data.
        """
        try:
            # Step 1: Initiate spider scan
            spider_response = await self.zap_service.make_request(
                "spider/action/scan/", {"url": url, "recurse": True}
            )
            scan_id = spider_response.get("scan")
            if not scan_id:
                raise HTTPException(
                    status_code=400,
                    detail="Failed to obtain scan ID during spider registration.",
                )

            # Step 2: Monitor spider scan progress
            while True:
                spider_status = await self.zap_service.make_request(
                    "spider/view/status/", {"scanId": scan_id}
                )
                if spider_status.get("status") == "100":
                    break

            # Step 3: Initiate active scan
            active_scan_response = await self.zap_service.make_request(
                "ascan/action/scan/",
                {"url": url, "recurse": True, "scanPolicyName": "Default Policy"},
            )
            active_scan_id = active_scan_response.get("scan")
            if not active_scan_id:
                raise HTTPException(
                    status_code=400, detail="Failed to retrieve active scan ID."
                )

            msg_id = ObjectId()
            report_id = ObjectId()
            # Step 4: Save scan initiation details as a message
            ai_message_data = {
                "_id": msg_id,
                "conversation_id": ObjectId(conversation_id),
                "sender": "ai",
                "content": f"Scan started successfully for {url}",
                "type": "webhex",
                "details": {
                    "scan_id": active_scan_id,
                    "url": url,
                    "report_id": str(report_id),
                },
                "created_at": current_utc_time().isoformat(),
                "updated_at": current_utc_time().isoformat(),
            }
            self.message_repository.create_message(ai_message_data)

            report_data = {
                "_id": report_id,
                "conversation_id": ObjectId(conversation_id),
                "message_id": ai_message_data["_id"],
                "user_id": ObjectId("676327ef659f05603dd71caf"),
                "type": "webhex",
                "details": {"scan_id": active_scan_id, "url": url, "report": {}},
                "created_at": current_utc_time().isoformat(),
                "updated_at": current_utc_time().isoformat(),
            }
            self.report_repository.create_report(report_data)

            return ai_message_data

        except HTTPException as http_exc:
            raise http_exc
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"An error occurred during scan initiation: {str(e)}",
            )

    async def fetch_scan_progress(self, report_id: str):
        try:
            # Log the start of the process
            logger.info(f"Fetching scan progress for report_id: {report_id}")

            # Fetch the report by its ID
            report = self.report_repository.get_report_by_id(report_id)
            if not report:
                raise HTTPException(status_code=404, detail="Report not found.")

            scan_id = report["details"].get("scan_id")
            url = report["details"].get("url")

            if not scan_id or not url:
                raise HTTPException(
                    status_code=400, detail="Scan ID or URL not found in the report."
                )

            # Log the scan_id and url
            logger.info(f"Scan ID: {scan_id}, URL: {url}")

            # Fetch scan progress data
            progress_data = await self.zap_service.make_request(
                "ascan/view/status/", {"scanId": scan_id}
            )
            logger.info(f"Received progress data: {progress_data}")

            progress_percentage = progress_data.get("status")
            if progress_percentage is None:
                raise HTTPException(status_code=400, detail="Progress data not found.")

            scan_progress_response = await self.zap_service.make_request(
                "ascan/view/scanProgress/", {"scanId": scan_id}
            )
            scan_progress_data = scan_progress_response.get("scanProgress", [])
            logger.info(f"Scan progress data: {scan_progress_data}")

            # If progress is 100%, check alerts
            if progress_percentage == "100":
                alerts = report["details"].get("alerts", [])
                if not alerts:  # If alerts are empty or not present
                    logger.info("No alerts found in the report. Fetching from ZAP.")

                    alerts_data = await self.zap_service.make_request(
                        "core/view/alerts/", {"baseurl": url}
                    )
                    logger.info(f"Received alerts data: {alerts_data}")

                    report["details"]["alerts"] = alerts_data.get("alerts", [])

                    if "_id" in report:
                        del report["_id"]

                    self.report_repository.update_report(
                        report_id=report_id, update_data=report
                    )
                    logger.info(f"Report updated with alerts.")

            # Return raw JSON object
            return {
                "progress": int(progress_percentage),
                "scan_progress": scan_progress_data[1],
            }

        except HTTPException as http_exc:
            logger.error(f"HTTP exception occurred: {str(http_exc)}")
            raise http_exc
        except Exception as e:
            logger.error(f"An error occurred: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"An error occurred while fetching scan progress: {str(e)}",
            )
