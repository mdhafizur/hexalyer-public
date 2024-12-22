export interface Report {
    _id: string; // MongoDB ObjectId as a string
    message_id: string; // MongoDB ObjectId as a string, associated with the message
    type: string; // Type of the report (e.g., "webhex")
    details?: {
        scan_id?: string;
        url?: string;
        alerts?: Record<string, unknown>;
    }; // Additional optional details about the report
    created_at?: string; // ISO string for the creation timestamp
    updated_at?: string; // ISO string for the last updated timestamp
}
