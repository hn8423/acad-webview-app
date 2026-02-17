export interface Holding {
	id: number;
	member_name: string;
	pass_name: string;
	holding_start: string;
	holding_end: string;
	holding_days: number;
	reason: string;
	status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface CreateHoldingRequest {
	holding_start: string;
	holding_end: string;
	reason?: string;
}

export interface UpdateHoldingRequest {
	status: 'APPROVED' | 'REJECTED';
}
