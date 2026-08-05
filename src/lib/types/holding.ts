// 홀딩(수강권 일시정지).
// 신청은 승인 절차 없이 즉시 적용된다 — 만료일이 홀딩 일수만큼 연장되고,
// 홀딩 기간의 기존 예약은 자동 취소되며 그 기간에는 새 예약을 걸 수 없다.
export type HoldingStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Holding {
	id: number;
	member_name: string;
	pass_name: string;
	holding_start: string;
	holding_end: string;
	holding_days: number;
	reason: string;
	status: HoldingStatus;
}

export interface CreateHoldingRequest {
	// YYYY-MM-DD. 종료일은 홀딩에 포함된다 (2/15~2/28 = 14일)
	holding_start: string;
	holding_end: string;
	reason?: string;
}

export interface CreateHoldingResponse {
	holding_id: number;
	holding_start: string;
	holding_end: string;
	holding_days: number;
	// 연장된 수강권 만료일
	end_date: string;
	remaining_hold_days: number;
	cancelled_reservation_count: number;
}
