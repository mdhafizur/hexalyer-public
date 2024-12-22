export interface Report {
    _id: string; // MongoDB ObjectId in string format
    conversation_id: string; // MongoDB ObjectId in string format
    message_id: string; // MongoDB ObjectId in string format
    user_id: string; // MongoDB ObjectId in string format
    type: string; // Type of the report, e.g., "webhex"
    details?: { // Optional details object
        scan_id: string; // ID of the scan
        url: string; // URL that was scanned
        report: Record<string, unknown>; // Report details, initially an empty object
    };
    created_at: string; // ISO 8601 formatted timestamp
    updated_at: string; // ISO 8601 formatted timestamp
}
