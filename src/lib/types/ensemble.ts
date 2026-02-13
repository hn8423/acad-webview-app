export type EnsembleStatus = 'RECRUITING' | 'CLOSED' | 'COMPLETED';

export type EnsembleMemberStatus = 'LEADER' | 'MEMBER' | 'PENDING';

export interface EnsembleListItem {
	id: number;
	group_name: string;
	description: string;
	leader_name: string;
	max_members: number;
	current_members: number;
	practice_date: string | null;
	practice_time: string | null;
	status: EnsembleStatus;
}

export interface MyEnsembleListItem {
	id: number;
	group_name: string;
	description: string;
	max_members: number;
	current_members: number;
	my_role: string;
	is_leader: boolean;
	status: EnsembleStatus;
}

export interface EnsembleMember {
	member_id: number;
	user_name: string;
	role: string;
	status: string;
	joined_at: string;
}

export interface EnsembleDetail {
	id: number;
	group_name: string;
	description: string;
	leader: {
		member_id: number;
		user_name: string;
		role: string;
	};
	max_members: number;
	practice_date: string | null;
	practice_time: string | null;
	status: EnsembleStatus;
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
}

export interface AcceptMemberRequest {
	role: string;
}

export interface CreateCommentRequest {
	content: string;
}
