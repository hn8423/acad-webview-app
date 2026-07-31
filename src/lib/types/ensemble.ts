export type EnsembleStatus = 'RECRUITING' | 'FULL' | 'CANCELLED';

export type EnsembleMemberStatus = 'LEADER' | 'MEMBER' | 'PENDING';

export type EnsembleMyStatus = 'PENDING_APPROVAL' | 'JOINED' | null;

export interface EnsembleListItem {
	id: number;
	group_name: string;
	description: string;
	creator_name: string;
	max_members: number;
	current_members: number;
	practice_date: string | null;
	practice_time: string | null;
	status: EnsembleStatus;
	comment_count: number;
	created_at: string;
	my_status: EnsembleMyStatus;
}

export interface MyEnsembleListItem {
	id: number;
	group_name: string;
	creator_name: string;
	max_members: number;
	current_members: number;
	practice_date: string | null;
	practice_time: string | null;
	status: EnsembleStatus;
	my_status: EnsembleMyStatus;
}

export interface EnsembleMember {
	member_id: number;
	user_name: string;
	role: string;
	introduction?: string;
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
	practice_date: string | null;
	practice_time: string | null;
	status: EnsembleStatus;
	my_status: EnsembleMyStatus;
	members: EnsembleMember[];
	created_at: string;
}

export interface EnsembleComment {
	id: number;
	member_id: number;
	user_name: string;
	profile_img: string;
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
	introduction?: string;
}

export interface AcceptMemberRequest {
	role: string;
}

export interface CreateCommentRequest {
	content: string;
}
