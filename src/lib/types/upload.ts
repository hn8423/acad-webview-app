export interface UploadedFile {
	file_url: string;
	file_name: string;
	file_size: number;
	file_type: string;
}

export interface UploadResponse {
	uploaded_files: UploadedFile[];
}
