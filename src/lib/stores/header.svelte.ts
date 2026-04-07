let mainHeaderHidden = $state(false);

function getHeaderStore() {
	return {
		get hidden() {
			return mainHeaderHidden;
		},
		hide() {
			mainHeaderHidden = true;
		},
		show() {
			mainHeaderHidden = false;
		}
	};
}

export const headerStore = getHeaderStore();
