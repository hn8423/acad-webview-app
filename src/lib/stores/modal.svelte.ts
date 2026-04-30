let openCount = $state(0);

function getModalStore() {
	return {
		get isAnyOpen() {
			return openCount > 0;
		},
		get openCount() {
			return openCount;
		},
		open() {
			openCount += 1;
		},
		close() {
			openCount = Math.max(0, openCount - 1);
		}
	};
}

export const modalStore = getModalStore();
