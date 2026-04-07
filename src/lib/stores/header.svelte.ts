interface BackHeaderConfig {
	title: string;
	onback?: () => void;
}

let backHeader = $state<BackHeaderConfig | null>(null);

function getHeaderStore() {
	return {
		get backHeader() {
			return backHeader;
		},
		showBackHeader(config: BackHeaderConfig) {
			backHeader = config;
		},
		hideBackHeader() {
			backHeader = null;
		}
	};
}

export const headerStore = getHeaderStore();
