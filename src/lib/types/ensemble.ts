export type EnsembleStatus = 'RECRUITING' | 'FULL' | 'CANCELLED';

export type EnsembleMemberStatus = 'LEADER' | 'MEMBER' | 'PENDING';

export interface EnsembleListItem {
	id: number;
	group_name: string;
	description: string;
	creator_name: string;
	max_members: number;
	current_members: number;
	status: EnsembleStatus;
	practice_date: string | null;
	practice_time: string | null;
	comment_count: number;
	created_at: string;
}

export interface EnsembleMember {
	member_id: number;
	user_name: string;
	role: string;
	member_status: EnsembleMemberStatus;
}

export interface EnsembleDetail {
	id: number;
	group_name: string;
	description: string;
	creator: {
		member_id: number;
		user_name: string;
	};
	max_members: number;
	current_members: number;
	status: EnsembleStatus;
	practice_date: string | null;
	practice_time: string | null;
	members: EnsembleMember[];
	created_at: string;
}

export interface EnsembleComment {
	id: number;
	member_id: number;
	user_name: string;
	content: string;
	created_at: string;
}

export interface CreateEnsembleRequest {
	group_name: string;
	role: string;
	description?: string;
	max_members?: number;
	practice_date?: string;
	practice_time?: string;
}

export interface ApplyEnsembleRequest {
	role: string;
}

export interface AcceptMemberRequest {
	role: string;
}

export interface CreateCommentRequest {
	content: string;
}
