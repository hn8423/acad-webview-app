interface BackHeaderConfig {
	title: string;
	onback?: () => void;
}

let backHeader = $state<BackHeaderConfig | null>(null);
let owner = $state<symbol | null>(null);

function getHeaderStore() {
	return {
		get backHeader() {
			return backHeader;
		},
		showBackHeader(config: BackHeaderConfig): symbol {
			const token = Symbol();
			owner = token;
			backHeader = config;
			return token;
		},
		hideBackHeader(token: symbol) {
			if (owner === token) {
				backHeader = null;
				owner = null;
			}
		}
	};
}

export const headerStore = getHeaderStore();
