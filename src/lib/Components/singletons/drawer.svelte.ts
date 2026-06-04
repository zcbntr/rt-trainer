class DrawerState {
	open = $state(false);

	toggle(): void {
		this.open = !this.open;
	}

	openDrawer(): void {
		this.open = true;
	}

	close(): void {
		this.open = false;
	}
}

export const drawer = new DrawerState();
